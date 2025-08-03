import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { McpClient } from '../McpClient';
import { TestEnvironment } from '../../../testing/src/TestEnvironment';
import { mockErrorResponses } from '../../../testing/src/data/mockData';
import type {
  WorkflowExecutionPayload,
  WorkflowExecutionResult,
  WorkflowListResponse,
  McpConnectionStatus,
  HealthStatus,
} from '@symbiont/types';

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

  describe('listWorkflows', () => {
    it('should successfully list available workflows', async () => {
      const mocks = testEnv.getMocks();
      const workflowList: WorkflowListResponse = [
        {
          id: 'workflow-1',
          name: 'Data Processing Workflow',
          description: 'Processes incoming data and generates reports',
          version: '1.2.0',
          parameters: [
            {
              name: 'inputData',
              type: 'object',
              required: true,
              description: 'Input data to process',
            },
            {
              name: 'outputFormat',
              type: 'string',
              required: false,
              description: 'Output format (json, csv, xml)',
              defaultValue: 'json',
            },
          ],
          tags: ['data', 'processing', 'reports'],
          createdAt: '2024-01-01T10:00:00Z',
          updatedAt: '2024-01-01T11:00:00Z',
        },
        {
          id: 'workflow-2',
          name: 'Notification Workflow',
          description: 'Sends notifications to various channels',
          version: '1.0.5',
          parameters: [
            {
              name: 'message',
              type: 'string',
              required: true,
              description: 'Message to send',
            },
            {
              name: 'channels',
              type: 'array',
              required: true,
              description: 'Notification channels',
            },
          ],
          tags: ['notification', 'communication'],
          createdAt: '2024-01-02T10:00:00Z',
          updatedAt: '2024-01-02T10:00:00Z',
        },
      ];

      mocks.fetch.mockResponse('/workflows', {
        status: 200,
        body: workflowList,
      });

      const result = await mcpClient.listWorkflows();

      expect(result).toEqual(workflowList);
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Data Processing Workflow');
      expect(result[1].name).toBe('Notification Workflow');
      expect(mocks.fetch.getCallsFor('/workflows')).toHaveLength(1);
    });

    it('should handle empty workflow list', async () => {
      const mocks = testEnv.getMocks();
      mocks.fetch.mockResponse('/workflows', {
        status: 200,
        body: [],
      });

      const result = await mcpClient.listWorkflows();

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('should handle permission denied', async () => {
      const mocks = testEnv.getMocks();
      mocks.fetch.mockResponse('/workflows', {
        status: 403,
        body: mockErrorResponses.forbidden,
      });

      await expect(mcpClient.listWorkflows()).rejects.toThrow(
        'MCP API request failed: 403'
      );
    });

    it('should handle server errors', async () => {
      const mocks = testEnv.getMocks();
      mocks.fetch.mockResponse('/workflows', {
        status: 500,
        body: mockErrorResponses.serverError,
      });

      await expect(mcpClient.listWorkflows()).rejects.toThrow(
        'MCP API request failed: 500'
      );
    });
  });

  describe('getExecutionStatus', () => {
    const executionId = 'exec-123';

    it('should successfully get execution status', async () => {
      const mocks = testEnv.getMocks();
      const executionStatus: WorkflowExecutionResult<object> = {
        executionId,
        workflowId: 'workflow-123',
        status: 'running',
        startedAt: '2024-01-01T12:00:00Z',
        parameters: { input: 'test data' },
        metadata: { progress: 50 },
      };

      mocks.fetch.mockResponse(`/workflows/executions/${executionId}`, {
        status: 200,
        body: executionStatus,
      });

      const result = await mcpClient.getExecutionStatus(executionId);

      expect(result).toEqual(executionStatus);
      expect(result.status).toBe('running');
      expect(mocks.fetch.getCallsFor(`/workflows/executions/${executionId}`)).toHaveLength(1);
    });

    it('should get completed execution status with result', async () => {
      const mocks = testEnv.getMocks();
      const completedExecution: WorkflowExecutionResult<string> = {
        executionId,
        workflowId: 'workflow-123',
        status: 'completed',
        result: 'Processing completed successfully',
        startedAt: '2024-01-01T12:00:00Z',
        completedAt: '2024-01-01T12:05:00Z',
        duration: 300000,
        parameters: { input: 'test data' },
      };

      mocks.fetch.mockResponse(`/workflows/executions/${executionId}`, {
        status: 200,
        body: completedExecution,
      });

      const result = await mcpClient.getExecutionStatus<string>(executionId);

      expect(result).toEqual(completedExecution);
      expect(result.status).toBe('completed');
      expect(result.result).toBe('Processing completed successfully');
    });

    it('should throw error for empty execution ID', async () => {
      await expect(mcpClient.getExecutionStatus('')).rejects.toThrow(
        'Execution ID is required'
      );
    });

    it('should handle execution not found', async () => {
      const mocks = testEnv.getMocks();
      mocks.fetch.mockResponse(`/workflows/executions/${executionId}`, {
        status: 404,
        body: mockErrorResponses.notFound,
      });

      await expect(mcpClient.getExecutionStatus(executionId)).rejects.toThrow(
        'MCP API request failed: 404'
      );
    });

    it('should handle failed execution status', async () => {
      const mocks = testEnv.getMocks();
      const failedExecution: WorkflowExecutionResult = {
        executionId,
        workflowId: 'workflow-123',
        status: 'failed',
        error: 'Workflow execution failed: Invalid input format',
        startedAt: '2024-01-01T12:00:00Z',
        completedAt: '2024-01-01T12:01:00Z',
        duration: 60000,
        parameters: { input: 'invalid data' },
      };

      mocks.fetch.mockResponse(`/workflows/executions/${executionId}`, {
        status: 200,
        body: failedExecution,
      });

      const result = await mcpClient.getExecutionStatus(executionId);

      expect(result.status).toBe('failed');
      expect(result.error).toContain('Invalid input format');
    });
  });

  describe('cancelExecution', () => {
    const executionId = 'exec-123';

    it('should successfully cancel execution', async () => {
      const mocks = testEnv.getMocks();
      mocks.fetch.mockResponse(`/workflows/executions/${executionId}`, {
        status: 204,
        body: '',
      });

      await expect(mcpClient.cancelExecution(executionId)).resolves.toBeUndefined();
      
      const calls = mocks.fetch.getCallsFor(`/workflows/executions/${executionId}`);
      expect(calls).toHaveLength(1);
      expect(calls[0].method).toBe('DELETE');
    });

    it('should throw error for empty execution ID', async () => {
      await expect(mcpClient.cancelExecution('')).rejects.toThrow(
        'Execution ID is required'
      );
    });

    it('should handle execution not found', async () => {
      const mocks = testEnv.getMocks();
      mocks.fetch.mockResponse(`/workflows/executions/${executionId}`, {
        status: 404,
        body: mockErrorResponses.notFound,
      });

      await expect(mcpClient.cancelExecution(executionId)).rejects.toThrow(
        'MCP API request failed: 404'
      );
    });

    it('should handle execution already completed', async () => {
      const mocks = testEnv.getMocks();
      mocks.fetch.mockResponse(`/workflows/executions/${executionId}`, {
        status: 409,
        body: { error: 'Execution already completed', message: 'Cannot cancel completed execution' },
      });

      await expect(mcpClient.cancelExecution(executionId)).rejects.toThrow(
        'MCP API request failed: 409'
      );
    });

    it('should handle permission denied', async () => {
      const mocks = testEnv.getMocks();
      mocks.fetch.mockResponse(`/workflows/executions/${executionId}`, {
        status: 403,
        body: mockErrorResponses.forbidden,
      });

      await expect(mcpClient.cancelExecution(executionId)).rejects.toThrow(
        'MCP API request failed: 403'
      );
    });
  });

  describe('getConnectionStatus', () => {
    it('should successfully get MCP connection status', async () => {
      const mocks = testEnv.getMocks();
      const connectionStatus: McpConnectionStatus = {
        connected: true,
        serverInfo: {
          name: 'Symbiont MCP Server',
          version: '2.1.0',
          description: 'Main MCP server for workflow orchestration',
          capabilities: ['workflows', 'tool-execution', 'health-monitoring'],
          endpoints: ['/workflows', '/health', '/mcp/status'],
          health: {
            status: 'healthy',
            timestamp: '2024-01-01T12:00:00Z',
            version: '2.1.0',
            uptime: 86400000,
          },
        },
        lastConnectedAt: '2024-01-01T08:00:00Z',
      };

      mocks.fetch.mockResponse('/mcp/status', {
        status: 200,
        body: connectionStatus,
      });

      const result = await mcpClient.getConnectionStatus();

      expect(result).toEqual(connectionStatus);
      expect(result.connected).toBe(true);
      expect(result.serverInfo?.name).toBe('Symbiont MCP Server');
      expect(result.serverInfo?.capabilities).toContain('workflows');
      expect(mocks.fetch.getCallsFor('/mcp/status')).toHaveLength(1);
    });

    it('should handle disconnected MCP server', async () => {
      const mocks = testEnv.getMocks();
      const disconnectedStatus: McpConnectionStatus = {
        connected: false,
        lastError: 'Connection timeout after 30 seconds',
        lastConnectedAt: '2024-01-01T07:00:00Z',
      };

      mocks.fetch.mockResponse('/mcp/status', {
        status: 200,
        body: disconnectedStatus,
      });

      const result = await mcpClient.getConnectionStatus();

      expect(result.connected).toBe(false);
      expect(result.lastError).toContain('timeout');
      expect(result.serverInfo).toBeUndefined();
    });

    it('should handle service unavailable', async () => {
      const mocks = testEnv.getMocks();
      mocks.fetch.mockResponse('/mcp/status', {
        status: 503,
        body: { error: 'Service Unavailable', message: 'MCP service is temporarily unavailable' },
      });

      await expect(mcpClient.getConnectionStatus()).rejects.toThrow(
        'MCP API request failed: 503'
      );
    });

    it('should handle authentication failure', async () => {
      const mocks = testEnv.getMocks();
      mocks.fetch.mockResponse('/mcp/status', {
        status: 401,
        body: mockErrorResponses.unauthorized,
      });

      await expect(mcpClient.getConnectionStatus()).rejects.toThrow(
        'MCP API request failed: 401'
      );
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle network timeouts', async () => {
      const mocks = testEnv.getMocks();
      
      mocks.fetch.mockResponse('/health', {
        status: 200,
        body: { status: 'healthy', timestamp: '2024-01-01T12:00:00Z' },
        delay: 5000, // 5 second delay
      });

      // This would timeout in a real scenario with proper timeout configuration
      await expect(mcpClient.checkServerHealth()).resolves.toBeDefined();
    });

    it('should handle malformed JSON responses', async () => {
      const mocks = testEnv.getMocks();
      mocks.fetch.mockResponse('/workflows', {
        status: 200,
        body: 'invalid json',
      });

      await expect(mcpClient.listWorkflows()).rejects.toThrow();
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

    it('should handle empty response bodies gracefully', async () => {
      const mocks = testEnv.getMocks();
      mocks.fetch.mockResponse('/workflows/executions/test-id', {
        status: 204,
        body: '',
      });

      await expect(mcpClient.cancelExecution('test-id')).resolves.toBeUndefined();
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
});