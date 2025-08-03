import {
  WorkflowExecutionPayload,
  WorkflowExecutionResult,
  WorkflowListResponse,
  McpConnectionStatus,
} from '../../types/src/mcp';
import {
  HealthStatus,
  RequestOptions,
  SymbiontConfig,
} from '@symbiont/types';

/**
 * Simple interface to avoid circular dependency with SymbiontClient
 */
interface ClientDependency {
  getAuthHeaders(endpoint: string): Promise<Record<string, string>>;
  configuration: Readonly<SymbiontConfig>;
}

/**
 * Client for managing workflows and MCP operations via the Symbiont Runtime API
 */
export class McpClient {
  private client: ClientDependency;

  constructor(client: ClientDependency) {
    this.client = client;
  }

  /**
   * Execute a workflow with parameters
   * POST /workflows/execute
   */
  async executeWorkflow<T = unknown>(
    payload: WorkflowExecutionPayload
  ): Promise<WorkflowExecutionResult<T>> {
    if (!payload) {
      throw new Error('Workflow execution payload is required');
    }
    if (!payload.workflowId) {
      throw new Error('Workflow ID is required');
    }
    if (!payload.parameters) {
      throw new Error('Workflow parameters are required');
    }

    return this.makeRequest<WorkflowExecutionResult<T>>('/workflows/execute', {
      method: 'POST',
      body: payload,
    });
  }

  /**
   * Check server health status
   * GET /health
   */
  async checkServerHealth(): Promise<HealthStatus> {
    return this.makeRequest<HealthStatus>('/health', {
      method: 'GET',
    });
  }

  /**
   * List available workflows
   * GET /workflows
   */
  async listWorkflows(): Promise<WorkflowListResponse> {
    return this.makeRequest<WorkflowListResponse>('/workflows', {
      method: 'GET',
    });
  }

  /**
   * Get workflow execution status
   * GET /workflows/executions/{executionId}
   */
  async getExecutionStatus<T = unknown>(
    executionId: string
  ): Promise<WorkflowExecutionResult<T>> {
    if (!executionId) {
      throw new Error('Execution ID is required');
    }

    return this.makeRequest<WorkflowExecutionResult<T>>(
      `/workflows/executions/${executionId}`,
      {
        method: 'GET',
      }
    );
  }

  /**
   * Cancel a workflow execution
   * DELETE /workflows/executions/{executionId}
   */
  async cancelExecution(executionId: string): Promise<void> {
    if (!executionId) {
      throw new Error('Execution ID is required');
    }

    await this.makeRequest<void>(`/workflows/executions/${executionId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Get MCP connection status
   * GET /mcp/status
   */
  async getConnectionStatus(): Promise<McpConnectionStatus> {
    return this.makeRequest<McpConnectionStatus>('/mcp/status', {
      method: 'GET',
    });
  }

  /**
   * Make an HTTP request using the underlying client
   */
  private async makeRequest<T>(
    endpoint: string,
    options: RequestOptions
  ): Promise<T> {
    try {
      // Get authentication headers from the parent client
      const authHeaders = await this.client.getAuthHeaders(endpoint);
      
      // Build the full URL
      const config = this.client.configuration;
      const baseUrl = config.runtimeApiUrl;
      const fullUrl = `${baseUrl}${endpoint}`;

      // Prepare headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...authHeaders,
        ...(options.headers || {}),
      };

      // Prepare fetch options
      const fetchOptions: RequestInit = {
        method: options.method || 'GET',
        headers,
        ...(options.timeout && { signal: AbortSignal.timeout(options.timeout) }),
      };

      // Add body for non-GET requests
      if (options.body && options.method !== 'GET') {
        fetchOptions.body = JSON.stringify(options.body);
      }

      // Make the request
      const response = await fetch(fullUrl, fetchOptions);

      // Handle response
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `MCP API request failed: ${response.status} ${response.statusText}. ${errorText}`
        );
      }

      // Return empty for DELETE requests
      if (options.method === 'DELETE') {
        return undefined as T;
      }

      // Parse JSON response
      const data = await response.json();
      return data as T;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`McpClient request failed: ${error.message}`);
      }
      throw new Error('McpClient request failed: Unknown error');
    }
  }
}