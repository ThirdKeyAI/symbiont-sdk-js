import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JWTHandler } from '../JWTHandler';
import { JWTPayload } from '@symbi/types';

describe('JWTHandler', () => {
  let jwtHandler: JWTHandler;
  const accessSecret = 'test-access-secret';
  const refreshSecret = 'test-refresh-secret';

  beforeEach(() => {
    jwtHandler = new JWTHandler(accessSecret, refreshSecret, {
      accessTokenExpiry: '15m',
      refreshTokenExpiry: '7d',
      issuer: 'test-issuer',
      audience: 'test-audience',
    });
  });

  describe('constructor', () => {
    it('should initialize with default values', () => {
      const defaultHandler = new JWTHandler(accessSecret, refreshSecret);
      expect(defaultHandler).toBeDefined();
    });

    it('should initialize with custom options', () => {
      const customHandler = new JWTHandler(accessSecret, refreshSecret, {
        accessTokenExpiry: '30m',
        refreshTokenExpiry: '14d',
        issuer: 'custom-issuer',
        audience: 'custom-audience',
      });
      expect(customHandler).toBeDefined();
    });
  });

  describe('generateTokens', () => {
    const userPayload = {
      sub: 'user123',
      email: 'test@example.com',
      roles: ['user'],
      permissions: ['read:documents'],
    };

    it('should generate access and refresh tokens', () => {
      const tokens = jwtHandler.generateTokens(userPayload);

      expect(tokens).toHaveProperty('accessToken');
      expect(tokens).toHaveProperty('refreshToken');
      expect(tokens).toHaveProperty('expiresAt');
      expect(tokens).toHaveProperty('tokenType', 'Bearer');
      expect(tokens).toHaveProperty('scope', userPayload.permissions);
      expect(tokens.metadata).toEqual({
        userId: userPayload.sub,
        email: userPayload.email,
        roles: userPayload.roles,
      });
    });

    it('should generate different tokens for each call', async () => {
      const tokens1 = jwtHandler.generateTokens(userPayload);
      // Add sufficient delay to ensure different timestamp (1 second)
      await new Promise(resolve => setTimeout(resolve, 1100));
      const tokens2 = jwtHandler.generateTokens(userPayload);

      expect(tokens1.accessToken).not.toBe(tokens2.accessToken);
      expect(tokens1.refreshToken).not.toBe(tokens2.refreshToken);
    });

    it('should set correct expiration time', () => {
      const beforeGeneration = Date.now();
      const tokens = jwtHandler.generateTokens(userPayload);
      const afterGeneration = Date.now();

      const expectedExpiry = beforeGeneration + (15 * 60 * 1000); // 15 minutes
      const actualExpiry = tokens.expiresAt.getTime();

      // Allow for small timing differences (up to 1 second)
      expect(actualExpiry).toBeGreaterThanOrEqual(expectedExpiry - 1000);
      expect(actualExpiry).toBeLessThanOrEqual(afterGeneration + (15 * 60 * 1000));
    });
  });

  describe('verifyAccessToken', () => {
    const userPayload = {
      sub: 'user123',
      email: 'test@example.com',
      roles: ['user'],
      permissions: ['read:documents'],
    };

    it('should verify valid access token', () => {
      const tokens = jwtHandler.generateTokens(userPayload);
      const result = jwtHandler.verifyAccessToken(tokens.accessToken);

      expect(result.valid).toBe(true);
      expect(result.payload).toMatchObject({
        sub: userPayload.sub,
        email: userPayload.email,
        roles: userPayload.roles,
        permissions: userPayload.permissions,
        iss: 'test-issuer',
        aud: 'test-audience',
      });
      expect(result.remainingTime).toBeGreaterThan(0);
    });

    it('should reject invalid access token', () => {
      const result = jwtHandler.verifyAccessToken('invalid-token');

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.payload).toBeUndefined();
    });

    it('should reject token signed with wrong secret', () => {
      const wrongHandler = new JWTHandler('wrong-secret', refreshSecret);
      const tokens = jwtHandler.generateTokens(userPayload);
      const result = wrongHandler.verifyAccessToken(tokens.accessToken);

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject expired token', async () => {
      // Create handler with very short expiry
      const shortExpiryHandler = new JWTHandler(accessSecret, refreshSecret, {
        accessTokenExpiry: '1s',
      });

      const tokens = shortExpiryHandler.generateTokens(userPayload);
      
      // Wait for token to expire
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      const result = shortExpiryHandler.verifyAccessToken(tokens.accessToken);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('expired');
    });
  });

  describe('verifyRefreshToken', () => {
    const userPayload = {
      sub: 'user123',
      email: 'test@example.com',
      roles: ['user'],
      permissions: ['read:documents'],
    };

    it('should verify valid refresh token', () => {
      const tokens = jwtHandler.generateTokens(userPayload);
      const result = jwtHandler.verifyRefreshToken(tokens.refreshToken);

      expect(result.valid).toBe(true);
      expect(result.payload).toMatchObject({
        sub: userPayload.sub,
        type: 'refresh',
        iss: 'test-issuer',
        aud: 'test-audience',
      });
      expect(result.remainingTime).toBeGreaterThan(0);
    });

    it('should reject invalid refresh token', () => {
      const result = jwtHandler.verifyRefreshToken('invalid-token');

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject access token as refresh token', () => {
      const tokens = jwtHandler.generateTokens(userPayload);
      const result = jwtHandler.verifyRefreshToken(tokens.accessToken);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('invalid signature');
    });
  });

  describe('refreshAccessToken', () => {
    const userPayload = {
      sub: 'user123',
      email: 'test@example.com',
      roles: ['user'],
      permissions: ['read:documents'],
    };

    it('should refresh access token with valid refresh token', async () => {
      const originalTokens = jwtHandler.generateTokens(userPayload);
      // Add sufficient delay to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 1100));
      const newTokens = jwtHandler.refreshAccessToken(originalTokens.refreshToken, userPayload);

      expect(newTokens).not.toBeNull();
      expect(newTokens!.accessToken).not.toBe(originalTokens.accessToken);
      expect(newTokens!.refreshToken).not.toBe(originalTokens.refreshToken);
    });

    it('should return null with invalid refresh token', () => {
      const result = jwtHandler.refreshAccessToken('invalid-token', userPayload);

      expect(result).toBeNull();
    });

    it('should return null with expired refresh token', async () => {
      const shortExpiryHandler = new JWTHandler(accessSecret, refreshSecret, {
        refreshTokenExpiry: '1s',
      });

      const tokens = shortExpiryHandler.generateTokens(userPayload);
      
      // Wait for token to expire
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      const result = shortExpiryHandler.refreshAccessToken(tokens.refreshToken, userPayload);
      expect(result).toBeNull();
    });
  });

  describe('decodeToken', () => {
    const userPayload = {
      sub: 'user123',
      email: 'test@example.com',
      roles: ['user'],
      permissions: ['read:documents'],
    };

    it('should decode valid token without verification', () => {
      const tokens = jwtHandler.generateTokens(userPayload);
      const decoded = jwtHandler.decodeToken(tokens.accessToken);

      expect(decoded).toMatchObject({
        sub: userPayload.sub,
        email: userPayload.email,
        roles: userPayload.roles,
        permissions: userPayload.permissions,
      });
    });

    it('should return null for invalid token', () => {
      const decoded = jwtHandler.decodeToken('invalid-token');
      expect(decoded).toBeNull();
    });
  });

  describe('getTokenExpiration', () => {
    const userPayload = {
      sub: 'user123',
      email: 'test@example.com',
      roles: ['user'],
      permissions: ['read:documents'],
    };

    it('should return expiration date for valid token', () => {
      const tokens = jwtHandler.generateTokens(userPayload);
      const expiration = jwtHandler.getTokenExpiration(tokens.accessToken);

      expect(expiration).toBeInstanceOf(Date);
      expect(expiration!.getTime()).toBeCloseTo(tokens.expiresAt.getTime(), -3);
    });

    it('should return null for invalid token', () => {
      const expiration = jwtHandler.getTokenExpiration('invalid-token');
      expect(expiration).toBeNull();
    });
  });

  describe('isTokenExpired', () => {
    const userPayload = {
      sub: 'user123',
      email: 'test@example.com',
      roles: ['user'],
      permissions: ['read:documents'],
    };

    it('should return false for valid token', () => {
      const tokens = jwtHandler.generateTokens(userPayload);
      const isExpired = jwtHandler.isTokenExpired(tokens.accessToken);

      expect(isExpired).toBe(false);
    });

    it('should return true for expired token', async () => {
      const shortExpiryHandler = new JWTHandler(accessSecret, refreshSecret, {
        accessTokenExpiry: '1s',
      });

      const tokens = shortExpiryHandler.generateTokens(userPayload);
      
      // Wait for token to expire
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      const isExpired = shortExpiryHandler.isTokenExpired(tokens.accessToken);
      expect(isExpired).toBe(true);
    });

    it('should return true for invalid token', () => {
      const isExpired = jwtHandler.isTokenExpired('invalid-token');
      expect(isExpired).toBe(true);
    });
  });

  describe('parseExpiry', () => {
    it('should parse seconds correctly', () => {
      const handler = new JWTHandler(accessSecret, refreshSecret, {
        accessTokenExpiry: '30s',
      });
      expect(handler).toBeDefined();
    });

    it('should parse minutes correctly', () => {
      const handler = new JWTHandler(accessSecret, refreshSecret, {
        accessTokenExpiry: '15m',
      });
      expect(handler).toBeDefined();
    });

    it('should parse hours correctly', () => {
      const handler = new JWTHandler(accessSecret, refreshSecret, {
        accessTokenExpiry: '2h',
      });
      expect(handler).toBeDefined();
    });

    it('should parse days correctly', () => {
      const handler = new JWTHandler(accessSecret, refreshSecret, {
        refreshTokenExpiry: '7d',
      });
      expect(handler).toBeDefined();
    });

    it('should throw error for invalid format', () => {
      expect(() => {
        new JWTHandler(accessSecret, refreshSecret, {
          accessTokenExpiry: 'invalid',
        });
      }).toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle payload with required fields only', () => {
      const minimalPayload = {
        sub: 'user123',
        email: 'test@example.com',
        roles: [],
        permissions: [],
      };

      const tokens = jwtHandler.generateTokens(minimalPayload);
      expect(tokens).toHaveProperty('accessToken');
      expect(tokens).toHaveProperty('refreshToken');
    });

    it('should handle empty strings in secrets', () => {
      expect(() => {
        new JWTHandler('', '');
      }).not.toThrow();
    });

    it('should handle malformed JWT structure', () => {
      const result = jwtHandler.verifyAccessToken('not.a.jwt');
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});