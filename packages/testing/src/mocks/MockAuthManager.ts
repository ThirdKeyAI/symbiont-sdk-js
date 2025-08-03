import { SymbiontConfig } from '@symbiont/types';

/**
 * Mock authentication manager for testing
 */
export class MockAuthManager {
  private runtimeToken: string | null = 'mock-runtime-token';
  private jwtToken: string | null = 'mock-jwt-token';
  private isHealthy = true;
  private refreshCallCount = 0;
  private authHeaderCalls: AuthHeaderCall[] = [];

  constructor(private config?: Partial<SymbiontConfig>) {}

  /**
   * Set the runtime token for testing
   */
  setRuntimeToken(token: string | null): void {
    this.runtimeToken = token;
  }

  /**
   * Set the JWT token for testing
   */
  setJwtToken(token: string | null): void {
    this.jwtToken = token;
  }

  /**
   * Set whether the auth manager should be healthy
   */
  setHealthy(healthy: boolean): void {
    this.isHealthy = healthy;
  }

  /**
   * Get the number of times refreshTokens was called
   */
  getRefreshCallCount(): number {
    return this.refreshCallCount;
  }

  /**
   * Get all auth header calls for verification
   */
  getAuthHeaderCalls(): readonly AuthHeaderCall[] {
    return [...this.authHeaderCalls];
  }

  /**
   * Clear call history
   */
  clearCallHistory(): void {
    this.refreshCallCount = 0;
    this.authHeaderCalls = [];
  }

  /**
   * Mock implementation of getAuthHeaders
   */
  async getAuthHeaders(endpoint: string): Promise<Record<string, string>> {
    this.authHeaderCalls.push({
      endpoint,
      timestamp: new Date()
    });

    if (!this.isHealthy) {
      throw new Error('Authentication failed');
    }

    const isToolReview = this.isToolReviewEndpoint(endpoint);
    
    if (isToolReview) {
      return this.jwtToken ? { 'Authorization': `Bearer ${this.jwtToken}` } : {};
    } else {
      return this.runtimeToken ? { 'Authorization': `Bearer ${this.runtimeToken}` } : {};
    }
  }

  /**
   * Mock implementation of refreshTokens
   */
  async refreshTokens(): Promise<void> {
    this.refreshCallCount++;
    
    if (!this.isHealthy) {
      throw new Error('Token refresh failed');
    }

    // Simulate token refresh
    if (!this.runtimeToken) {
      this.runtimeToken = 'refreshed-runtime-token';
    }
    if (!this.jwtToken) {
      this.jwtToken = 'refreshed-jwt-token';
    }
  }

  /**
   * Check if an endpoint belongs to Tool Review API
   */
  private isToolReviewEndpoint(endpoint: string): boolean {
    return endpoint.includes('/sessions') || 
           endpoint.includes('/tool-review') ||
           endpoint.includes('/tools/submit');
  }
}

export interface AuthHeaderCall {
  endpoint: string;
  timestamp: Date;
}