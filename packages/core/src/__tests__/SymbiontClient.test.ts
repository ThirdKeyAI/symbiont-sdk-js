import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SymbiontClient } from '../client';
import { SymbiontConfig } from '@symbiont/types';
import { TestEnvironment } from '../../../testing/src/TestEnvironment';

describe('SymbiontClient', () => {
  let testEnv: TestEnvironment;
  let mockConfig: SymbiontConfig;

  beforeEach(async () => {
    testEnv = new TestEnvironment();
    await testEnv.setup();

    mockConfig = {
      apiKey: 'test-api-key',
      jwt: 'test-jwt-token',
      runtimeApiUrl: 'http://localhost:8080',
      toolReviewApiUrl: 'http://localhost:8081',
      validationMode: 'development',
      environment: 'development',
      debug: false
    };
  });

  afterEach(async () => {
    await testEnv.teardown();
  });

  describe('constructor', () => {
    it('should initialize with valid configuration', () => {
      const client = new SymbiontClient(mockConfig);
      
      expect(client.configuration).toEqual(expect.objectContaining({
        apiKey: 'test-api-key',
        jwt: 'test-jwt-token',
        validationMode: 'development',
        environment: 'development',
        debug: false
      }));
    });

    it('should set default values for optional configuration', () => {
      const minimalConfig = {
        apiKey: 'test-api-key'
      };

      const client = new SymbiontClient(minimalConfig);
      const config = client.configuration;

      expect(config.validationMode).toBe('development');
      expect(config.environment).toBe('development');
      expect(config.timeout).toBe(30000);
      expect(config.debug).toBe(false);
    });

    it('should set default API URLs based on environment', () => {
      const productionConfig = {
        apiKey: 'test-api-key',
        environment: 'production' as const
      };

      const client = new SymbiontClient(productionConfig);
      const config = client.configuration;

      expect(config.runtimeApiUrl).toBe('https://api.symbiont.com');
      expect(config.toolReviewApiUrl).toBe('https://tool-review.symbiont.com');
    });

    it('should set staging URLs for staging environment', () => {
      const stagingConfig = {
        apiKey: 'test-api-key',
        environment: 'staging' as const
      };

      const client = new SymbiontClient(stagingConfig);
      const config = client.configuration;

      expect(config.runtimeApiUrl).toBe('https://staging-api.symbiont.com');
      expect(config.toolReviewApiUrl).toBe('https://staging-tool-review.symbiont.com');
    });

    it('should throw error when no authentication is provided', () => {
      expect(() => {
        new SymbiontClient({});
      }).toThrow('Either apiKey or jwt must be provided for authentication');
    });

    it('should accept JWT token without API key', () => {
      const jwtConfig = {
        jwt: 'test-jwt-token'
      };

      expect(() => {
        new SymbiontClient(jwtConfig);
      }).not.toThrow();
    });

    it('should preserve custom API URLs when provided', () => {
      const customConfig = {
        apiKey: 'test-api-key',
        runtimeApiUrl: 'https://custom-runtime.example.com',
        toolReviewApiUrl: 'https://custom-tool-review.example.com'
      };

      const client = new SymbiontClient(customConfig);
      const config = client.configuration;

      expect(config.runtimeApiUrl).toBe('https://custom-runtime.example.com');
      expect(config.toolReviewApiUrl).toBe('https://custom-tool-review.example.com');
    });
  });

  describe('lazy-loaded clients', () => {
    let client: SymbiontClient;

    beforeEach(() => {
      client = new SymbiontClient(mockConfig);
    });

    it('should create agents client on first access', () => {
      // Mock the require call
      const mockAgentClient = { test: 'agent' };
      vi.doMock('@symbiont/agent', () => ({
        AgentClient: vi.fn(() => mockAgentClient)
      }));

      expect(client.agents).toBeDefined();
    });

    it('should throw error for unimplemented policies client', () => {
      expect(() => {
        client.policies;
      }).toThrow('PolicyClient not yet implemented');
    });

    it('should create secrets client on first access', () => {
      expect(client.secrets).toBeDefined();
    });

    it('should create tool review client on first access', () => {
      // Mock the require call
      const mockToolReviewClient = { test: 'tool-review' };
      vi.doMock('@symbiont/tool-review', () => ({
        ToolReviewClient: vi.fn(() => mockToolReviewClient)
      }));

      expect(client.toolReview).toBeDefined();
    });

    it('should create MCP client on first access', () => {
      // Mock the require call
      const mockMcpClient = { test: 'mcp' };
      vi.doMock('@symbiont/mcp', () => ({
        McpClient: vi.fn(() => mockMcpClient)
      }));

      expect(client.mcp).toBeDefined();
    });

    it('should create policy builder on access', () => {
      // Mock the require call
      const mockPolicyBuilder = { test: 'policy-builder' };
      vi.doMock('@symbiont/policy', () => ({
        PolicyBuilder: vi.fn(() => mockPolicyBuilder)
      }));

      expect(client.policyBuilder).toBeDefined();
    });
  });

  describe('connect', () => {
    let client: SymbiontClient;

    beforeEach(() => {
      client = new SymbiontClient(mockConfig);
    });

    it('should connect successfully with healthy API', async () => {
      const mocks = testEnv.getMocks();
      mocks.auth.setHealthy(true);

      await expect(client.connect()).resolves.toBeUndefined();
      expect(mocks.auth.getRefreshCallCount()).toBe(1);
    });

    it('should throw error when authentication fails', async () => {
      const mocks = testEnv.getMocks();
      mocks.auth.setHealthy(false);

      await expect(client.connect()).rejects.toThrow('Failed to connect to Symbiont APIs');
    });

    it('should throw error when health check fails', async () => {
      const mocks = testEnv.getMocks();
      mocks.fetch.mockResponse('/health', {
        status: 500,
        body: { status: 'unhealthy' }
      });

      // Mock the health method to return unhealthy status
      vi.spyOn(client, 'health').mockResolvedValue({
        status: 'unhealthy',
        timestamp: new Date().toISOString()
      });

      await expect(client.connect()).rejects.toThrow('API health check failed: unhealthy');
    });
  });

  describe('health', () => {
    let client: SymbiontClient;

    beforeEach(() => {
      client = new SymbiontClient(mockConfig);
    });

    it('should return healthy status', async () => {
      const health = await client.health();

      expect(health.status).toBe('healthy');
      expect(health.timestamp).toBeDefined();
      expect(health.version).toBe('1.0.0');
      expect(health.uptime).toBeDefined();
    });

    it('should return unhealthy status on error', async () => {
      // Mock the health method to throw an error
      vi.spyOn(client, 'health').mockImplementation(async () => {
        throw new Error('Health check failed');
      });

      const health = await client.health();
      expect(health.status).toBe('unhealthy');
      expect(health.timestamp).toBeDefined();
    });
  });

  describe('authentication methods', () => {
    let client: SymbiontClient;

    beforeEach(() => {
      client = new SymbiontClient(mockConfig);
    });

    it('should get auth headers for endpoint', async () => {
      const headers = await client.getAuthHeaders('/api/agents');
      expect(headers).toHaveProperty('Authorization');
      expect(headers.Authorization).toMatch(/^Bearer /);
    });

    it('should refresh authentication tokens', async () => {
      const mocks = testEnv.getMocks();
      
      await client.refreshAuth();
      expect(mocks.auth.getRefreshCallCount()).toBe(1);
    });
  });

  describe('configuration immutability', () => {
    it('should return frozen configuration object', () => {
      const client = new SymbiontClient(mockConfig);
      const config = client.configuration;

      expect(() => {
        (config as any).apiKey = 'modified';
      }).toThrow();
    });

    it('should return deep clone of configuration', () => {
      const client = new SymbiontClient(mockConfig);
      const config1 = client.configuration;
      const config2 = client.configuration;

      expect(config1).not.toBe(config2); // Different objects
      expect(config1).toEqual(config2); // Same content
    });
  });
});