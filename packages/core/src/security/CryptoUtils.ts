import crypto from 'crypto';

/**
 * Cryptographic utilities with enhanced security features and timing attack prevention
 */
export class CryptoUtils {
  private static readonly DEFAULT_ITERATIONS = 100000;
  private static readonly DEFAULT_KEY_LENGTH = 64;
  private static readonly DEFAULT_SALT_LENGTH = 16;

  /**
   * Enhanced constant-time string comparison with length padding
   * Prevents timing attacks by ensuring consistent execution time
   */
  static constantTimeCompare(a: string, b: string): boolean {
    const maxLength = Math.max(a.length, b.length, 32); // Minimum 32 chars for padding
    
    // Pad strings to ensure constant comparison time
    const paddedA = a.padEnd(maxLength, '\0');
    const paddedB = b.padEnd(maxLength, '\0');
    
    let result = 0;
    for (let i = 0; i < maxLength; i++) {
      result |= paddedA.charCodeAt(i) ^ paddedB.charCodeAt(i);
    }
    
    // Additional check for original length equality
    const lengthEqual = a.length === b.length ? 0 : 1;
    
    return (result | lengthEqual) === 0;
  }

  /**
   * Constant-time buffer comparison
   */
  static constantTimeBufferCompare(a: Buffer, b: Buffer): boolean {
    if (a.length !== b.length) {
      // Perform dummy comparison to maintain timing
      const maxLength = Math.max(a.length, b.length);
      for (let i = 0; i < maxLength; i++) {
        const byteA = i < a.length ? a[i] : 0;
        const byteB = i < b.length ? b[i] : 0;
        // Perform XOR but don't store result since we're returning false anyway
        void (byteA ^ byteB);
      }
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a[i] ^ b[i];
    }
    return result === 0;
  }

  /**
   * Generate cryptographically secure random bytes
   */
  static generateSecureRandom(length: number): Buffer {
    if (length <= 0 || length > 1024 * 1024) {
      throw new Error('Invalid random byte length');
    }
    return crypto.randomBytes(length);
  }

  /**
   * Generate secure random string with specified encoding
   */
  static generateSecureRandomString(length: number, encoding: 'hex' | 'base64' | 'base64url' = 'hex'): string {
    if (length <= 0 || length > 10000) {
      throw new Error('Invalid random string length');
    }
    
    const byteLength = encoding === 'hex' ? Math.ceil(length / 2) : Math.ceil(length * 3 / 4);
    const buffer = this.generateSecureRandom(byteLength);
    return buffer.toString(encoding).substring(0, length);
  }

  /**
   * Generate secure token with base64url encoding
   */
  static generateSecureToken(length: number = 32): string {
    return this.generateSecureRandom(length).toString('base64url');
  }

  /**
   * Generate UUID v4 using secure random
   */
  static generateUUID(): string {
    const bytes = this.generateSecureRandom(16);
    
    // Set version (4) and variant bits
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // Version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // Variant 10
    
    const hex = bytes.toString('hex');
    return [
      hex.substring(0, 8),
      hex.substring(8, 12),
      hex.substring(12, 16),
      hex.substring(16, 20),
      hex.substring(20, 32)
    ].join('-');
  }

  /**
   * Hash data using specified algorithm
   */
  static hash(input: string | Buffer, algorithm: string = 'sha256'): string {
    if (typeof input === 'string' && input.length > 1000000) {
      throw new Error('Input too large for hashing');
    }
    return crypto.createHash(algorithm).update(input).digest('hex');
  }

  /**
   * HMAC with timing attack protection
   */
  static hmac(data: string | Buffer, secret: string | Buffer, algorithm: string = 'sha256'): string {
    if (typeof data === 'string' && data.length > 1000000) {
      throw new Error('Data too large for HMAC');
    }
    return crypto.createHmac(algorithm, secret).update(data).digest('hex');
  }

  /**
   * Verify HMAC signature with constant-time comparison
   */
  static verifyHmac(data: string | Buffer, signature: string, secret: string | Buffer, algorithm: string = 'sha256'): boolean {
    try {
      const expectedSignature = this.hmac(data, secret, algorithm);
      return this.constantTimeCompare(signature, expectedSignature);
    } catch {
      return false;
    }
  }

  /**
   * Generate cryptographically secure salt
   */
  static generateSalt(length: number = CryptoUtils.DEFAULT_SALT_LENGTH): string {
    return this.generateSecureRandom(length).toString('hex');
  }

  /**
   * Hash password using PBKDF2 with secure defaults
   */
  static async hashPassword(
    password: string, 
    salt?: string, 
    iterations: number = CryptoUtils.DEFAULT_ITERATIONS,
    keyLength: number = CryptoUtils.DEFAULT_KEY_LENGTH
  ): Promise<{ hash: string; salt: string; iterations: number }> {
    if (!password || password.length > 1000) {
      throw new Error('Invalid password length');
    }

    const actualSalt = salt || this.generateSalt();
    
    return new Promise((resolve, reject) => {
      crypto.pbkdf2(password, actualSalt, iterations, keyLength, 'sha256', (err, derivedKey) => {
        if (err) {
          reject(new Error('Password hashing failed'));
        } else {
          resolve({
            hash: derivedKey.toString('hex'),
            salt: actualSalt,
            iterations
          });
        }
      });
    });
  }

  /**
   * Verify password with constant-time comparison
   */
  static async verifyPassword(
    password: string, 
    hash: string, 
    salt: string, 
    iterations: number = CryptoUtils.DEFAULT_ITERATIONS,
    keyLength: number = CryptoUtils.DEFAULT_KEY_LENGTH
  ): Promise<boolean> {
    try {
      const { hash: computedHash } = await this.hashPassword(password, salt, iterations, keyLength);
      return this.constantTimeCompare(hash, computedHash);
    } catch {
      return false;
    }
  }

  /**
   * Generate CSRF token
   */
  static generateCSRFToken(): string {
    return this.generateSecureToken(32);
  }

  /**
   * Validate CSRF token with constant-time comparison
   */
  static validateCSRFToken(token: string, expectedToken: string): boolean {
    if (!token || !expectedToken) {
      return false;
    }
    return this.constantTimeCompare(token, expectedToken);
  }

  /**
   * Encrypt data using AES-256-GCM
   */
  static encrypt(data: string, key: Buffer): { encrypted: string; iv: string; tag: string } {
    const iv = this.generateSecureRandom(12); // 96-bit IV for GCM
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    cipher.setAAD(Buffer.from('symbiont-sdk', 'utf8'));
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      tag: tag.toString('hex')
    };
  }

  /**
   * Decrypt data using AES-256-GCM
   */
  static decrypt(encrypted: string, key: Buffer, iv: string, tag: string): string {
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'hex'));
    decipher.setAAD(Buffer.from('symbiont-sdk', 'utf8'));
    decipher.setAuthTag(Buffer.from(tag, 'hex'));
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Derive key using PBKDF2
   */
  static async deriveKey(password: string, salt: string, iterations: number = 100000, keyLength: number = 32): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      crypto.pbkdf2(password, salt, iterations, keyLength, 'sha256', (err, derivedKey) => {
        if (err) {
          reject(err);
        } else {
          resolve(derivedKey);
        }
      });
    });
  }

  /**
   * Secure memory wipe (best effort)
   */
  static secureWipe(buffer: Buffer): void {
    if (buffer && buffer.length > 0) {
      buffer.fill(0);
    }
  }

  /**
   * Rate limiting token bucket
   */
  static createRateLimiter(maxTokens: number, refillRate: number): {
    consume: () => boolean;
    reset: () => void;
  } {
    let tokens = maxTokens;
    let lastRefill = Date.now();

    return {
      consume(): boolean {
        const now = Date.now();
        const elapsed = now - lastRefill;
        const tokensToAdd = Math.floor(elapsed * refillRate / 1000);
        
        tokens = Math.min(maxTokens, tokens + tokensToAdd);
        lastRefill = now;

        if (tokens > 0) {
          tokens--;
          return true;
        }
        return false;
      },
      reset(): void {
        tokens = maxTokens;
        lastRefill = Date.now();
      }
    };
  }
}