import jwt from 'jsonwebtoken';
import { AuthToken, JWTPayload, TokenValidationResult } from '@symbiont/types';

/**
 * JWT Handler for encoding/decoding JWTs with refresh capabilities
 */
export class JWTHandler {
  private accessSecret: string;
  private refreshSecret: string;
  private accessTokenExpiry: string;
  private refreshTokenExpiry: string;
  private issuer?: string;
  private audience?: string;

  constructor(
    accessSecret: string,
    refreshSecret: string,
    options: {
      accessTokenExpiry?: string;
      refreshTokenExpiry?: string;
      issuer?: string;
      audience?: string;
    } = {}
  ) {
    this.accessSecret = accessSecret;
    this.refreshSecret = refreshSecret;
    this.accessTokenExpiry = options.accessTokenExpiry || '15m';
    this.refreshTokenExpiry = options.refreshTokenExpiry || '7d';
    this.issuer = options.issuer;
    this.audience = options.audience;

    // Validate expiry formats during construction
    this.parseExpiry(this.accessTokenExpiry);
    this.parseExpiry(this.refreshTokenExpiry);
  }

  /**
   * Generate access and refresh tokens for a user
   */
  generateTokens(payload: Omit<JWTPayload, 'iat' | 'exp'>): AuthToken {
    const now = Math.floor(Date.now() / 1000);
    
    const accessPayload: JWTPayload = {
      ...payload,
      iat: now,
      exp: now + this.parseExpiry(this.accessTokenExpiry),
      iss: this.issuer,
      aud: this.audience,
    };

    const refreshPayload = {
      sub: payload.sub,
      type: 'refresh',
      iat: now,
      exp: now + this.parseExpiry(this.refreshTokenExpiry),
      iss: this.issuer,
      aud: this.audience,
    };

    const accessToken = jwt.sign(accessPayload, this.accessSecret);
    const refreshToken = jwt.sign(refreshPayload, this.refreshSecret);

    return {
      accessToken,
      refreshToken,
      expiresAt: new Date((now + this.parseExpiry(this.accessTokenExpiry)) * 1000),
      tokenType: 'Bearer',
      scope: payload.permissions,
      metadata: {
        userId: payload.sub,
        email: payload.email,
        roles: payload.roles,
      },
    };
  }

  /**
   * Verify and decode an access token
   */
  verifyAccessToken(token: string): TokenValidationResult {
    try {
      const payload = jwt.verify(token, this.accessSecret) as JWTPayload;
      
      return {
        valid: true,
        payload,
        remainingTime: payload.exp - Math.floor(Date.now() / 1000),
      };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Invalid token',
      };
    }
  }

  /**
   * Verify and decode a refresh token
   */
  verifyRefreshToken(token: string): TokenValidationResult {
    try {
      const payload = jwt.verify(token, this.refreshSecret) as any;
      
      if (payload.type !== 'refresh') {
        return {
          valid: false,
          error: 'Invalid refresh token type',
        };
      }

      return {
        valid: true,
        payload,
        remainingTime: payload.exp - Math.floor(Date.now() / 1000),
      };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Invalid refresh token',
      };
    }
  }

  /**
   * Refresh an access token using a refresh token
   */
  refreshAccessToken(
    refreshToken: string,
    userPayload: Omit<JWTPayload, 'iat' | 'exp'>
  ): AuthToken | null {
    const refreshResult = this.verifyRefreshToken(refreshToken);
    
    if (!refreshResult.valid || !refreshResult.payload) {
      return null;
    }

    // Generate new access token
    return this.generateTokens(userPayload);
  }

  /**
   * Decode token without verification (for inspection)
   */
  decodeToken(token: string): JWTPayload | null {
    try {
      return jwt.decode(token) as JWTPayload;
    } catch {
      return null;
    }
  }

  /**
   * Get token expiration time
   */
  getTokenExpiration(token: string): Date | null {
    const decoded = this.decodeToken(token);
    return decoded?.exp ? new Date(decoded.exp * 1000) : null;
  }

  /**
   * Check if token is expired
   */
  isTokenExpired(token: string): boolean {
    const expiration = this.getTokenExpiration(token);
    return expiration ? expiration < new Date() : true;
  }

  /**
   * Parse expiry string to seconds
   */
  private parseExpiry(expiry: string): number {
    if (!expiry || expiry.length < 2) {
      throw new Error(`Invalid expiry format: ${expiry}`);
    }

    const unit = expiry.slice(-1);
    const value = parseInt(expiry.slice(0, -1), 10);

    if (isNaN(value) || value <= 0) {
      throw new Error(`Invalid expiry format: ${expiry}`);
    }

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 60 * 60;
      case 'd':
        return value * 24 * 60 * 60;
      default:
        throw new Error(`Invalid expiry format: ${expiry}`);
    }
  }
}