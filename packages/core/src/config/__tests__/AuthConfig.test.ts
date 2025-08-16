import { describe, it, expect } from 'vitest';
import { 
  AuthConfigSchema, 
  JWTConfigSchema, 
  OAuthConfigSchema, 
  AuthStrategySchema,
  defaultAuthConfig 
} from '../AuthConfig';
import { z } from 'zod';

describe('AuthConfig', () => {
  describe('AuthStrategySchema', () => {
    it('should accept valid auth strategies', () => {
      const validStrategies = ['jwt', 'oauth', 'api_key', 'basic'];
      
      validStrategies.forEach(strategy => {
        expect(() => {
          AuthStrategySchema.parse(strategy);
        }).not.toThrow();
      });
    });

    it('should reject invalid auth strategies', () => {
      const invalidStrategies = ['invalid', 'custom', '', 'JWT', 'OAuth'];
      
      invalidStrategies.forEach(strategy => {
        expect(() => {
          AuthStrategySchema.parse(strategy);
        }).toThrow();
      });
    });
  });

  describe('JWTConfigSchema', () => {
    it('should validate complete JWT configuration', () => {
      const validConfig = {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refreshToken: 'refresh_token_here',
        secret: 'jwt-secret-key',
        refreshSecret: 'refresh-secret-key',
        expiresIn: '2h',
        refreshExpiresIn: '14d',
        algorithm: 'HS512' as const,
        issuer: 'symbiont-api',
        audience: 'symbiont-client'
      };

      const result = JWTConfigSchema.parse(validConfig);
      expect(result).toEqual(validConfig);
    });

    it('should apply default values', () => {
      const result = JWTConfigSchema.parse({});
      
      expect(result).toEqual({
        expiresIn: '1h',
        refreshExpiresIn: '7d',
        algorithm: 'HS256'
      });
    });

    it('should validate JWT algorithms', () => {
      const validAlgorithms = ['HS256', 'HS384', 'HS512', 'RS256', 'RS384', 'RS512'];
      
      validAlgorithms.forEach(algorithm => {
        expect(() => {
          JWTConfigSchema.parse({ algorithm });
        }).not.toThrow();
      });
    });

    it('should reject invalid JWT algorithms', () => {
      const invalidAlgorithms = ['HS128', 'RS128', 'ES256', 'none', ''];
      
      invalidAlgorithms.forEach(algorithm => {
        expect(() => {
          JWTConfigSchema.parse({ algorithm });
        }).toThrow();
      });
    });

    it('should handle optional fields correctly', () => {
      const configs = [
        { accessToken: 'token' },
        { refreshToken: 'refresh' },
        { secret: 'secret' },
        { refreshSecret: 'refresh-secret' },
        { issuer: 'test-issuer' },
        { audience: 'test-audience' }
      ];

      configs.forEach(config => {
        expect(() => {
          JWTConfigSchema.parse(config);
        }).not.toThrow();
      });
    });

    it('should handle expiry time formats', () => {
      const validExpiryFormats = ['1h', '30m', '7d', '24h', '1w'];
      
      validExpiryFormats.forEach(expires => {
        expect(() => {
          JWTConfigSchema.parse({ expiresIn: expires });
        }).not.toThrow();
        
        expect(() => {
          JWTConfigSchema.parse({ refreshExpiresIn: expires });
        }).not.toThrow();
      });
    });
  });

  describe('OAuthConfigSchema', () => {
    it('should validate complete OAuth configuration', () => {
      const validConfig = {
        clientId: 'oauth-client-id',
        clientSecret: 'oauth-client-secret',
        redirectUri: 'https://app.example.com/callback',
        scope: ['read', 'write', 'admin'],
        authorizationUrl: 'https://auth.example.com/authorize',
        tokenUrl: 'https://auth.example.com/token'
      };

      const result = OAuthConfigSchema.parse(validConfig);
      expect(result).toEqual(validConfig);
    });

    it('should apply default values', () => {
      const result = OAuthConfigSchema.parse({});
      
      expect(result).toEqual({
        scope: []
      });
    });

    it('should validate redirect URI as URL', () => {
      const validUris = [
        'https://app.example.com/callback',
        'http://localhost:3000/auth/callback',
        'https://subdomain.example.co.uk/oauth/redirect'
      ];

      validUris.forEach(uri => {
        expect(() => {
          OAuthConfigSchema.parse({ redirectUri: uri });
        }).not.toThrow();
      });
    });

    it('should reject invalid redirect URIs', () => {
      const invalidUris = [
        'not-a-url',
        'relative/path',
        'ftp://invalid-protocol.com',
        ''
      ];

      invalidUris.forEach(uri => {
        expect(() => {
          OAuthConfigSchema.parse({ redirectUri: uri });
        }).toThrow();
      });
    });

    it('should validate authorization and token URLs', () => {
      const validUrls = [
        'https://auth.provider.com/oauth/authorize',
        'https://api.provider.com/oauth/token'
      ];

      validUrls.forEach(url => {
        expect(() => {
          OAuthConfigSchema.parse({ authorizationUrl: url });
        }).not.toThrow();
        
        expect(() => {
          OAuthConfigSchema.parse({ tokenUrl: url });
        }).not.toThrow();
      });
    });

    it('should handle scope arrays', () => {
      const scopeConfigs = [
        { scope: [] },
        { scope: ['read'] },
        { scope: ['read', 'write'] },
        { scope: ['profile', 'email', 'openid'] }
      ];

      scopeConfigs.forEach(config => {
        expect(() => {
          OAuthConfigSchema.parse(config);
        }).not.toThrow();
      });
    });

    it('should handle optional fields correctly', () => {
      const configs = [
        { clientId: 'test-client' },
        { clientSecret: 'test-secret' },
        { redirectUri: 'https://example.com/callback' },
        { authorizationUrl: 'https://auth.example.com/authorize' },
        { tokenUrl: 'https://auth.example.com/token' }
      ];

      configs.forEach(config => {
        expect(() => {
          OAuthConfigSchema.parse(config);
        }).not.toThrow();
      });
    });
  });

  describe('AuthConfigSchema', () => {
    it('should validate complete auth configuration', () => {
      const validConfig = {
        strategy: 'jwt' as const,
        apiKey: 'api-key-123',
        jwt: {
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
          secret: 'jwt-secret',
          expiresIn: '2h',
          algorithm: 'HS256' as const
        },
        oauth: {
          clientId: 'oauth-client-id',
          clientSecret: 'oauth-secret',
          redirectUri: 'https://app.example.com/callback',
          scope: ['read', 'write']
        },
        basicAuth: {
          username: 'admin',
          password: 'password123'
        },
        tokenRefreshThreshold: 0.2,
        autoRefresh: false,
        tokenStorage: 'localStorage' as const,
        maxRetries: 5,
        retryDelayMs: 2000
      };

      const result = AuthConfigSchema.parse(validConfig);
      
      // Account for default values added by schema
      const expectedResult = {
        ...validConfig,
        jwt: {
          ...validConfig.jwt,
          refreshExpiresIn: '7d' // Default value added by schema
        }
      };
      
      expect(result).toEqual(expectedResult);
    });

    it('should apply default values', () => {
      const result = AuthConfigSchema.parse({});
      
      expect(result.strategy).toBe('jwt');
      expect(result.tokenRefreshThreshold).toBe(0.1);
      expect(result.autoRefresh).toBe(true);
      expect(result.tokenStorage).toBe('memory');
      expect(result.maxRetries).toBe(3);
      expect(result.retryDelayMs).toBe(1000);
    });

    it('should validate token refresh threshold range', () => {
      const validThresholds = [0, 0.1, 0.5, 0.9, 1.0];
      
      validThresholds.forEach(threshold => {
        expect(() => {
          AuthConfigSchema.parse({ tokenRefreshThreshold: threshold });
        }).not.toThrow();
      });
    });

    it('should reject invalid token refresh thresholds', () => {
      const invalidThresholds = [-0.1, 1.1, 2.0, -1];
      
      invalidThresholds.forEach(threshold => {
        expect(() => {
          AuthConfigSchema.parse({ tokenRefreshThreshold: threshold });
        }).toThrow();
      });
    });

    it('should validate token storage options', () => {
      const validStorageOptions = ['memory', 'localStorage', 'sessionStorage', 'custom'];
      
      validStorageOptions.forEach(storage => {
        expect(() => {
          AuthConfigSchema.parse({ tokenStorage: storage });
        }).not.toThrow();
      });
    });

    it('should reject invalid token storage options', () => {
      const invalidStorageOptions = ['database', 'redis', 'cookie', ''];
      
      invalidStorageOptions.forEach(storage => {
        expect(() => {
          AuthConfigSchema.parse({ tokenStorage: storage });
        }).toThrow();
      });
    });

    it('should validate retry configuration', () => {
      expect(() => {
        AuthConfigSchema.parse({ maxRetries: 0 });
      }).not.toThrow();
      
      expect(() => {
        AuthConfigSchema.parse({ maxRetries: 10 });
      }).not.toThrow();
      
      expect(() => {
        AuthConfigSchema.parse({ retryDelayMs: 0 });
      }).not.toThrow();
      
      expect(() => {
        AuthConfigSchema.parse({ retryDelayMs: 5000 });
      }).not.toThrow();
    });

    it('should reject negative retry values', () => {
      expect(() => {
        AuthConfigSchema.parse({ maxRetries: -1 });
      }).toThrow();
      
      expect(() => {
        AuthConfigSchema.parse({ retryDelayMs: -500 });
      }).toThrow();
    });

    it('should validate basic auth configuration', () => {
      const validBasicAuth = {
        username: 'testuser',
        password: 'testpass123'
      };

      expect(() => {
        AuthConfigSchema.parse({ basicAuth: validBasicAuth });
      }).not.toThrow();
    });

    it('should require both username and password for basic auth', () => {
      expect(() => {
        AuthConfigSchema.parse({ 
          basicAuth: { username: 'testuser' }
        });
      }).toThrow();
      
      expect(() => {
        AuthConfigSchema.parse({ 
          basicAuth: { password: 'testpass' }
        });
      }).toThrow();
    });

    it('should handle boolean flags correctly', () => {
      expect(AuthConfigSchema.parse({ autoRefresh: true }).autoRefresh).toBe(true);
      expect(AuthConfigSchema.parse({ autoRefresh: false }).autoRefresh).toBe(false);
    });

    it('should handle nested configurations', () => {
      const config = {
        strategy: 'oauth' as const,
        oauth: {
          clientId: 'test-client',
          scope: ['read']
        },
        jwt: {
          secret: 'test-secret'
        }
      };

      const result = AuthConfigSchema.parse(config);
      expect(result.strategy).toBe('oauth');
      expect(result.oauth?.clientId).toBe('test-client');
      expect(result.jwt?.secret).toBe('test-secret');
    });

    it('should handle optional nested configurations', () => {
      const result = AuthConfigSchema.parse({
        strategy: 'api_key',
        apiKey: 'test-key'
      });

      expect(result.strategy).toBe('api_key');
      expect(result.apiKey).toBe('test-key');
      expect(result.jwt).toBeUndefined();
      expect(result.oauth).toBeUndefined();
      expect(result.basicAuth).toBeUndefined();
    });
  });

  describe('defaultAuthConfig', () => {
    it('should provide sensible defaults', () => {
      expect(defaultAuthConfig).toEqual({
        strategy: 'jwt',
        tokenRefreshThreshold: 0.1,
        autoRefresh: true,
        tokenStorage: 'memory',
        maxRetries: 3,
        retryDelayMs: 1000,
        jwt: {
          expiresIn: '1h',
          refreshExpiresIn: '7d',
          algorithm: 'HS256',
        },
        oauth: {
          scope: [],
        },
      });
    });

    it('should be valid according to schema', () => {
      expect(() => {
        AuthConfigSchema.parse(defaultAuthConfig);
      }).not.toThrow();
    });

    it('should use secure defaults', () => {
      expect(defaultAuthConfig.strategy).toBe('jwt'); // Secure token-based auth
      expect(defaultAuthConfig.tokenStorage).toBe('memory'); // Secure storage
      expect(defaultAuthConfig.autoRefresh).toBe(true); // Automatic token refresh
      expect(defaultAuthConfig.tokenRefreshThreshold).toBe(0.1); // Refresh before expiry
    });

    it('should provide reasonable retry configuration', () => {
      expect(defaultAuthConfig.maxRetries).toBeGreaterThan(0);
      expect(defaultAuthConfig.maxRetries).toBeLessThanOrEqual(5); // Not too many retries
      expect(defaultAuthConfig.retryDelayMs).toBeGreaterThan(0);
      expect(defaultAuthConfig.retryDelayMs).toBeLessThanOrEqual(5000); // Reasonable delay
    });

    it('should provide working JWT defaults', () => {
      expect(defaultAuthConfig.jwt?.algorithm).toBe('HS256'); // Standard algorithm
      expect(defaultAuthConfig.jwt?.expiresIn).toMatch(/^\d+[hm]$/); // Valid time format
      expect(defaultAuthConfig.jwt?.refreshExpiresIn).toMatch(/^\d+[dw]$/); // Valid time format
    });

    it('should provide empty OAuth scope by default', () => {
      expect(Array.isArray(defaultAuthConfig.oauth?.scope)).toBe(true);
      expect(defaultAuthConfig.oauth?.scope).toHaveLength(0);
    });
  });

  describe('Type Safety', () => {
    it('should enforce type safety at compile time', () => {
      const config: z.infer<typeof AuthConfigSchema> = {
        strategy: 'jwt',
        tokenRefreshThreshold: 0.1,
        autoRefresh: true,
        tokenStorage: 'memory',
        maxRetries: 3,
        retryDelayMs: 1000
      };

      expect(config.strategy).toBe('jwt');
      expect(config.autoRefresh).toBe(true);
    });

    it('should infer correct types for JWT config', () => {
      const jwtConfig: z.infer<typeof JWTConfigSchema> = {
        expiresIn: '1h',
        refreshExpiresIn: '7d',
        algorithm: 'HS256'
      };

      expect(typeof jwtConfig.expiresIn).toBe('string');
      expect(typeof jwtConfig.algorithm).toBe('string');
    });

    it('should infer correct types for OAuth config', () => {
      const oauthConfig: z.infer<typeof OAuthConfigSchema> = {
        scope: ['read', 'write']
      };

      expect(Array.isArray(oauthConfig.scope)).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle minimum threshold values', () => {
      expect(() => {
        AuthConfigSchema.parse({ tokenRefreshThreshold: 0 });
      }).not.toThrow();
      
      expect(() => {
        AuthConfigSchema.parse({ tokenRefreshThreshold: 1 });
      }).not.toThrow();
    });

    it('should handle zero retry values', () => {
      const config = {
        maxRetries: 0,
        retryDelayMs: 0
      };

      expect(() => {
        AuthConfigSchema.parse(config);
      }).not.toThrow();
    });

    it('should handle complex OAuth scopes', () => {
      const complexScopes = [
        'openid',
        'profile',
        'email',
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://graph.microsoft.com/user.read'
      ];

      expect(() => {
        AuthConfigSchema.parse({ oauth: { scope: complexScopes } });
      }).not.toThrow();
    });

    it('should handle long JWT tokens', () => {
      const longToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' + 'a'.repeat(1000) + '.signature';
      
      expect(() => {
        AuthConfigSchema.parse({ jwt: { accessToken: longToken } });
      }).not.toThrow();
    });

    it('should handle special characters in credentials', () => {
      const specialChars = {
        apiKey: 'key-with-special!@#$%^&*()chars',
        basicAuth: {
          username: 'user@domain.com',
          password: 'P@ssw0rd!@#$%^&*()'
        }
      };

      expect(() => {
        AuthConfigSchema.parse(specialChars);
      }).not.toThrow();
    });
  });
});