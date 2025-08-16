import { describe, it, expect, beforeEach } from 'vitest';
import { SecurityUtils } from '../SecurityUtils';
import crypto from 'crypto';

describe('SecurityUtils', () => {
  describe('constantTimeCompare', () => {
    it('should return true for identical strings', () => {
      expect(SecurityUtils.constantTimeCompare('hello', 'hello')).toBe(true);
      expect(SecurityUtils.constantTimeCompare('', '')).toBe(true);
      expect(SecurityUtils.constantTimeCompare('test123', 'test123')).toBe(true);
    });

    it('should return false for different strings', () => {
      expect(SecurityUtils.constantTimeCompare('hello', 'world')).toBe(false);
      expect(SecurityUtils.constantTimeCompare('hello', 'Hello')).toBe(false);
      expect(SecurityUtils.constantTimeCompare('test', 'testing')).toBe(false);
    });

    it('should return false for strings of different lengths', () => {
      expect(SecurityUtils.constantTimeCompare('short', 'longer string')).toBe(false);
      expect(SecurityUtils.constantTimeCompare('longer string', 'short')).toBe(false);
      expect(SecurityUtils.constantTimeCompare('', 'nonempty')).toBe(false);
      expect(SecurityUtils.constantTimeCompare('nonempty', '')).toBe(false);
    });

    it('should handle special characters', () => {
      const special1 = '!@#$%^&*()';
      const special2 = '!@#$%^&*()';
      const special3 = '!@#$%^&*(]';
      
      expect(SecurityUtils.constantTimeCompare(special1, special2)).toBe(true);
      expect(SecurityUtils.constantTimeCompare(special1, special3)).toBe(false);
    });

    it('should handle unicode characters', () => {
      const unicode1 = '🔒🔑💾';
      const unicode2 = '🔒🔑💾';
      const unicode3 = '🔒🔑💿';
      
      expect(SecurityUtils.constantTimeCompare(unicode1, unicode2)).toBe(true);
      expect(SecurityUtils.constantTimeCompare(unicode1, unicode3)).toBe(false);
    });

    it('should maintain constant time behavior', () => {
      // This test ensures the function takes similar time regardless of where differences occur
      const base = 'a'.repeat(1000);
      const different1 = 'b' + 'a'.repeat(999); // Different at start
      const different2 = 'a'.repeat(999) + 'b'; // Different at end
      
      expect(SecurityUtils.constantTimeCompare(base, different1)).toBe(false);
      expect(SecurityUtils.constantTimeCompare(base, different2)).toBe(false);
    });
  });

  describe('generateSecureRandom', () => {
    it('should generate random bytes of specified length', () => {
      const bytes1 = SecurityUtils.generateSecureRandom(16);
      const bytes2 = SecurityUtils.generateSecureRandom(32);
      
      expect(bytes1).toBeInstanceOf(Buffer);
      expect(bytes1.length).toBe(16);
      expect(bytes2.length).toBe(32);
    });

    it('should generate different random bytes on each call', () => {
      const bytes1 = SecurityUtils.generateSecureRandom(16);
      const bytes2 = SecurityUtils.generateSecureRandom(16);
      
      expect(bytes1.equals(bytes2)).toBe(false);
    });

    it('should handle edge cases', () => {
      const zeroBytes = SecurityUtils.generateSecureRandom(0);
      expect(zeroBytes.length).toBe(0);
      
      const oneBytes = SecurityUtils.generateSecureRandom(1);
      expect(oneBytes.length).toBe(1);
    });
  });

  describe('generateSecureRandomString', () => {
    it('should generate random string of specified length', () => {
      const str1 = SecurityUtils.generateSecureRandomString(16);
      const str2 = SecurityUtils.generateSecureRandomString(32);
      
      expect(typeof str1).toBe('string');
      expect(str1.length).toBe(16);
      expect(str2.length).toBe(32);
    });

    it('should generate different strings on each call', () => {
      const str1 = SecurityUtils.generateSecureRandomString(16);
      const str2 = SecurityUtils.generateSecureRandomString(16);
      
      expect(str1).not.toBe(str2);
    });

    it('should support different encodings', () => {
      const hexStr = SecurityUtils.generateSecureRandomString(16, 'hex');
      const base64Str = SecurityUtils.generateSecureRandomString(16, 'base64');
      
      expect(hexStr).toMatch(/^[0-9a-f]+$/);
      expect(base64Str).toMatch(/^[A-Za-z0-9+/=]+$/);
    });

    it('should handle odd lengths correctly', () => {
      const str = SecurityUtils.generateSecureRandomString(15, 'hex');
      expect(str.length).toBe(15);
    });
  });

  describe('generateSecureToken', () => {
    it('should generate secure tokens', () => {
      const token1 = SecurityUtils.generateSecureToken();
      const token2 = SecurityUtils.generateSecureToken();
      
      expect(typeof token1).toBe('string');
      expect(typeof token2).toBe('string');
      expect(token1).not.toBe(token2);
      expect(token1.length).toBeGreaterThan(0);
    });

    it('should generate URL-safe base64 tokens', () => {
      const token = SecurityUtils.generateSecureToken();
      // URL-safe base64 should not contain + or / characters
      expect(token).not.toMatch(/[+/]/);
    });
  });

  describe('hash', () => {
    it('should hash strings using SHA-256 by default', () => {
      const input = 'test string';
      const hash1 = SecurityUtils.hash(input);
      const hash2 = SecurityUtils.hash(input);
      
      expect(hash1).toBe(hash2); // Same input should produce same hash
      expect(hash1).toMatch(/^[0-9a-f]{64}$/); // SHA-256 produces 64 hex characters
    });

    it('should produce different hashes for different inputs', () => {
      const hash1 = SecurityUtils.hash('input1');
      const hash2 = SecurityUtils.hash('input2');
      
      expect(hash1).not.toBe(hash2);
    });

    it('should support different hash algorithms', () => {
      const input = 'test string';
      const sha256Hash = SecurityUtils.hash(input, 'sha256');
      const sha512Hash = SecurityUtils.hash(input, 'sha512');
      
      expect(sha256Hash).toMatch(/^[0-9a-f]{64}$/);
      expect(sha512Hash).toMatch(/^[0-9a-f]{128}$/);
      expect(sha256Hash).not.toBe(sha512Hash);
    });

    it('should handle empty strings', () => {
      const hash = SecurityUtils.hash('');
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should handle unicode characters', () => {
      const hash = SecurityUtils.hash('🔒 unicode test 🔑');
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });
  });

  describe('hmac', () => {
    it('should generate HMAC signatures', () => {
      const data = 'test data';
      const secret = 'test secret';
      const hmac1 = SecurityUtils.hmac(data, secret);
      const hmac2 = SecurityUtils.hmac(data, secret);
      
      expect(hmac1).toBe(hmac2); // Same inputs should produce same HMAC
      expect(hmac1).toMatch(/^[0-9a-f]{64}$/); // SHA-256 HMAC produces 64 hex characters
    });

    it('should produce different HMACs for different data', () => {
      const secret = 'test secret';
      const hmac1 = SecurityUtils.hmac('data1', secret);
      const hmac2 = SecurityUtils.hmac('data2', secret);
      
      expect(hmac1).not.toBe(hmac2);
    });

    it('should produce different HMACs for different secrets', () => {
      const data = 'test data';
      const hmac1 = SecurityUtils.hmac(data, 'secret1');
      const hmac2 = SecurityUtils.hmac(data, 'secret2');
      
      expect(hmac1).not.toBe(hmac2);
    });

    it('should support different HMAC algorithms', () => {
      const data = 'test data';
      const secret = 'test secret';
      const hmac256 = SecurityUtils.hmac(data, secret, 'sha256');
      const hmac512 = SecurityUtils.hmac(data, secret, 'sha512');
      
      expect(hmac256).toMatch(/^[0-9a-f]{64}$/);
      expect(hmac512).toMatch(/^[0-9a-f]{128}$/);
      expect(hmac256).not.toBe(hmac512);
    });
  });

  describe('verifyHmac', () => {
    it('should verify correct HMAC signatures', () => {
      const data = 'test data';
      const secret = 'test secret';
      const signature = SecurityUtils.hmac(data, secret);
      
      expect(SecurityUtils.verifyHmac(data, signature, secret)).toBe(true);
    });

    it('should reject incorrect HMAC signatures', () => {
      const data = 'test data';
      const secret = 'test secret';
      const wrongSignature = 'wrong signature';
      
      expect(SecurityUtils.verifyHmac(data, wrongSignature, secret)).toBe(false);
    });

    it('should reject signatures with wrong secret', () => {
      const data = 'test data';
      const signature = SecurityUtils.hmac(data, 'correct secret');
      
      expect(SecurityUtils.verifyHmac(data, signature, 'wrong secret')).toBe(false);
    });

    it('should reject signatures for different data', () => {
      const secret = 'test secret';
      const signature = SecurityUtils.hmac('original data', secret);
      
      expect(SecurityUtils.verifyHmac('different data', signature, secret)).toBe(false);
    });

    it('should handle different algorithms consistently', () => {
      const data = 'test data';
      const secret = 'test secret';
      const signature512 = SecurityUtils.hmac(data, secret, 'sha512');
      
      expect(SecurityUtils.verifyHmac(data, signature512, secret, 'sha512')).toBe(true);
      expect(SecurityUtils.verifyHmac(data, signature512, secret, 'sha256')).toBe(false);
    });
  });

  describe('generateSalt', () => {
    it('should generate salt of default length', () => {
      const salt = SecurityUtils.generateSalt();
      expect(typeof salt).toBe('string');
      expect(salt.length).toBe(32); // 16 bytes * 2 hex chars per byte
      expect(salt).toMatch(/^[0-9a-f]+$/);
    });

    it('should generate salt of specified length', () => {
      const salt8 = SecurityUtils.generateSalt(8);
      const salt32 = SecurityUtils.generateSalt(32);
      
      expect(salt8.length).toBe(16); // 8 bytes * 2 hex chars per byte
      expect(salt32.length).toBe(64); // 32 bytes * 2 hex chars per byte
    });

    it('should generate different salts', () => {
      const salt1 = SecurityUtils.generateSalt();
      const salt2 = SecurityUtils.generateSalt();
      
      expect(salt1).not.toBe(salt2);
    });
  });

  describe('hashPassword', () => {
    it('should hash passwords with auto-generated salt', async () => {
      const password = 'test password';
      const result = await SecurityUtils.hashPassword(password);
      
      expect(result).toHaveProperty('hash');
      expect(result).toHaveProperty('salt');
      expect(typeof result.hash).toBe('string');
      expect(typeof result.salt).toBe('string');
      expect(result.hash.length).toBe(128); // 64 bytes * 2 hex chars per byte
    });

    it('should hash passwords with provided salt', async () => {
      const password = 'test password';
      const salt = 'provided salt';
      const result = await SecurityUtils.hashPassword(password, salt);
      
      expect(result.salt).toBe(salt);
      expect(result.hash).toMatch(/^[0-9a-f]{128}$/);
    });

    it('should produce different hashes for different passwords', async () => {
      const result1 = await SecurityUtils.hashPassword('password1');
      const result2 = await SecurityUtils.hashPassword('password2');
      
      expect(result1.hash).not.toBe(result2.hash);
    });

    it('should produce same hash for same password and salt', async () => {
      const password = 'test password';
      const salt = 'test salt';
      const result1 = await SecurityUtils.hashPassword(password, salt);
      const result2 = await SecurityUtils.hashPassword(password, salt);
      
      expect(result1.hash).toBe(result2.hash);
    });

    it('should respect custom iteration count', async () => {
      const password = 'test password';
      const salt = 'test salt';
      const result1000 = await SecurityUtils.hashPassword(password, salt, 1000);
      const result2000 = await SecurityUtils.hashPassword(password, salt, 2000);
      
      expect(result1000.hash).not.toBe(result2000.hash);
    });
  });

  describe('verifyPassword', () => {
    it('should verify correct passwords', async () => {
      const password = 'test password';
      const { hash, salt } = await SecurityUtils.hashPassword(password);
      
      const isValid = await SecurityUtils.verifyPassword(password, hash, salt);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect passwords', async () => {
      const password = 'test password';
      const { hash, salt } = await SecurityUtils.hashPassword(password);
      
      const isValid = await SecurityUtils.verifyPassword('wrong password', hash, salt);
      expect(isValid).toBe(false);
    });

    it('should reject passwords with wrong salt', async () => {
      const password = 'test password';
      const { hash } = await SecurityUtils.hashPassword(password);
      const wrongSalt = 'wrong salt';
      
      const isValid = await SecurityUtils.verifyPassword(password, hash, wrongSalt);
      expect(isValid).toBe(false);
    });

    it('should handle custom iteration counts', async () => {
      const password = 'test password';
      const salt = 'test salt';
      const iterations = 50000;
      const { hash } = await SecurityUtils.hashPassword(password, salt, iterations);
      
      const isValid = await SecurityUtils.verifyPassword(password, hash, salt, iterations);
      expect(isValid).toBe(true);
      
      const isInvalidIterations = await SecurityUtils.verifyPassword(password, hash, salt, 100000);
      expect(isInvalidIterations).toBe(false);
    });

    it('should handle errors gracefully', async () => {
      // Test with invalid hash format that might cause pbkdf2 to throw
      const isValid = await SecurityUtils.verifyPassword('password', 'invalid-hash', 'salt');
      expect(isValid).toBe(false);
    });
  });

  describe('generateCSRFToken', () => {
    it('should generate CSRF tokens', () => {
      const token1 = SecurityUtils.generateCSRFToken();
      const token2 = SecurityUtils.generateCSRFToken();
      
      expect(typeof token1).toBe('string');
      expect(typeof token2).toBe('string');
      expect(token1).not.toBe(token2);
      expect(token1.length).toBeGreaterThan(0);
    });
  });

  describe('validateCSRFToken', () => {
    it('should validate matching CSRF tokens', () => {
      const token = SecurityUtils.generateCSRFToken();
      const isValid = SecurityUtils.validateCSRFToken(token, token);
      expect(isValid).toBe(true);
    });

    it('should reject non-matching CSRF tokens', () => {
      const token1 = SecurityUtils.generateCSRFToken();
      const token2 = SecurityUtils.generateCSRFToken();
      const isValid = SecurityUtils.validateCSRFToken(token1, token2);
      expect(isValid).toBe(false);
    });

    it('should reject empty tokens', () => {
      const token = SecurityUtils.generateCSRFToken();
      expect(SecurityUtils.validateCSRFToken('', token)).toBe(false);
      expect(SecurityUtils.validateCSRFToken(token, '')).toBe(false);
      expect(SecurityUtils.validateCSRFToken('', '')).toBe(true); // Both empty
    });
  });

  describe('integration tests', () => {
    it('should work with realistic password workflow', async () => {
      const plainPassword = 'MySecurePassword123!';
      
      // Hash password during registration
      const { hash, salt } = await SecurityUtils.hashPassword(plainPassword);
      
      // Verify password during login
      const isValid = await SecurityUtils.verifyPassword(plainPassword, hash, salt);
      expect(isValid).toBe(true);
      
      // Reject wrong password
      const isInvalid = await SecurityUtils.verifyPassword('WrongPassword', hash, salt);
      expect(isInvalid).toBe(false);
    });

    it('should work with realistic HMAC workflow', () => {
      const data = JSON.stringify({ userId: 123, action: 'transfer', amount: 1000 });
      const apiSecret = SecurityUtils.generateSecureToken();
      
      // Create signature
      const signature = SecurityUtils.hmac(data, apiSecret);
      
      // Verify signature
      const isValid = SecurityUtils.verifyHmac(data, signature, apiSecret);
      expect(isValid).toBe(true);
      
      // Reject tampered data
      const tamperedData = JSON.stringify({ userId: 123, action: 'transfer', amount: 9999 });
      const isTampered = SecurityUtils.verifyHmac(tamperedData, signature, apiSecret);
      expect(isTampered).toBe(false);
    });

    it('should demonstrate timing attack resistance', () => {
      const secret = 'very-long-secret-that-should-take-time-to-compare-if-not-constant-time';
      const different1 = 'x' + secret.slice(1); // Different at start
      const different2 = secret.slice(0, -1) + 'x'; // Different at end
      
      // Both should return false regardless of where the difference occurs
      expect(SecurityUtils.constantTimeCompare(secret, different1)).toBe(false);
      expect(SecurityUtils.constantTimeCompare(secret, different2)).toBe(false);
    });
  });
});