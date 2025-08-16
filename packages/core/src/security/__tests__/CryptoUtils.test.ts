import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CryptoUtils } from '../CryptoUtils';
import crypto from 'crypto';

describe('CryptoUtils - Comprehensive Tests', () => {
  describe('Constant Time Comparisons', () => {
    it('should perform constant-time string comparison', () => {
      expect(CryptoUtils.constantTimeCompare('test', 'test')).toBe(true);
      expect(CryptoUtils.constantTimeCompare('test', 'fail')).toBe(false);
      expect(CryptoUtils.constantTimeCompare('', '')).toBe(true);
      expect(CryptoUtils.constantTimeCompare('short', 'verylongstring')).toBe(false);
    });

    it('should pad strings for consistent timing', () => {
      const start = process.hrtime.bigint();
      CryptoUtils.constantTimeCompare('a', 'b');
      const time1 = process.hrtime.bigint() - start;

      const start2 = process.hrtime.bigint();
      CryptoUtils.constantTimeCompare('a'.repeat(100), 'b'.repeat(100));
      const time2 = process.hrtime.bigint() - start2;

      // Time difference should be within reasonable bounds for constant time
      expect(Number(time2 - time1)).toBeGreaterThan(0);
    });

    it('should perform constant-time buffer comparison', () => {
      const buf1 = Buffer.from('test');
      const buf2 = Buffer.from('test');
      const buf3 = Buffer.from('fail');
      const buf4 = Buffer.from('different length buffer');

      expect(CryptoUtils.constantTimeBufferCompare(buf1, buf2)).toBe(true);
      expect(CryptoUtils.constantTimeBufferCompare(buf1, buf3)).toBe(false);
      expect(CryptoUtils.constantTimeBufferCompare(buf1, buf4)).toBe(false);
    });

    it('should handle buffer comparison with different lengths consistently', () => {
      const shortBuf = Buffer.from('short');
      const longBuf = Buffer.from('this is a much longer buffer');

      expect(CryptoUtils.constantTimeBufferCompare(shortBuf, longBuf)).toBe(false);
      expect(CryptoUtils.constantTimeBufferCompare(longBuf, shortBuf)).toBe(false);
    });
  });

  describe('Random Generation', () => {
    it('should generate secure random bytes', () => {
      const bytes = CryptoUtils.generateSecureRandom(32);
      expect(bytes).toBeInstanceOf(Buffer);
      expect(bytes.length).toBe(32);

      const bytes2 = CryptoUtils.generateSecureRandom(32);
      expect(bytes.equals(bytes2)).toBe(false);
    });

    it('should validate random byte length parameters', () => {
      expect(() => CryptoUtils.generateSecureRandom(0)).toThrow('Invalid random byte length');
      expect(() => CryptoUtils.generateSecureRandom(-1)).toThrow('Invalid random byte length');
      expect(() => CryptoUtils.generateSecureRandom(1024 * 1024 + 1)).toThrow('Invalid random byte length');
    });

    it('should generate secure random strings with different encodings', () => {
      const hexString = CryptoUtils.generateSecureRandomString(32, 'hex');
      expect(hexString).toMatch(/^[0-9a-f]{32}$/i);

      const base64String = CryptoUtils.generateSecureRandomString(32, 'base64');
      expect(base64String.length).toBeLessThanOrEqual(32);

      const base64urlString = CryptoUtils.generateSecureRandomString(32, 'base64url');
      expect(base64urlString.length).toBeLessThanOrEqual(32);
      expect(base64urlString).not.toMatch(/[+/=]/); // No base64 padding chars
    });

    it('should validate random string length parameters', () => {
      expect(() => CryptoUtils.generateSecureRandomString(0)).toThrow('Invalid random string length');
      expect(() => CryptoUtils.generateSecureRandomString(-1)).toThrow('Invalid random string length');
      expect(() => CryptoUtils.generateSecureRandomString(10001)).toThrow('Invalid random string length');
    });

    it('should generate secure tokens', () => {
      const token1 = CryptoUtils.generateSecureToken();
      const token2 = CryptoUtils.generateSecureToken();
      const customToken = CryptoUtils.generateSecureToken(64);

      expect(token1).not.toBe(token2);
      expect(typeof token1).toBe('string');
      expect(token1.length).toBeGreaterThan(0);
      expect(customToken.length).toBeGreaterThan(token1.length);
    });

    it('should generate valid UUIDs', () => {
      const uuid1 = CryptoUtils.generateUUID();
      const uuid2 = CryptoUtils.generateUUID();
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

      expect(uuid1).toMatch(uuidRegex);
      expect(uuid2).toMatch(uuidRegex);
      expect(uuid1).not.toBe(uuid2);
      expect(uuid1.charAt(14)).toBe('4'); // Version 4
      expect(['8', '9', 'a', 'b']).toContain(uuid1.charAt(19).toLowerCase()); // Variant
    });
  });

  describe('Hashing Functions', () => {
    it('should hash data with default algorithm', () => {
      const hash = CryptoUtils.hash('test data');
      expect(typeof hash).toBe('string');
      expect(hash.length).toBe(64); // SHA-256 hex length
      expect(hash).toMatch(/^[0-9a-f]{64}$/i);
    });

    it('should hash data with different algorithms', () => {
      const sha1Hash = CryptoUtils.hash('test', 'sha1');
      const sha256Hash = CryptoUtils.hash('test', 'sha256');
      const sha512Hash = CryptoUtils.hash('test', 'sha512');

      expect(sha1Hash.length).toBe(40);
      expect(sha256Hash.length).toBe(64);
      expect(sha512Hash.length).toBe(128);
    });

    it('should hash buffers', () => {
      const buffer = Buffer.from('test data');
      const hash = CryptoUtils.hash(buffer);
      expect(typeof hash).toBe('string');
      expect(hash.length).toBe(64);
    });

    it('should validate input size for hashing', () => {
      const largeInput = 'x'.repeat(1000001);
      expect(() => CryptoUtils.hash(largeInput)).toThrow('Input too large for hashing');
    });
  });

  describe('HMAC Operations', () => {
    it('should generate HMAC signatures', () => {
      const signature = CryptoUtils.hmac('test data', 'secret');
      expect(typeof signature).toBe('string');
      expect(signature.length).toBe(64); // SHA-256 hex length
    });

    it('should generate HMAC with different algorithms', () => {
      const sha1Sig = CryptoUtils.hmac('test', 'secret', 'sha1');
      const sha256Sig = CryptoUtils.hmac('test', 'secret', 'sha256');

      expect(sha1Sig.length).toBe(40);
      expect(sha256Sig.length).toBe(64);
    });

    it('should verify HMAC signatures correctly', () => {
      const data = 'test data';
      const secret = 'secret key';
      const signature = CryptoUtils.hmac(data, secret);

      expect(CryptoUtils.verifyHmac(data, signature, secret)).toBe(true);
      expect(CryptoUtils.verifyHmac('wrong data', signature, secret)).toBe(false);
      expect(CryptoUtils.verifyHmac(data, 'wrong signature', secret)).toBe(false);
      expect(CryptoUtils.verifyHmac(data, signature, 'wrong secret')).toBe(false);
    });

    it('should handle HMAC verification errors gracefully', () => {
      expect(CryptoUtils.verifyHmac('data', 'invalid', 'secret')).toBe(false);
    });

    it('should validate HMAC input size', () => {
      const largeInput = 'x'.repeat(1000001);
      expect(() => CryptoUtils.hmac(largeInput, 'secret')).toThrow('Data too large for HMAC');
    });
  });

  describe('Password Security', () => {
    it('should hash passwords with secure defaults', async () => {
      const password = 'testPassword123';
      const result = await CryptoUtils.hashPassword(password);

      expect(result.hash).toBeDefined();
      expect(result.salt).toBeDefined();
      expect(result.iterations).toBe(100000);
      expect(typeof result.hash).toBe('string');
      expect(typeof result.salt).toBe('string');
    });

    it('should hash passwords with custom parameters', async () => {
      const password = 'testPassword123';
      const customSalt = 'customsalt';
      const result = await CryptoUtils.hashPassword(password, customSalt, 50000, 32);

      expect(result.salt).toBe(customSalt);
      expect(result.iterations).toBe(50000);
      expect(result.hash.length).toBe(64); // 32 bytes * 2 for hex
    });

    it('should verify passwords correctly', async () => {
      const password = 'testPassword123';
      const { hash, salt, iterations } = await CryptoUtils.hashPassword(password);

      expect(await CryptoUtils.verifyPassword(password, hash, salt, iterations)).toBe(true);
      expect(await CryptoUtils.verifyPassword('wrongPassword', hash, salt, iterations)).toBe(false);
    });

    it('should handle password verification errors', async () => {
      expect(await CryptoUtils.verifyPassword('password', 'invalid', 'salt')).toBe(false);
    });

    it('should validate password length', async () => {
      await expect(CryptoUtils.hashPassword('')).rejects.toThrow('Invalid password length');
      await expect(CryptoUtils.hashPassword('x'.repeat(1001))).rejects.toThrow('Invalid password length');
    });

    it('should generate different salts for same password', async () => {
      const password = 'testPassword123';
      const result1 = await CryptoUtils.hashPassword(password);
      const result2 = await CryptoUtils.hashPassword(password);

      expect(result1.salt).not.toBe(result2.salt);
      expect(result1.hash).not.toBe(result2.hash);
    });
  });

  describe('CSRF Protection', () => {
    it('should generate CSRF tokens', () => {
      const token1 = CryptoUtils.generateCSRFToken();
      const token2 = CryptoUtils.generateCSRFToken();

      expect(token1).not.toBe(token2);
      expect(typeof token1).toBe('string');
      expect(token1.length).toBeGreaterThan(0);
    });

    it('should validate CSRF tokens', () => {
      const token = CryptoUtils.generateCSRFToken();

      expect(CryptoUtils.validateCSRFToken(token, token)).toBe(true);
      expect(CryptoUtils.validateCSRFToken(token, 'different')).toBe(false);
      expect(CryptoUtils.validateCSRFToken('', token)).toBe(false);
      expect(CryptoUtils.validateCSRFToken(token, '')).toBe(false);
    });
  });

  describe('Encryption/Decryption', () => {
    let key: Buffer;

    beforeEach(() => {
      key = CryptoUtils.generateSecureRandom(32); // 256-bit key
    });

    it('should encrypt and decrypt data correctly', () => {
      const plaintext = 'This is secret data';
      const encrypted = CryptoUtils.encrypt(plaintext, key);

      expect(encrypted.encrypted).toBeDefined();
      expect(encrypted.iv).toBeDefined();
      expect(encrypted.tag).toBeDefined();

      const decrypted = CryptoUtils.decrypt(encrypted.encrypted, key, encrypted.iv, encrypted.tag);
      expect(decrypted).toBe(plaintext);
    });

    it('should produce different ciphertext for same plaintext', () => {
      const plaintext = 'test data';
      const encrypted1 = CryptoUtils.encrypt(plaintext, key);
      const encrypted2 = CryptoUtils.encrypt(plaintext, key);

      expect(encrypted1.encrypted).not.toBe(encrypted2.encrypted);
      expect(encrypted1.iv).not.toBe(encrypted2.iv);
    });

    it('should fail decryption with wrong key', () => {
      const plaintext = 'secret data';
      const wrongKey = CryptoUtils.generateSecureRandom(32);
      const encrypted = CryptoUtils.encrypt(plaintext, key);

      expect(() => {
        CryptoUtils.decrypt(encrypted.encrypted, wrongKey, encrypted.iv, encrypted.tag);
      }).toThrow();
    });

    it('should fail decryption with tampered data', () => {
      const plaintext = 'secret data';
      const encrypted = CryptoUtils.encrypt(plaintext, key);
      const tamperedEncrypted = encrypted.encrypted.slice(0, -2) + '00';

      expect(() => {
        CryptoUtils.decrypt(tamperedEncrypted, key, encrypted.iv, encrypted.tag);
      }).toThrow();
    });
  });

  describe('Key Derivation', () => {
    it('should derive keys using PBKDF2', async () => {
      const password = 'password123';
      const salt = 'testsalt';
      const key = await CryptoUtils.deriveKey(password, salt);

      expect(key).toBeInstanceOf(Buffer);
      expect(key.length).toBe(32);
    });

    it('should derive different keys with different parameters', async () => {
      const password = 'password123';
      const salt1 = 'salt1';
      const salt2 = 'salt2';

      const key1 = await CryptoUtils.deriveKey(password, salt1);
      const key2 = await CryptoUtils.deriveKey(password, salt2);

      expect(key1.equals(key2)).toBe(false);
    });

    it('should derive keys with custom parameters', async () => {
      const password = 'password123';
      const salt = 'testsalt';
      const key = await CryptoUtils.deriveKey(password, salt, 50000, 64);

      expect(key.length).toBe(64);
    });
  });

  describe('Security Utilities', () => {
    it('should securely wipe buffers', () => {
      const buffer = Buffer.from('sensitive data');
      const originalData = Buffer.from(buffer);

      CryptoUtils.secureWipe(buffer);

      expect(buffer.equals(originalData)).toBe(false);
      expect(buffer.every(byte => byte === 0)).toBe(true);
    });

    it('should handle null buffer wipe gracefully', () => {
      expect(() => CryptoUtils.secureWipe(null as any)).not.toThrow();
    });

    it('should create rate limiter', () => {
      const limiter = CryptoUtils.createRateLimiter(5, 1); // 5 tokens, 1 per second

      // Should consume tokens successfully
      expect(limiter.consume()).toBe(true);
      expect(limiter.consume()).toBe(true);
      expect(limiter.consume()).toBe(true);
      expect(limiter.consume()).toBe(true);
      expect(limiter.consume()).toBe(true);

      // Should be rate limited now
      expect(limiter.consume()).toBe(false);

      // Reset should restore tokens
      limiter.reset();
      expect(limiter.consume()).toBe(true);
    });

    it('should refill rate limiter tokens over time', async () => {
      const limiter = CryptoUtils.createRateLimiter(1, 10); // 1 token, 10 per second

      expect(limiter.consume()).toBe(true);
      expect(limiter.consume()).toBe(false);

      // Wait for refill
      await new Promise(resolve => setTimeout(resolve, 150));
      expect(limiter.consume()).toBe(true);
    });
  });

  describe('Salt Generation', () => {
    it('should generate salt with default length', () => {
      const salt = CryptoUtils.generateSalt();
      expect(typeof salt).toBe('string');
      expect(salt.length).toBe(32); // 16 bytes * 2 for hex
      expect(salt).toMatch(/^[0-9a-f]{32}$/i);
    });

    it('should generate salt with custom length', () => {
      const salt = CryptoUtils.generateSalt(8);
      expect(salt.length).toBe(16); // 8 bytes * 2 for hex
    });

    it('should generate different salts', () => {
      const salt1 = CryptoUtils.generateSalt();
      const salt2 = CryptoUtils.generateSalt();
      expect(salt1).not.toBe(salt2);
    });
  });

  describe('Error Handling', () => {
    it('should handle crypto errors gracefully', () => {
      // Mock crypto to throw error
      const originalPbkdf2 = crypto.pbkdf2;
      crypto.pbkdf2 = vi.fn((password, salt, iterations, keylen, digest, callback) => {
        callback(new Error('Crypto error'), null);
      }) as any;

      expect(CryptoUtils.hashPassword('password')).rejects.toThrow('Password hashing failed');

      crypto.pbkdf2 = originalPbkdf2;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });
});