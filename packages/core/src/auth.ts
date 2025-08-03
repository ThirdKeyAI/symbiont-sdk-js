import { SymbiontConfig, TokenData, TokenCache } from '@symbiont/types';

/**
 * Authentication manager for handling dual API authentication
 */
export class AuthenticationManager {
  private runtimeToken: string | null = null;
  private jwtToken: string | null = null;
  private tokenRefreshPromise: Promise<void> | null = null;
  private config: SymbiontConfig;
  private secretManager: any | null = null;

  constructor(config: SymbiontConfig, secretManager?: any) {
    this.config = config;
    this.secretManager = secretManager;
    this.runtimeToken = config.apiKey || null;
    this.jwtToken = config.jwt || null;
  }

  /**
   * Get authentication headers for a specific endpoint
   */
  async getAuthHeaders(endpoint: string): Promise<Record<string, string>> {
    const isToolReview = this.isToolReviewEndpoint(endpoint);
    
    if (isToolReview) {
      const token = await this.getValidJwtToken();
      return token ? { 'Authorization': `Bearer ${token}` } : {};
    } else {
      const token = await this.getValidRuntimeToken();
      return token ? { 'Authorization': `Bearer ${token}` } : {};
    }
  }

  /**
   * Refresh authentication tokens
   */
  async refreshTokens(): Promise<void> {
    if (!this.tokenRefreshPromise) {
      this.tokenRefreshPromise = this.performTokenRefresh();
    }
    await this.tokenRefreshPromise;
    this.tokenRefreshPromise = null;
  }

  /**
   * Check if an endpoint belongs to Tool Review API
   */
  private isToolReviewEndpoint(endpoint: string): boolean {
    return endpoint.includes('/sessions') || 
           endpoint.includes('/tool-review') ||
           endpoint.includes('/tools/submit');
  }

  /**
   * Get valid runtime token, refreshing if necessary
   */
  private async getValidRuntimeToken(): Promise<string | null> {
    if (!this.runtimeToken || this.isTokenExpired(this.runtimeToken)) {
      await this.refreshRuntimeToken();
    }
    return this.runtimeToken;
  }

  /**
   * Get valid JWT token, refreshing if necessary
   */
  private async getValidJwtToken(): Promise<string | null> {
    if (!this.jwtToken || this.isTokenExpired(this.jwtToken)) {
      await this.refreshJwtToken();
    }
    return this.jwtToken;
  }

  /**
   * Check if a token is expired
   */
  private isTokenExpired(token: string): boolean {
    try {
      // Simple JWT expiration check
      const payload = JSON.parse(atob(token.split('.')[1]));
      const now = Math.floor(Date.now() / 1000);
      return payload.exp && payload.exp < now;
    } catch {
      // If we can't parse the token, assume it's not expired for API keys
      return false;
    }
  }

  /**
   * Refresh runtime API token
   */
  private async refreshRuntimeToken(): Promise<void> {
    // Try to resolve from SecretManager if not directly provided
    if (!this.runtimeToken && this.secretManager) {
      try {
        this.runtimeToken = await this.secretManager.getSecret('API_KEY', {
          required: false,
          defaultValue: undefined
        });
        
        if (this.config.debug && this.runtimeToken) {
          console.log('Runtime token resolved from SecretManager');
        }
      } catch (error) {
        if (this.config.debug) {
          console.warn('Failed to resolve runtime token from SecretManager:', error);
        }
      }
    }
    
    // Implementation would make actual API call to refresh token
    // For now, keep existing token
    if (this.config.debug && !this.runtimeToken) {
      console.log('Runtime token refresh would be implemented here');
    }
  }

  /**
   * Refresh JWT token
   */
  private async refreshJwtToken(): Promise<void> {
    // Try to resolve from SecretManager if not directly provided
    if (!this.jwtToken && this.secretManager) {
      try {
        this.jwtToken = await this.secretManager.getSecret('JWT_TOKEN', {
          required: false,
          defaultValue: undefined
        });
        
        if (this.config.debug && this.jwtToken) {
          console.log('JWT token resolved from SecretManager');
        }
      } catch (error) {
        if (this.config.debug) {
          console.warn('Failed to resolve JWT token from SecretManager:', error);
        }
      }
    }
    
    // Implementation would make actual API call to refresh JWT
    // For now, keep existing token
    if (this.config.debug && !this.jwtToken) {
      console.log('JWT token refresh would be implemented here');
    }
  }

  /**
   * Perform the actual token refresh operation
   */
  private async performTokenRefresh(): Promise<void> {
    await Promise.allSettled([
      this.refreshRuntimeToken(),
      this.refreshJwtToken()
    ]);
  }
}

/**
 * Simple in-memory token cache implementation
 */
export class MemoryTokenCache implements TokenCache {
  private cache = new Map<string, TokenData>();

  async get(key: string): Promise<TokenData | null> {
    const data = this.cache.get(key);
    if (data && data.expiresAt > new Date()) {
      return data;
    }
    if (data) {
      this.cache.delete(key);
    }
    return null;
  }

  async set(key: string, data: TokenData): Promise<void> {
    this.cache.set(key, data);
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }
}