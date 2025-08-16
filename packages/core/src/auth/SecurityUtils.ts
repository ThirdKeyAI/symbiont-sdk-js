import crypto from 'crypto';

/**
 * Security utilities for constant-time operations and cryptographic functions
 */
export class SecurityUtils {
  /**
   * Constant-time string comparison to prevent timing attacks
   */
  static constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      // Still perform comparison to maintain constant time
      let result = 1;
      const maxLength = Math.max(a.length, b.length);
      
      for (let i = 0; i < maxLength; i++) {
        const charA = i < a.length ? a.charCodeAt(i) : 0;
        const charB = i < b.length ? b.charCodeAt(i) : 0;
        result |= charA ^ charB;
      }
      
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    
    return result === 0;
  }

  /**
   * Generate cryptographically secure random bytes
   */
  static generateSecureRandom(length: number): Buffer {
    return crypto.randomBytes(length);
  }

  /**
   * Generate secure random string
   */
  static generateSecureRandomString(length: number, encoding: BufferEncoding = 'hex'): string {
    return this.generateSecureRandom(Math.ceil(length / 2)).toString(encoding).substring(0, length);
  }

  /**
   * Generate secure random token
   */
  static generateSecureToken(): string {
    return this.generateSecureRandom(32).toString('base64url');
  }

  /**
   * Hash a string using SHA-256
   */
  static hash(input: string, algorithm: string = 'sha256'): string {
    return crypto.createHash(algorithm).update(input).digest('hex');
  }

  /**
   * HMAC signing
   */
  static hmac(data: string, secret: string, algorithm: string = 'sha256'): string {
    return crypto.createHmac(algorithm, secret).update(data).digest('hex');
  }

  /**
   * Verify HMAC signature with constant-time comparison
   */
  static verifyHmac(data: string, signature: string, secret: string, algorithm: string = 'sha256'): boolean {
    const expectedSignature = this.hmac(data, secret, algorithm);
    return this.constantTimeCompare(signature, expectedSignature);
  }

  /**
   * Generate salt for password hashing
   */
  static generateSalt(length: number = 16): string {
    return this.generateSecureRandom(length).toString('hex');
  }

  /**
   * Hash password with salt using PBKDF2
   */
  static async hashPassword(password: string, salt?: string, iterations: number = 100000): Promise<{ hash: string; salt: string }> {
    const actualSalt = salt || this.generateSalt();
    
    return new Promise((resolve, reject) => {
      crypto.pbkdf2(password, actualSalt, iterations, 64, 'sha256', (err, derivedKey) => {
        if (err) {
          reject(err);
        } else {
          resolve({
            hash: derivedKey.toString('hex'),
            salt: actualSalt,
          });
        }
      });
    });
  }

  /**
   * Verify password against hash
   */
  static async verifyPassword(password: string, hash: string, salt: string, iterations: number = 100000): Promise<boolean> {
    try {
      const { hash: computedHash } = await this.hashPassword(password, salt, iterations);
      return this.constantTimeCompare(hash, computedHash);
    } catch {
      return false;
    }
  }

  /**
   * Generate CSRF token
   */
  static generateCSRFToken(): string {
    return this.generateSecureToken();
  }

  /**
   * Validate CSRF token
   */
  static validateCSRFToken(token: string, expectedToken: string): boolean {
    return this.constantTimeCompare(token, expectedToken);
  }
}