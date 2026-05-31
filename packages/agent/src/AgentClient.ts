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
} from 'symbi-types';
import { buildRuntimeUrl } from './urlUtils';

/**
 * Message payload for sending a message to an agent.
 */
export interface SendMessageRequest {
  /** Identifier of the sender (agent or user). */
  sender: string;
  /** Arbitrary message payload. */
  payload: unknown;
  /** Optional time-to-live in seconds. */
  ttlSeconds?: number;
  /** Optional topic/subject for the message. */
  topic?: string;
  /** Optional AgentPin JWT for authenticated delivery. */
  agentpinJwt?: string;
}

/**
 * Response returned when a message is accepted for delivery.
 */
export interface SendMessageResponse {
  message_id: string;
  status: string;
}

/**
 * Response returned when polling an agent's inbox.
 */
export interface ReceiveMessagesResponse {
  messages: unknown[];
}

/**
 * Status of a previously sent message.
 */
export interface MessageStatusResponse {
  message_id: string;
  status: string;
}

/**
 * Lifecycle state of an agent for heartbeat reporting.
 * PascalCase values mirror the runtime's agent state machine.
 */
export type AgentLifecycleState =
  | 'Created'
  | 'Ready'
  | 'Running'
  | 'Suspended'
  | 'Completed'
  | 'Failed'
  | 'Terminated'
  | (string & {});

/**
 * Heartbeat payload reporting agent liveness and state.
 */
export interface HeartbeatRequest {
  /** Current lifecycle state (PascalCase, e.g. Running/Completed/Failed). */
  state: AgentLifecycleState;
  /** Optional arbitrary metadata. */
  metadata?: Record<string, unknown>;
  /** Optional result of the last run. */
  lastResult?: unknown;
  /** Optional AgentPin JWT for authentication. */
  agentpinJwt?: string;
}

/**
 * Event type for run lifecycle events.
 */
export type AgentEventType =
  | 'RunStarted'
  | 'RunCompleted'
  | 'RunFailed'
  | (string & {});

/**
 * Event payload pushed to an agent's event stream.
 */
export interface PushEventRequest {
  /** Event type (e.g. RunStarted/RunCompleted/RunFailed). */
  eventType: AgentEventType;
  /** Arbitrary event payload. */
  payload: unknown;
  /** Optional AgentPin JWT for authentication. */
  agentpinJwt?: string;
}

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
   * Send a message to an agent's inbox
   * POST /agents/{id}/messages
   */
  async sendMessage(
    agentId: string,
    request: SendMessageRequest
  ): Promise<SendMessageResponse> {
    if (!agentId) {
      throw new Error('Agent ID is required');
    }
    if (!request) {
      throw new Error('Message request is required');
    }

    const body: Record<string, unknown> = {
      sender: request.sender,
      payload: request.payload,
    };
    if (request.ttlSeconds !== undefined) {
      body.ttl_seconds = request.ttlSeconds;
    }
    if (request.topic !== undefined) {
      body.topic = request.topic;
    }
    if (request.agentpinJwt !== undefined) {
      body.agentpin_jwt = request.agentpinJwt;
    }

    return this.makeRequest<SendMessageResponse>(`/agents/${agentId}/messages`, {
      method: 'POST',
      body,
    });
  }

  /**
   * Receive pending messages for an agent
   * GET /agents/{id}/messages
   */
  async receiveMessages(agentId: string): Promise<ReceiveMessagesResponse> {
    if (!agentId) {
      throw new Error('Agent ID is required');
    }

    return this.makeRequest<ReceiveMessagesResponse>(
      `/agents/${agentId}/messages`,
      {
        method: 'GET',
      }
    );
  }

  /**
   * Get the delivery status of a previously sent message
   * GET /messages/{id}/status
   */
  async getMessageStatus(messageId: string): Promise<MessageStatusResponse> {
    if (!messageId) {
      throw new Error('Message ID is required');
    }

    return this.makeRequest<MessageStatusResponse>(
      `/messages/${messageId}/status`,
      {
        method: 'GET',
      }
    );
  }

  /**
   * Report an agent heartbeat
   * POST /agents/{id}/heartbeat
   */
  async sendHeartbeat(
    agentId: string,
    request: HeartbeatRequest
  ): Promise<void> {
    if (!agentId) {
      throw new Error('Agent ID is required');
    }
    if (!request) {
      throw new Error('Heartbeat request is required');
    }

    const body: Record<string, unknown> = {
      state: request.state,
    };
    if (request.metadata !== undefined) {
      body.metadata = request.metadata;
    }
    if (request.lastResult !== undefined) {
      body.last_result = request.lastResult;
    }
    if (request.agentpinJwt !== undefined) {
      body.agentpin_jwt = request.agentpinJwt;
    }

    await this.makeRequest<void>(`/agents/${agentId}/heartbeat`, {
      method: 'POST',
      body,
    });
  }

  /**
   * Push a run lifecycle event for an agent
   * POST /agents/{id}/events
   */
  async pushEvent(agentId: string, request: PushEventRequest): Promise<void> {
    if (!agentId) {
      throw new Error('Agent ID is required');
    }
    if (!request) {
      throw new Error('Event request is required');
    }

    const body: Record<string, unknown> = {
      event_type: request.eventType,
      payload: request.payload,
    };
    if (request.agentpinJwt !== undefined) {
      body.agentpin_jwt = request.agentpinJwt;
    }

    await this.makeRequest<void>(`/agents/${agentId}/events`, {
      method: 'POST',
      body,
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
      
      // Build the full URL with exactly one /api/v1 prefix
      const config = this.client.configuration;
      const baseUrl = config.runtimeApiUrl;
      const fullUrl = buildRuntimeUrl(baseUrl, endpoint);

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

      // Parse JSON response, tolerating empty bodies (e.g. 204 No Content)
      const text = await response.text();
      if (!text) {
        return undefined as T;
      }
      return JSON.parse(text) as T;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`AgentClient request failed: ${error.message}`);
      }
      throw new Error('AgentClient request failed: Unknown error');
    }
  }
}