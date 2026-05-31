import {
  WorkflowExecutionPayload,
  WorkflowExecutionResult,
  HealthStatus,
  RequestOptions,
  SymbiontConfig,
} from 'symbi-types';
import { buildRuntimeUrl } from './urlUtils';

/**
 * Simple interface to avoid circular dependency with SymbiontClient
 */
interface ClientDependency {
  getAuthHeaders(endpoint: string): Promise<Record<string, string>>;
  configuration: Readonly<SymbiontConfig>;
}

/**
 * Client for executing workflows against the Symbiont Runtime API.
 *
 * The open-source Symbiont runtime (v1.14.3) exposes `POST /workflows/execute`
 * and the health endpoints under a single `/api/v1` version segment. It does NOT
 * expose `/workflows` (list), `/workflows/executions/*`, or `/mcp/*` routes, so
 * those phantom methods have been removed.
 */
export class McpClient {
  private client: ClientDependency;

  constructor(client: ClientDependency) {
    this.client = client;
  }

  /**
   * Execute a workflow with parameters
   * POST /api/v1/workflows/execute
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
   * GET /api/v1/health
   */
  async checkServerHealth(): Promise<HealthStatus> {
    return this.makeRequest<HealthStatus>('/health', {
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

      // Build the full URL, guaranteeing exactly one /api/v1 segment.
      const config = this.client.configuration;
      const fullUrl = buildRuntimeUrl(config.runtimeApiUrl, endpoint);

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
