import { JWTHandler } from './JWTHandler';
import { TokenValidationResult, BlacklistEntry } from '@symbi/types';
import { CryptoUtils } from '../security/CryptoUtils';

/**
 * Token validator with constant-time validation and blacklisting
 */
export class TokenValidator {
  private jwtHandler: JWTHandler;
  private blacklist: Set<string> = new Set();
  private blacklistEntries: Map<string, BlacklistEntry> = new Map();

  constructor(jwtHandler: JWTHandler) {
    this.jwtHandler = jwtHandler;
  }

  /**
   * Validate token with constant-time comparison
   */
  async validateToken(token: string): Promise<TokenValidationResult> {
    // Check blacklist first
    if (await this.isTokenBlacklisted(token)) {
      return {
        valid: false,
        error: 'Token is blacklisted',
      };
    }

    // Verify token signature and expiration
    const result = this.jwtHandler.verifyAccessToken(token);
    
    if (!result.valid) {
      return result;
    }

    // Additional validation checks can be added here
    return result;
  }

  /**
   * Blacklist a token
   */
  async blacklistToken(
    token: string, 
    reason?: string
  ): Promise<void> {
    const decoded = this.jwtHandler.decodeToken(token);
    if (!decoded) {
      throw new Error('Invalid token format');
    }

    const tokenId = this.getTokenId(token);
    const expiresAt = new Date(decoded.exp * 1000);

    const entry: BlacklistEntry = {
      tokenId,
      expiresAt,
      reason,
    };

    this.blacklist.add(tokenId);
    this.blacklistEntries.set(tokenId, entry);
  }

  /**
   * Check if token is blacklisted with constant-time comparison
   */
  async isTokenBlacklisted(token: string): Promise<boolean> {
    const tokenId = this.getTokenId(token);
    
    // Constant-time lookup
    return this.constantTimeSetLookup(this.blacklist, tokenId);
  }

  /**
   * Remove expired entries from blacklist
   */
  cleanupExpiredEntries(): void {
    const now = new Date();
    
    for (const [tokenId, entry] of this.blacklistEntries.entries()) {
      if (entry.expiresAt < now) {
        this.blacklist.delete(tokenId);
        this.blacklistEntries.delete(tokenId);
      }
    }
  }

  /**
   * Get blacklist size
   */
  getBlacklistSize(): number {
    return this.blacklist.size;
  }

  /**
   * Clear entire blacklist
   */
  clearBlacklist(): void {
    this.blacklist.clear();
    this.blacklistEntries.clear();
  }

  /**
   * Validate token permissions against required permissions
   */
  validatePermissions(
    tokenPermissions: string[],
    requiredPermissions: string[]
  ): boolean {
    if (!requiredPermissions.length) {
      return true;
    }

    return requiredPermissions.every(required => 
      tokenPermissions.includes(required)
    );
  }

  /**
   * Validate token roles against required roles
   */
  validateRoles(
    tokenRoles: string[],
    requiredRoles: string[]
  ): boolean {
    if (!requiredRoles.length) {
      return true;
    }

    return requiredRoles.some(required => 
      tokenRoles.includes(required)
    );
  }

  /**
   * Generate a unique token ID for blacklisting
   */
  private getTokenId(token: string): string {
    // Use a simple hash of the token for blacklisting
    // In production, you might want to use the 'jti' claim if available
    return this.simpleHash(token);
  }

  /**
   * Constant-time set lookup to prevent timing attacks
   */
  private constantTimeSetLookup(set: Set<string>, value: string): boolean {
    let found = false;
    let iterations = 0;
    const maxIterations = Math.max(set.size, 100); // Minimum iterations to prevent timing analysis

    for (const item of set) {
      iterations++;
      if (CryptoUtils.constantTimeCompare(item, value)) {
        found = true;
      }
    }

    // Pad iterations to constant time
    while (iterations < maxIterations) {
      // Dummy comparison to maintain constant time
      CryptoUtils.constantTimeCompare('dummy', 'dummy');
      iterations++;
    }

    return found;
  }

  /**
   * Simple hash function for token IDs
   */
  private simpleHash(input: string): string {
    return CryptoUtils.hash(input).substring(0, 16); // Use first 16 chars of secure hash
  }
}