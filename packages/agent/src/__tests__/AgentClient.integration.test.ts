import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AgentClient } from '../AgentClient';
import { TestEnvironment } from '../../../testing/src/TestEnvironment';
import { mockApiResponses, mockErrorResponses } from '../../../testing/src/data/mockData';
import type {
  Agent,
  AgentCreatePayload,
  AgentStatusResponse,
  ExecutionResult,
  AgentHistoryResponse,
} from '@symbiont/types';

describe('AgentClient Integration Tests', () => {
  let testEnv: TestEnvironment;
  let agentClient: AgentClient;

  beforeEach(async () => {
    testEnv = new TestEnvironment({
      runtimeApiUrl: 'http://localhost:8080',
      apiKey: 'test-api-key',
    });
    await testEnv.setup();

    const symbiontClient = testEnv.getClient();
    agentClient = symbiontClient.agents;
  });

  afterEach(async () => {
    await testEnv.teardown();
  });

  describe('listAgents', () => {
    it('should successfully list agents', async () => {
      const mocks = testEnv.getMocks();
      mocks.fetch.mockResponse('/agents', {
        status: 200,
        body: mockApiResponses.agents.list,
      });

      const result = await agentClient.listAgents();

      expect(result).toEqual(mockApiResponses.agents.list);
      expect(mocks.fetch.getCallsFor('/agents')).toHaveLength(1);
    });

    it('should handle empty agent list', async () => {
      const mocks = testEnv.getMocks();
      mocks.fetch.mockResponse('/agents', {
        status: 200,
        body: [],
      });

      const result = await agentClient.listAgents();

      expect(result).toEqual([]);
    });

    it('should handle authentication failure', async () => {
      const mocks = testEnv.getMocks();
      mocks.fetch.mockResponse('/agents', {
        status: 401,
        body: mockErrorResponses.unauthorized,
      });

      await expect(agentClient.listAgents()).rejects.toThrow(
        'Agent API request failed: 401'
      );
    });

    it('should handle server error', async () => {
      const mocks = testEnv.getMocks();
      mocks.fetch.mockResponse('/agents', {
        status: 500,
        body: mockErrorResponses.serverError,
      });

      await expect(agentClient.listAgents()).rejects.toThrow(
        'Agent API request failed: 500'
      );
    });
  });

  describe('getAgentStatus', () => {
    const agentId = 'test-agent-id';

    it('should successfully get agent status', async () => {
      const mocks = testEnv.getMocks();
      const mockStatus: AgentStatusResponse = {
        id: agentId,
        status: 'active',
        executionCount: 5,
        lastExecutedAt: '2024-01-01T12:00:00Z',
      };

      mocks.fetch.mockResponse(`/agents/${agentId}/status`, {
        status: 200,
        body: mockStatus,
      });

      const result = await agentClient.getAgentStatus(agentId);

      expect(result).toEqual(mockStatus);
      expect(mocks.fetch.getCallsFor(`/agents/${agentId}/status`)).toHaveLength(1);
    });

    it('should throw error for empty agent ID', async () => {
      await expect(agentClient.getAgentStatus('')).rejects.toThrow(
        'Agent ID is required'
      );
    });

    it('should handle agent not found', async () => {
      const mocks = testEnv.getMocks();
      mocks.fetch.mockResponse(`/agents/${agentId}/status`, {
        status: 404,
        body: mockErrorResponses.notFound,
      });

      await expect(agentClient.getAgentStatus(agentId)).rejects.toThrow(
        'Agent API request failed: 404'
      );
    });
  });

  describe('createAgent', () => {
    const mockAgentPayload: AgentCreatePayload = {
      metadata: {
        version: '1.0.0',
        author: 'test-author',
        description: 'Test agent',
      },
      name: 'test-agent',
      parameters: [],
      returnType: { name: 'string' },
      capabilities: ['chat'],
      policies: [],
      executionConfig: {
        memory: 'ephemeral',
        privacy: 'medium',
        maxRetries: 3,
      },
      dslSource: 'agent TestAgent { ... }',
    };

    it('should successfully create agent', async () => {
      const mocks = testEnv.getMocks();
      const createdAgent: Agent = {
        id: 'new-agent-id',
        definition: mockAgentPayload,
        status: 'pending',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        executionCount: 0,
      };

      mocks.fetch.mockResponse('/agents', {
        status: 201,
        body: createdAgent,
      });

      const result = await agentClient.createAgent(mockAgentPayload);

      expect(result).toEqual(createdAgent);
      
      const calls = mocks.fetch.getCallsFor('/agents');
      expect(calls).toHaveLength(1);
      expect(calls[0].method).toBe('POST');
      expect(JSON.parse(calls[0].body!)).toEqual(mockAgentPayload);
    });

    it('should throw error for empty payload', async () => {
      await expect(agentClient.createAgent(null as any)).rejects.toThrow(
        'Agent definition is required'
      );
    });

    it('should handle validation errors', async () => {
      const mocks = testEnv.getMocks();
      mocks.fetch.mockResponse('/agents', {
        status: 400,
        body: mockErrorResponses.validationError,
      });

      await expect(agentClient.createAgent(mockAgentPayload)).rejects.toThrow(
        'Agent API request failed: 400'
      );
    });
  });

  describe('executeAgent', () => {
    const agentId = 'test-agent-id';
    const parameters = { input: 'test input', mode: 'verbose' };

    it('should successfully execute agent', async () => {
      const mocks = testEnv.getMocks();
      const executionResult: ExecutionResult<string> = {
        executionId: 'exec-123',
        agentId,
        status: 'success',
        result: 'Execution completed successfully',
        startedAt: '2024-01-01T12:00:00Z',
        completedAt: '2024-01-01T12:05:00Z',
        duration: 300000,
        parameters,
      };

      mocks.fetch.mockResponse(`/agents/${agentId}/execute`, {
        status: 200,
        body: executionResult,
      });

      const result = await agentClient.executeAgent(agentId, parameters);

      expect(result).toEqual(executionResult);
      
      const calls = mocks.fetch.getCallsFor(`/agents/${agentId}/execute`);
      expect(calls).toHaveLength(1);
      expect(calls[0].method).toBe('POST');
      expect(JSON.parse(calls[0].body!)).toEqual({ parameters });
    });

    it('should throw error for empty agent ID', async () => {
      await expect(agentClient.executeAgent('', parameters)).rejects.toThrow(
        'Agent ID is required'
      );
    });

    it('should throw error for empty parameters', async () => {
      await expect(agentClient.executeAgent(agentId, null as any)).rejects.toThrow(
        'Execution parameters are required'
      );
    });

    it('should handle execution timeout', async () => {
      const mocks = testEnv.getMocks();
      const timeoutResult: ExecutionResult = {
        executionId: 'exec-timeout',
        agentId,
        status: 'timeout',
        error: 'Execution timed out after 30 seconds',
        startedAt: '2024-01-01T12:00:00Z',
        parameters,
      };

      mocks.fetch.mockResponse(`/agents/${agentId}/execute`, {
        status: 200,
        body: timeoutResult,
      });

      const result = await agentClient.executeAgent(agentId, parameters);

      expect(result.status).toBe('timeout');
      expect(result.error).toContain('timed out');
    });
  });

  describe('getAgentHistory', () => {
    const agentId = 'test-agent-id';

    it('should successfully get agent history with default pagination', async () => {
      const mocks = testEnv.getMocks();
      const historyResponse: AgentHistoryResponse = {
        agentId,
        executions: [
          {
            executionId: 'exec-1',
            agentId,
            status: 'success',
            result: 'First execution',
            startedAt: '2024-01-01T10:00:00Z',
            completedAt: '2024-01-01T10:05:00Z',
            duration: 300000,
            parameters: { input: 'test1' },
          },
        ],
        totalCount: 1,
        page: 1,
        pageSize: 20,
      };

      mocks.fetch.mockResponse(`/agents/${agentId}/history?page=1&pageSize=20`, {
        status: 200,
        body: historyResponse,
      });

      const result = await agentClient.getAgentHistory(agentId);

      expect(result).toEqual(historyResponse);
      expect(result.executions).toHaveLength(1);
    });

    it('should throw error for empty agent ID', async () => {
      await expect(agentClient.getAgentHistory('')).rejects.toThrow(
        'Agent ID is required'
      );
    });
  });
});