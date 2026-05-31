import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { McpClient } from '../McpClient';
import { buildRuntimeUrl } from '../urlUtils';
import { TestEnvironment } from '../../../testing/src/TestEnvironment';
import { mockErrorResponses } from '../../../testing/src/data/mockData';
import type {
  WorkflowExecutionPayload,
  WorkflowExecutionResult,
  HealthStatus,
} from 'symbi-types';

describe('McpClient Integration Tests', () => {
  let testEnv: TestEnvironment;
  let mcpClient: McpClient;

  beforeEach(async () => {
    testEnv = new TestEnvironment({
      runtimeApiUrl: 'http://localhost:8080',
      apiKey: 'test-api-key',
    });
    await testEnv.setup();

    const symbiontClient = testEnv.getClient();
    mcpClient = symbiontClient.mcp;
  });

  afterEach(async () => {
    await testEnv.teardown();
  });

  describe('URL normalization', () => {
    it('targets the /api/v1-prefixed workflows/execute route', async () => {
      const mocks = testEnv.getMocks();
      mocks.fetch.mockResponse('/workflows/execute', {
        status: 200,
        body: {
          executionId: 'exec-url',
          workflowId: 'workflow-url',
          status: 'completed',
          startedAt: '2024-01-01T12:00:00Z',
          parameters: {},
        },
      });

      await mcpClient.executeWorkflow({
        workflowId: 'workflow-url',
        parameters: { input: 'x' },
        options: { priority: 'normal' },
      });

      const calls = mocks.fetch.getCallsFor('/workflows/execute');
      expect(calls).toHaveLength(1);
      // The runtime serves every route under a single /api/v1 segment.
      expect(calls[0].url).toContain('/api/v1/workflows/execute');
      expect(calls[0].url).toBe(
        buildRuntimeUrl('http://localhost:8080', '/workflows/execute')
      );
    });

    it('targets the /api/v1-prefixed health route', async () => {
      const mocks = testEnv.getMocks();
      mocks.fetch.mockResponse('/health', {
        status: 200,
        body: { status: 'healthy', timestamp: '2024-01-01T12:00:00Z' },
      });

      await mcpClient.checkServerHealth();

      const calls = mocks.fetch.getCallsFor('/health');
      expect(calls).toHaveLength(1);
      expect(calls[0].url).toContain('/api/v1/health');
    });
  });

  describe('executeWorkflow', () => {
    const mockPayload: WorkflowExecutionPayload = {
      workflowId: 'workflow-123',
      parameters: {
        input: 'test data',
        mode: 'sync',
        timeout: 30000,
      },
      options: {
        timeout: 60000,
        priority: 'high',
        metadata: {
          source: 'integration-test',
          version: '1.0.0',
        },
        retryConfig: {
          maxRetries: 3,
          backoffStrategy: 'exponential',
          retryDelay: 1000,
        },
      },
    };

    it('should successfully execute workflow', async () => {
      const mocks = testEnv.getMocks();
      const mockResult: WorkflowExecutionResult<string> = {
        executionId: 'exec-456',
        workflowId: 'workflow-123',
        status: 'completed',
        result: 'Workflow executed successfully',
        startedAt: '2024-01-01T12:00:00Z',
        completedAt: '2024-01-01T12:05:00Z',
        duration: 300000,
        parameters: mockPayload.parameters,
        metadata: mockPayload.options?.metadata,
      };

      mocks.fetch.mockResponse('/workflows/execute', {
        status: 200,
        body: mockResult,
      });

      const result = await mcpClient.executeWorkflow(mockPayload);

      expect(result).toEqual(mockResult);

      const calls = mocks.fetch.getCallsFor('/workflows/execute');
      expect(calls).toHaveLength(1);
      expect(calls[0].method).toBe('POST');
      expect(calls[0].url).toContain('/api/v1/workflows/execute');
      expect(JSON.parse(calls[0].body!)).toEqual(mockPayload);
    });

    it('should execute workflow with minimal payload', async () => {
      const mocks = testEnv.getMocks();
      const minimalPayload: WorkflowExecutionPayload = {
        workflowId: 'simple-workflow',
        parameters: { input: 'simple test' },
        options: {
          priority: 'normal',
        },
      };

      const mockResult: WorkflowExecutionResult = {
        executionId: 'exec-simple',
        workflowId: 'simple-workflow',
        status: 'completed',
        startedAt: '2024-01-01T12:00:00Z',
        completedAt: '2024-01-01T12:01:00Z',
        duration: 60000,
        parameters: minimalPayload.parameters,
      };

      mocks.fetch.mockResponse('/workflows/execute', {
        status: 200,
        body: mockResult,
      });

      const result = await mcpClient.executeWorkflow(minimalPayload);

      expect(result).toEqual(mockResult);
      expect(result.status).toBe('completed');
    });

    it('should throw error for empty payload', async () => {
      await expect(mcpClient.executeWorkflow(null as any)).rejects.toThrow(
        'Workflow execution payload is required'
      );
    });

    it('should throw error for missing workflow ID', async () => {
      const invalidPayload = {
        workflowId: '',
        parameters: { test: 'value' },
        options: {
          priority: 'normal' as const,
        },
      };

      await expect(mcpClient.executeWorkflow(invalidPayload)).rejects.toThrow(
        'Workflow ID is required'
      );
    });

    it('should throw error for missing parameters', async () => {
      const invalidPayload = {
        workflowId: 'test-workflow',
        parameters: null as any,
        options: {
          priority: 'normal' as const,
        },
      };

      await expect(mcpClient.executeWorkflow(invalidPayload)).rejects.toThrow(
        'Workflow parameters are required'
      );
    });

    it('should handle workflow execution failure', async () => {
      const mocks = testEnv.getMocks();
      const failedResult: WorkflowExecutionResult = {
        executionId: 'exec-failed',
        workflowId: 'workflow-123',
        status: 'failed',
        error: 'Workflow execution failed: Invalid parameter type',
        startedAt: '2024-01-01T12:00:00Z',
        completedAt: '2024-01-01T12:00:30Z',
        duration: 30000,
        parameters: mockPayload.parameters,
      };

      mocks.fetch.mockResponse('/workflows/execute', {
        status: 200,
        body: failedResult,
      });

      const result = await mcpClient.executeWorkflow(mockPayload);

      expect(result.status).toBe('failed');
      expect(result.error).toContain('Invalid parameter type');
    });

    it('should handle workflow timeout', async () => {
      const mocks = testEnv.getMocks();
      const timeoutResult: WorkflowExecutionResult = {
        executionId: 'exec-timeout',
        workflowId: 'workflow-123',
        status: 'timeout',
        error: 'Workflow execution timed out after 60 seconds',
        startedAt: '2024-01-01T12:00:00Z',
        parameters: mockPayload.parameters,
      };

      mocks.fetch.mockResponse('/workflows/execute', {
        status: 200,
        body: timeoutResult,
      });

      const result = await mcpClient.executeWorkflow(mockPayload);

      expect(result.status).toBe('timeout');
      expect(result.error).toContain('timed out');
    });

    it('should handle authentication failure', async () => {
      const mocks = testEnv.getMocks();
      mocks.fetch.mockResponse('/workflows/execute', {
        status: 401,
        body: mockErrorResponses.unauthorized,
      });

      await expect(mcpClient.executeWorkflow(mockPayload)).rejects.toThrow(
        'MCP API request failed: 401'
      );
    });

    it('should handle server errors', async () => {
      const mocks = testEnv.getMocks();
      mocks.fetch.mockResponse('/workflows/execute', {
        status: 500,
        body: mockErrorResponses.serverError,
      });

      await expect(mcpClient.executeWorkflow(mockPayload)).rejects.toThrow(
        'MCP API request failed: 500'
      );
    });

    it('should use correct headers for MCP API', async () => {
      const mocks = testEnv.getMocks();
      mocks.fetch.mockResponse('/workflows/execute', {
        status: 200,
        body: { executionId: 'test', workflowId: 'test', status: 'completed', startedAt: '2024-01-01T12:00:00Z', parameters: {} },
      });

      await mcpClient.executeWorkflow(mockPayload);

      const calls = mocks.fetch.getCallsFor('/workflows/execute');
      expect(calls[0].headers['Content-Type']).toBe('application/json');
      expect(calls[0].headers['Authorization']).toBe('Bearer test-api-key');
    });

    it('should preserve original error messages', async () => {
      const mocks = testEnv.getMocks();
      const customError = 'Workflow validation failed: Invalid workflow definition';

      mocks.fetch.mockResponse('/workflows/execute', {
        status: 422,
        body: customError,
      });

      await expect(mcpClient.executeWorkflow({
        workflowId: 'test',
        parameters: { test: 'value' },
        options: {
          priority: 'normal',
        },
      })).rejects.toThrow(customError);
    });

    it('should handle workflow execution with complex result types', async () => {
      const mocks = testEnv.getMocks();
      const complexResult = {
        data: [
          { id: 1, name: 'Item 1', metadata: { tags: ['tag1', 'tag2'] } },
          { id: 2, name: 'Item 2', metadata: { tags: ['tag3'] } },
        ],
        summary: {
          totalItems: 2,
          processingTime: '5.2s',
          warnings: [],
        },
      };

      const executionResult: WorkflowExecutionResult<typeof complexResult> = {
        executionId: 'exec-complex',
        workflowId: 'data-workflow',
        status: 'completed',
        result: complexResult,
        startedAt: '2024-01-01T12:00:00Z',
        completedAt: '2024-01-01T12:05:20Z',
        duration: 320000,
        parameters: { source: 'database', format: 'json' },
      };

      mocks.fetch.mockResponse('/workflows/execute', {
        status: 200,
        body: executionResult,
      });

      const result = await mcpClient.executeWorkflow<typeof complexResult>({
        workflowId: 'data-workflow',
        parameters: { source: 'database', format: 'json' },
        options: {
          priority: 'normal',
        },
      });

      expect(result.result?.data).toHaveLength(2);
      expect(result.result?.summary.totalItems).toBe(2);
    });
  });

  describe('checkServerHealth', () => {
    it('should successfully check server health', async () => {
      const mocks = testEnv.getMocks();
      const healthStatus: HealthStatus = {
        status: 'healthy',
        timestamp: '2024-01-01T12:00:00Z',
        version: '2.1.0',
        uptime: 86400000, // 24 hours
      };

      mocks.fetch.mockResponse('/health', {
        status: 200,
        body: healthStatus,
      });

      const result = await mcpClient.checkServerHealth();

      expect(result).toEqual(healthStatus);
      expect(result.status).toBe('healthy');
      expect(result.version).toBe('2.1.0');
      expect(mocks.fetch.getCallsFor('/health')).toHaveLength(1);
    });

    it('should handle unhealthy server status', async () => {
      const mocks = testEnv.getMocks();
      const unhealthyStatus: HealthStatus = {
        status: 'unhealthy',
        timestamp: '2024-01-01T12:00:00Z',
      };

      mocks.fetch.mockResponse('/health', {
        status: 503,
        body: unhealthyStatus,
      });

      await expect(mcpClient.checkServerHealth()).rejects.toThrow(
        'MCP API request failed: 503'
      );
    });

    it('should handle healthy server with additional info', async () => {
      const mocks = testEnv.getMocks();
      const healthyStatus: HealthStatus = {
        status: 'healthy',
        timestamp: '2024-01-01T12:00:00Z',
        version: '2.1.0',
        uptime: 3600000, // 1 hour
      };

      mocks.fetch.mockResponse('/health', {
        status: 200,
        body: healthyStatus,
      });

      const result = await mcpClient.checkServerHealth();

      expect(result.status).toBe('healthy');
      expect(result.version).toBe('2.1.0');
      expect(result.uptime).toBe(3600000);
    });

    it('should handle network errors gracefully', async () => {
      const mocks = testEnv.getMocks();
      mocks.fetch.mockResponse('/health', {
        status: 500,
        body: 'Network error',
      });

      await expect(mcpClient.checkServerHealth()).rejects.toThrow(
        'MCP API request failed: 500'
      );
    });
  });
});
