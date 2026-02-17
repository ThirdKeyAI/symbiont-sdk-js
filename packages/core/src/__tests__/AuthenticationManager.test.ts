import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AuthenticationManager, MemoryTokenCache } from '../auth';
import { SymbiontConfig } from '@symbi/types';
import { MockSecretManager } from '../../../testing/src/mocks/MockSecretManager';

describe('AuthenticationManager', () => {
  let authManager: AuthenticationManager;
  let mockSecretManager: MockSecretManager;
  let mockConfig: SymbiontConfig;

  beforeEach(() => {
    mockSecretManager = new MockSecretManager();
    mockConfig = {
      apiKey: 'test-api-key',
      jwt: 'test-jwt-token',
      runtimeApiUrl: 'http://localhost:8080',
      toolReviewApiUrl: 'http://localhost:8081',
      validationMode: 'development',
      environment: 'development',
      debug: false
    };
    
    authManager = new AuthenticationManager(mockConfig, mockSecretManager);
  });

  afterEach(() => {
    mockSecretManager.clearSecrets();
  });

  describe('constructor', () => {
    it('should initialize with config values', () => {
      expect(authManager).toBeDefined();
    });

    it('should work without secret manager', () => {
      const authManagerWithoutSecrets = new AuthenticationManager(mockConfig);
      expect(authManagerWithoutSecrets).toBeDefined();
    });
  });

  describe('getAuthHeaders', () => {
    it('should return runtime token for non-tool-review endpoints', async () => {
      const headers = await authManager.getAuthHeaders('/api/agents');
      
      expect(headers).toHaveProperty('Authorization');
      expect(headers.Authorization).toBe('Bearer test-api-key');
    });

    it('should return JWT token for tool review endpoints', async () => {
      const toolReviewEndpoints = [
        '/sessions',
        '/tool-review/submit',
        '/tools/submit'
      ];

      for (const endpoint of toolReviewEndpoints) {
        const headers = await authManager.getAuthHeaders(endpoint);
        
        expect(headers).toHaveProperty('Authorization');
        expect(headers.Authorization).toBe('Bearer test-jwt-token');
      }
    });

    it('should return empty headers when no token is available', async () => {
      const configWithoutTokens = {
        runtimeApiUrl: 'http://localhost:8080',
        toolReviewApiUrl: 'http://localhost:8081'
      };
      
      const authManagerNoTokens = new AuthenticationManager(configWithoutTokens);
      const headers = await authManagerNoTokens.getAuthHeaders('/api/agents');
      
      expect(headers).toEqual({});
    });

    it('should resolve tokens from secret manager when not in config', async () => {
      const configWithoutDirectTokens = {
        runtimeApiUrl: 'http://localhost:8080',
        toolReviewApiUrl: 'http://localhost:8081'
      };
      
      mockSecretManager.setSecret('API_KEY', 'secret-api-key');
      mockSecretManager.setSecret('JWT_TOKEN', 'secret-jwt-token');
      
      const authManagerWithSecrets = new AuthenticationManager(configWithoutDirectTokens, mockSecretManager);
      
      // First call should resolve from secrets
      const runtimeHeaders = await authManagerWithSecrets.getAuthHeaders('/api/agents');
      const toolReviewHeaders = await authManagerWithSecrets.getAuthHeaders('/sessions');
      
      expect(runtimeHeaders.Authorization).toBe('Bearer secret-api-key');
      expect(toolReviewHeaders.Authorization).toBe('Bearer secret-jwt-token');
    });
  });

  describe('refreshTokens', () => {
    it('should complete without error when tokens are valid', async () => {
      await expect(authManager.refreshTokens()).resolves.toBeUndefined();
    });

    it('should resolve tokens from secret manager during refresh', async () => {
      const configWithoutTokens = {
        runtimeApiUrl: 'http://localhost:8080',
        toolReviewApiUrl: 'http://localhost:8081',
        debug: true
      };
      
      mockSecretManager.setSecret('API_KEY', 'refreshed-api-key');
      mockSecretManager.setSecret('JWT_TOKEN', 'refreshed-jwt-token');
      
      const authManagerWithSecrets = new AuthenticationManager(configWithoutTokens, mockSecretManager);
      
      await authManagerWithSecrets.refreshTokens();
      
      // Verify secrets were called
      const secretCalls = mockSecretManager.getSecretCalls();
      expect(secretCalls.some(call => call.key === 'API_KEY')).toBe(true);
      expect(secretCalls.some(call => call.key === 'JWT_TOKEN')).toBe(true);
    });

    it('should handle secret manager errors gracefully', async () => {
      mockSecretManager.setShouldThrow(new Error('Secret resolution failed'));
      
      // Should not throw even if secret resolution fails
      await expect(authManager.refreshTokens()).resolves.toBeUndefined();
    });

    it('should prevent concurrent refresh calls', async () => {
      const refreshPromises = [
        authManager.refreshTokens(),
        authManager.refreshTokens(),
        authManager.refreshTokens()
      ];
      
      await expect(Promise.all(refreshPromises)).resolves.toEqual([
        undefined,
        undefined,
        undefined
      ]);
    });
  });

  describe('token expiration handling', () => {
    it('should handle non-JWT tokens (API keys) as non-expired', async () => {
      // API keys don't have expiration, so they should always be valid
      const headers = await authManager.getAuthHeaders('/api/agents');
      expect(headers.Authorization).toBe('Bearer test-api-key');
    });

    it('should handle expired JWT tokens', async () => {
      // Create an expired JWT token (expires in the past)
      const expiredJwt = createMockJwt({ exp: Math.floor(Date.now() / 1000) - 3600 }); // Expired 1 hour ago
      
      const configWithExpiredJwt = {
        ...mockConfig,
        jwt: expiredJwt
      };
      
      mockSecretManager.setSecret('JWT_TOKEN', 'fresh-jwt-token');
      
      const authManagerWithExpiredJwt = new AuthenticationManager(configWithExpiredJwt, mockSecretManager);
      
      // Should try to refresh the expired token
      const headers = await authManagerWithExpiredJwt.getAuthHeaders('/sessions');
      expect(headers.Authorization).toBe('Bearer fresh-jwt-token');
    });

    it('should handle valid JWT tokens', async () => {
      // Create a valid JWT token (expires in the future)
      const validJwt = createMockJwt({ exp: Math.floor(Date.now() / 1000) + 3600 }); // Expires in 1 hour
      
      const configWithValidJwt = {
        ...mockConfig,
        jwt: validJwt
      };
      
      const authManagerWithValidJwt = new AuthenticationManager(configWithValidJwt, mockSecretManager);
      
      const headers = await authManagerWithValidJwt.getAuthHeaders('/sessions');
      expect(headers.Authorization).toBe(`Bearer ${validJwt}`);
    });

    it('should handle malformed JWT tokens gracefully', async () => {
      const configWithMalformedJwt = {
        ...mockConfig,
        jwt: 'malformed.jwt.token'
      };
      
      const authManagerWithMalformedJwt = new AuthenticationManager(configWithMalformedJwt, mockSecretManager);
      
      // Should not throw error and treat as non-expired
      const headers = await authManagerWithMalformedJwt.getAuthHeaders('/sessions');
      expect(headers.Authorization).toBe('Bearer malformed.jwt.token');
    });
  });

  describe('endpoint classification', () => {
    it('should correctly identify tool review endpoints', async () => {
      const toolReviewEndpoints = [
        '/sessions',
        '/tool-review',
        '/tools/submit',
        '/api/v1/sessions/create',
        '/api/v1/tool-review/status',
        '/api/v1/tools/submit/batch'
      ];

      for (const endpoint of toolReviewEndpoints) {
        const headers = await authManager.getAuthHeaders(endpoint);
        expect(headers.Authorization).toBe('Bearer test-jwt-token');
      }
    });

    it('should correctly identify runtime endpoints', async () => {
      const runtimeEndpoints = [
        '/api/agents',
        '/api/health',
        '/api/v1/agents/list',
        '/runtime/status',
        '/api/v1/runtime/metrics'
      ];

      for (const endpoint of runtimeEndpoints) {
        const headers = await authManager.getAuthHeaders(endpoint);
        expect(headers.Authorization).toBe('Bearer test-api-key');
      }
    });
  });
});

describe('MemoryTokenCache', () => {
  let cache: MemoryTokenCache;

  beforeEach(() => {
    cache = new MemoryTokenCache();
  });

  describe('basic operations', () => {
    it('should store and retrieve token data', async () => {
      const tokenData = {
        value: 'test-token',
        expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
        createdAt: new Date()
      };

      await cache.set('test-key', tokenData);
      const retrieved = await cache.get('test-key');

      expect(retrieved).toEqual(tokenData);
    });

    it('should return null for non-existent keys', async () => {
      const result = await cache.get('non-existent-key');
      expect(result).toBeNull();
    });

    it('should delete tokens', async () => {
      const tokenData = {
        value: 'test-token',
        expiresAt: new Date(Date.now() + 3600000),
        createdAt: new Date()
      };

      await cache.set('test-key', tokenData);
      await cache.delete('test-key');
      
      const result = await cache.get('test-key');
      expect(result).toBeNull();
    });

    it('should clear all tokens', async () => {
      const tokenData1 = {
        value: 'test-token-1',
        expiresAt: new Date(Date.now() + 3600000),
        createdAt: new Date()
      };
      
      const tokenData2 = {
        value: 'test-token-2',
        expiresAt: new Date(Date.now() + 3600000),
        createdAt: new Date()
      };

      await cache.set('key1', tokenData1);
      await cache.set('key2', tokenData2);
      await cache.clear();

      const result1 = await cache.get('key1');
      const result2 = await cache.get('key2');
      
      expect(result1).toBeNull();
      expect(result2).toBeNull();
    });
  });

  describe('expiration handling', () => {
    it('should return null for expired tokens', async () => {
      const expiredTokenData = {
        value: 'expired-token',
        expiresAt: new Date(Date.now() - 1000), // 1 second ago
        createdAt: new Date()
      };

      await cache.set('expired-key', expiredTokenData);
      const result = await cache.get('expired-key');

      expect(result).toBeNull();
    });

    it('should automatically remove expired tokens on access', async () => {
      const expiredTokenData = {
        value: 'expired-token',
        expiresAt: new Date(Date.now() - 1000),
        createdAt: new Date()
      };

      await cache.set('expired-key', expiredTokenData);
      
      // First access should return null and remove the token
      await cache.get('expired-key');
      
      // Subsequent access should also return null (token should be gone)
      const result = await cache.get('expired-key');
      expect(result).toBeNull();
    });

    it('should return valid tokens that have not expired', async () => {
      const validTokenData = {
        value: 'valid-token',
        expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
        createdAt: new Date()
      };

      await cache.set('valid-key', validTokenData);
      const result = await cache.get('valid-key');

      expect(result).toEqual(validTokenData);
    });
  });
});

// Helper function to create mock JWT tokens
function createMockJwt(payload: any): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = btoa(JSON.stringify(header));
  const encodedPayload = btoa(JSON.stringify(payload));
  const signature = 'mock-signature';
  
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}