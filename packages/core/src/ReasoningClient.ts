import type {
  CedarPolicy,
  CircuitBreakerStatus,
  JournalEntry,
  LoopDecision,
  LoopState,
  ProposedAction,
  RequestOptions,
  RunReasoningLoopRequest,
  RunReasoningLoopResponse,
  SymbiontConfig,
} from '@symbi/types';

/**
 * Minimal interface to avoid circular dependency with SymbiontClient.
 */
interface ClientDependency {
  getAuthHeaders(endpoint: string): Promise<Record<string, string>>;
  configuration: Readonly<SymbiontConfig>;
}

/**
 * Client for reasoning loop, journal, Cedar policy, circuit breaker,
 * and knowledge bridge operations.
 *
 * Accessed via `client.reasoning`:
 * ```ts
 * const response = await client.reasoning.runLoop(agentId, request);
 * ```
 */
export class ReasoningClient {
  private client: ClientDependency;

  constructor(client: ClientDependency) {
    this.client = client;
  }

  // ---------------------------------------------------------------------------
  // Reasoning Loop
  // ---------------------------------------------------------------------------

  /** Start a reasoning loop. POST /api/v1/agents/{agentId}/reasoning/loop */
  async runLoop(agentId: string, request: RunReasoningLoopRequest): Promise<RunReasoningLoopResponse> {
    return this.makeRequest<RunReasoningLoopResponse>(
      `/api/v1/agents/${agentId}/reasoning/loop`,
      { method: 'POST', body: request },
    );
  }

  /** Get loop status. GET /api/v1/agents/{agentId}/reasoning/loop/{loopId} */
  async getLoopStatus(agentId: string, loopId: string): Promise<LoopState> {
    return this.makeRequest<LoopState>(
      `/api/v1/agents/${agentId}/reasoning/loop/${loopId}`,
      { method: 'GET' },
    );
  }

  /** Cancel a running loop. DELETE /api/v1/agents/{agentId}/reasoning/loop/{loopId} */
  async cancelLoop(agentId: string, loopId: string): Promise<void> {
    await this.makeRequest<void>(
      `/api/v1/agents/${agentId}/reasoning/loop/${loopId}`,
      { method: 'DELETE' },
    );
  }

  // ---------------------------------------------------------------------------
  // Journal
  // ---------------------------------------------------------------------------

  /** Get journal entries. GET /api/v1/agents/{agentId}/reasoning/journal */
  async getJournalEntries(
    agentId: string,
    opts?: { fromSequence?: number; limit?: number },
  ): Promise<JournalEntry[]> {
    const params = new URLSearchParams();
    if (opts?.fromSequence !== undefined) params.set('from_sequence', String(opts.fromSequence));
    if (opts?.limit !== undefined) params.set('limit', String(opts.limit));
    const qs = params.toString();
    const endpoint = `/api/v1/agents/${agentId}/reasoning/journal${qs ? `?${qs}` : ''}`;
    return this.makeRequest<JournalEntry[]>(endpoint, { method: 'GET' });
  }

  /** Compact journal entries. POST /api/v1/agents/{agentId}/reasoning/journal/compact */
  async compactJournal(agentId: string): Promise<{ deleted: number }> {
    return this.makeRequest<{ deleted: number }>(
      `/api/v1/agents/${agentId}/reasoning/journal/compact`,
      { method: 'POST' },
    );
  }

  // ---------------------------------------------------------------------------
  // Cedar Policies
  // ---------------------------------------------------------------------------

  /** List Cedar policies. GET /api/v1/agents/{agentId}/reasoning/cedar */
  async listCedarPolicies(agentId: string): Promise<CedarPolicy[]> {
    return this.makeRequest<CedarPolicy[]>(
      `/api/v1/agents/${agentId}/reasoning/cedar`,
      { method: 'GET' },
    );
  }

  /** Add a Cedar policy. POST /api/v1/agents/{agentId}/reasoning/cedar */
  async addCedarPolicy(agentId: string, policy: CedarPolicy): Promise<void> {
    await this.makeRequest<void>(
      `/api/v1/agents/${agentId}/reasoning/cedar`,
      { method: 'POST', body: policy },
    );
  }

  /** Remove a Cedar policy. DELETE /api/v1/agents/{agentId}/reasoning/cedar/{policyName} */
  async removeCedarPolicy(agentId: string, policyName: string): Promise<boolean> {
    const result = await this.makeRequest<{ removed: boolean }>(
      `/api/v1/agents/${agentId}/reasoning/cedar/${encodeURIComponent(policyName)}`,
      { method: 'DELETE' },
    );
    return result.removed;
  }

  /** Evaluate a Cedar policy. POST /api/v1/agents/{agentId}/reasoning/cedar/evaluate */
  async evaluateCedarPolicy(agentId: string, action: ProposedAction): Promise<LoopDecision> {
    return this.makeRequest<LoopDecision>(
      `/api/v1/agents/${agentId}/reasoning/cedar/evaluate`,
      { method: 'POST', body: action },
    );
  }

  // ---------------------------------------------------------------------------
  // Circuit Breakers
  // ---------------------------------------------------------------------------

  /** Get circuit breaker status. GET /api/v1/agents/{agentId}/reasoning/circuit-breakers */
  async getCircuitBreakerStatus(agentId: string): Promise<Record<string, CircuitBreakerStatus>> {
    return this.makeRequest<Record<string, CircuitBreakerStatus>>(
      `/api/v1/agents/${agentId}/reasoning/circuit-breakers`,
      { method: 'GET' },
    );
  }

  /** Reset a circuit breaker. POST /api/v1/agents/{agentId}/reasoning/circuit-breakers/{toolName}/reset */
  async resetCircuitBreaker(agentId: string, toolName: string): Promise<void> {
    await this.makeRequest<void>(
      `/api/v1/agents/${agentId}/reasoning/circuit-breakers/${encodeURIComponent(toolName)}/reset`,
      { method: 'POST' },
    );
  }

  // ---------------------------------------------------------------------------
  // Knowledge Bridge
  // ---------------------------------------------------------------------------

  /** Recall knowledge. POST /api/v1/agents/{agentId}/reasoning/knowledge/recall */
  async recallKnowledge(agentId: string, query: string, limit?: number): Promise<string[]> {
    return this.makeRequest<string[]>(
      `/api/v1/agents/${agentId}/reasoning/knowledge/recall`,
      { method: 'POST', body: { query, limit: limit ?? 5 } },
    );
  }

  /** Store knowledge. POST /api/v1/agents/{agentId}/reasoning/knowledge/store */
  async storeKnowledge(
    agentId: string,
    subject: string,
    predicate: string,
    object: string,
    confidence?: number,
  ): Promise<{ id: string }> {
    return this.makeRequest<{ id: string }>(
      `/api/v1/agents/${agentId}/reasoning/knowledge/store`,
      {
        method: 'POST',
        body: { subject, predicate, object, confidence: confidence ?? 0.8 },
      },
    );
  }

  // ---------------------------------------------------------------------------
  // Internal
  // ---------------------------------------------------------------------------

  private async makeRequest<T>(endpoint: string, options: RequestOptions): Promise<T> {
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
        `Reasoning API request failed: ${response.status} ${response.statusText}. ${errorText}`,
      );
    }

    // Some endpoints return no body (204)
    if (response.status === 204) {
      return undefined as unknown as T;
    }

    const data = await response.json();
    return data as T;
  }
}
