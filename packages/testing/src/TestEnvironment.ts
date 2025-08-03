import { SymbiontConfig } from '@symbiont/types';
import { MockFetch } from './mocks/MockFetch';
import { MockAuthManager } from './mocks/MockAuthManager';
import { MockSecretManager } from './mocks/MockSecretManager';

/**
 * Test environment setup for integration tests
 */
export class TestEnvironment {
  private mockFetch: MockFetch;
  private mockAuthManager: MockAuthManager;
  private mockSecretManager: MockSecretManager;
  private originalFetch: typeof fetch | undefined;
  private isSetup = false;

  constructor(private config: Partial<SymbiontConfig> = {}) {
    this.mockFetch = new MockFetch();
    this.mockAuthManager = new MockAuthManager(config);
    this.mockSecretManager = new MockSecretManager();
  }

  /**
   * Set up the test environment
   */
  async setup(): Promise<void> {
    if (this.isSetup) {
      return;
    }

    // Mock global fetch
    this.originalFetch = global.fetch;
    global.fetch = this.mockFetch.getFetch();

    // Set up default API responses
    this.setupDefaultResponses();

    // Set up default secrets
    this.setupDefaultSecrets();

    this.isSetup = true;
  }

  /**
   * Tear down the test environment
   */
  async teardown(): Promise<void> {
    if (!this.isSetup) {
      return;
    }

    // Restore original fetch
    if (this.originalFetch) {
      global.fetch = this.originalFetch;
    }

    // Clear all mocks
    this.mockFetch.clearMocks();
    this.mockAuthManager.clearCallHistory();
    this.mockSecretManager.clearSecrets();

    this.isSetup = false;
  }

  /**
   * Get a configured SymbiontClient for testing
   */
  getClient(): any {
    const { SymbiontClient } = require('@symbiont/core');
    
    const defaultConfig: SymbiontConfig = {
      apiKey: 'test-api-key',
      jwt: 'test-jwt-token',
      runtimeApiUrl: 'http://localhost:8080',
      toolReviewApiUrl: 'http://localhost:8081',
      validationMode: 'development',
      environment: 'development',
      debug: false,
      ...this.config
    };

    return new SymbiontClient(defaultConfig);
  }

  /**
   * Get mock instances for advanced testing
   */
  getMocks() {
    return {
      fetch: this.mockFetch,
      auth: this.mockAuthManager,
      secrets: this.mockSecretManager
    };
  }

  /**
   * Set up default API responses
   */
  private setupDefaultResponses(): void {
    // Health endpoint
    this.mockFetch.mockResponse('/health', {
      status: 200,
      body: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        uptime: Date.now()
      }
    });

    // Runtime API endpoints
    this.mockFetch.mockResponse('/api/agents', {
      status: 200,
      body: {
        agents: [
          {
            id: 'test-agent-1',
            name: 'Test Agent 1',
            status: 'active',
            createdAt: '2024-01-01T00:00:00Z'
          }
        ]
      }
    });

    // Tool Review API endpoints
    this.mockFetch.mockResponse('/tool-review/sessions', {
      status: 200,
      body: {
        sessions: [
          {
            id: 'session-1',
            status: 'active',
            createdAt: '2024-01-01T00:00:00Z'
          }
        ]
      }
    });

    // Authentication endpoints
    this.mockFetch.mockResponse('/auth/token', {
      status: 200,
      body: {
        token: 'mock-refreshed-token',
        expiresAt: new Date(Date.now() + 3600000).toISOString()
      }
    });

    // Default error response for unmatched requests
    this.mockFetch.mockDefaultResponse({
      status: 404,
      body: { error: 'Not found' }
    });
  }

  /**
   * Set up default secrets for testing
   */
  private setupDefaultSecrets(): void {
    this.mockSecretManager.setSecrets({
      'API_KEY': 'test-api-key-from-secrets',
      'JWT_TOKEN': 'test-jwt-token-from-secrets',
      'DATABASE_URL': 'test://localhost:5432/testdb',
      'REDIS_URL': 'redis://localhost:6379'
    });

    // Environment-specific secrets
    this.mockSecretManager.setSecrets({
      'API_KEY': 'env-api-key',
      'JWT_TOKEN': 'env-jwt-token'
    }, 'environment');

    // File-specific secrets
    this.mockSecretManager.setSecrets({
      'API_KEY': 'file-api-key',
      'JWT_TOKEN': 'file-jwt-token'
    }, 'file');
  }
}