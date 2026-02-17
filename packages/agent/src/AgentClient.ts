import {
  Agent,
  AgentCreatePayload,
  AgentUpdatePayload,
  AgentStatusResponse,
  ExecutionResult,
  AgentHistoryResponse,
  AgentListResponse,
  ExecutionOptions,
  RequestOptions,
  SymbiontConfig,
} from '@symbi/types';

/**
 * Simple interface to avoid circular dependency with SymbiontClient
 */
interface ClientDependency {
  getAuthHeaders(endpoint: string): Promise<Record<string, string>>;
  configuration: Readonly<SymbiontConfig>;
}

/**
 * Client for managing agents via the Symbiont Runtime API
 */
export class AgentClient {
  private client: ClientDependency;

  constructor(client: ClientDependency) {
    this.client = client;
  }

  /**
   * List all agents
   * GET /agents
   */
  async listAgents(): Promise<AgentListResponse> {
    return this.makeRequest<AgentListResponse>('/agents', {
      method: 'GET',
    });
  }

  /**
   * Get agent status by ID
   * GET /agents/{id}/status
   */
  async getAgentStatus(agentId: string): Promise<AgentStatusResponse> {
    if (!agentId) {
      throw new Error('Agent ID is required');
    }
    
    return this.makeRequest<AgentStatusResponse>(`/agents/${agentId}/status`, {
      method: 'GET',
    });
  }

  /**
   * Create a new agent
   * POST /agents
   */
  async createAgent(agent: AgentCreatePayload): Promise<Agent> {
    if (!agent) {
      throw new Error('Agent definition is required');
    }

    return this.makeRequest<Agent>('/agents', {
      method: 'POST',
      body: agent,
    });
  }

  /**
   * Update an existing agent
   * PUT /agents/{id}
   */
  async updateAgent(agentId: string, agent: AgentUpdatePayload): Promise<Agent> {
    if (!agentId) {
      throw new Error('Agent ID is required');
    }
    if (!agent) {
      throw new Error('Agent update data is required');
    }

    return this.makeRequest<Agent>(`/agents/${agentId}`, {
      method: 'PUT',
      body: agent,
    });
  }

  /**
   * Delete an agent
   * DELETE /agents/{id}
   */
  async deleteAgent(agentId: string): Promise<void> {
    if (!agentId) {
      throw new Error('Agent ID is required');
    }

    await this.makeRequest<void>(`/agents/${agentId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Execute an agent with parameters
   * POST /agents/{id}/execute
   */
  async executeAgent<T = unknown>(
    agentId: string,
    params: Record<string, unknown>,
    options?: ExecutionOptions
  ): Promise<ExecutionResult<T>> {
    if (!agentId) {
      throw new Error('Agent ID is required');
    }
    if (!params) {
      throw new Error('Execution parameters are required');
    }

    const requestBody = {
      parameters: params,
      ...(options || {}),
    };

    return this.makeRequest<ExecutionResult<T>>(`/agents/${agentId}/execute`, {
      method: 'POST',
      body: requestBody,
    });
  }

  /**
   * Get agent execution history
   * GET /agents/{id}/history
   */
  async getAgentHistory(
    agentId: string,
    page = 1,
    pageSize = 20
  ): Promise<AgentHistoryResponse> {
    if (!agentId) {
      throw new Error('Agent ID is required');
    }

    const queryParams = new URLSearchParams({
      page: page.toString(),
      pageSize: pageSize.toString(),
    });

    return this.makeRequest<AgentHistoryResponse>(
      `/agents/${agentId}/history?${queryParams}`,
      {
        method: 'GET',
      }
    );
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
          `Agent API request failed: ${response.status} ${response.statusText}. ${errorText}`
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
        throw new Error(`AgentClient request failed: ${error.message}`);
      }
      throw new Error('AgentClient request failed: Unknown error');
    }
  }
}