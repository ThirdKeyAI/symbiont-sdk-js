import {
  RequestOptions,
  SymbiontConfig,
  WorkflowExecutionRequest,
} from '@symbiont/types';

/**
 * Simple interface to avoid circular dependency with SymbiontClient
 */
interface ClientDependency {
  getAuthHeaders(endpoint: string): Promise<Record<string, string>>;
  configuration: Readonly<SymbiontConfig>;
}

/**
 * Client for executing workflows via the Symbiont Runtime API
 */
export class WorkflowClient {
  private client: ClientDependency;

  constructor(client: ClientDependency) {
    this.client = client;
  }

  /**
   * Execute a workflow
   * POST /workflows/execute
   */
  async executeWorkflow(
    request: WorkflowExecutionRequest
  ): Promise<Record<string, unknown>> {
    if (!request) {
      throw new Error('Workflow execution request is required');
    }
    if (!request.workflow_id) {
      throw new Error('Workflow ID is required');
    }

    return this.makeRequest<Record<string, unknown>>('/workflows/execute', {
      method: 'POST',
      body: request,
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
      const authHeaders = await this.client.getAuthHeaders(endpoint);
      const config = this.client.configuration;
      const baseUrl = config.runtimeApiUrl;
      const fullUrl = `${baseUrl}${endpoint}`;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...authHeaders,
        ...(options.headers || {}),
      };

      const fetchOptions: RequestInit = {
        method: options.method || 'GET',
        headers,
        ...(options.timeout && { signal: AbortSignal.timeout(options.timeout) }),
      };

      if (options.body && options.method !== 'GET') {
        fetchOptions.body = JSON.stringify(options.body);
      }

      const response = await fetch(fullUrl, fetchOptions);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Workflow API request failed: ${response.status} ${response.statusText}. ${errorText}`
        );
      }

      const data = await response.json();
      return data as T;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`WorkflowClient request failed: ${error.message}`);
      }
      throw new Error('WorkflowClient request failed: Unknown error');
    }
  }
}
