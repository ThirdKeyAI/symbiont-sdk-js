import type { SymbiontConfig } from '@symbi/types';
import type { RequestOptions } from '@symbi/types';

/**
 * Minimal interface to avoid circular dependency with SymbiontClient.
 */
interface ClientDependency {
  getAuthHeaders(endpoint: string): Promise<Record<string, string>>;
  configuration: Readonly<SymbiontConfig>;
}

export interface CommunicationRule {
  id?: string;
  fromAgent: string;
  toAgent: string;
  action: string;
  effect: 'allow' | 'deny';
  reason?: string;
  priority?: number;
  maxDepth?: number;
}

export interface CommunicationEvaluation {
  allowed: boolean;
  rule?: CommunicationRule;
  reason: string;
}

/**
 * Client for the CommunicationPolicyGate API — managing inter-agent
 * communication rules and evaluating message routing decisions.
 *
 * Accessed via `client.communication`:
 * ```ts
 * const rules = await client.communication.listRules();
 * const result = await client.communication.evaluate('agentA', 'agentB', 'send_message');
 * ```
 */
export class CommunicationClient {
  private client: ClientDependency;

  constructor(client: ClientDependency) {
    this.client = client;
  }

  /** List all communication rules. GET /api/v1/communication/rules */
  async listRules(): Promise<CommunicationRule[]> {
    return this.makeRequest<CommunicationRule[]>(
      '/api/v1/communication/rules',
      { method: 'GET' },
    );
  }

  /** Add a communication rule. POST /api/v1/communication/rules */
  async addRule(rule: Omit<CommunicationRule, 'id'>): Promise<CommunicationRule> {
    return this.makeRequest<CommunicationRule>(
      '/api/v1/communication/rules',
      { method: 'POST', body: rule },
    );
  }

  /** Remove a communication rule. DELETE /api/v1/communication/rules/{ruleId} */
  async removeRule(ruleId: string): Promise<void> {
    await this.makeRequest<void>(
      `/api/v1/communication/rules/${encodeURIComponent(ruleId)}`,
      { method: 'DELETE' },
    );
  }

  /** Evaluate whether a message from sender to recipient is allowed. POST /api/v1/communication/evaluate */
  async evaluate(sender: string, recipient: string, action: string): Promise<CommunicationEvaluation> {
    return this.makeRequest<CommunicationEvaluation>(
      '/api/v1/communication/evaluate',
      { method: 'POST', body: { sender, recipient, action } },
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
        `Communication API request failed: ${response.status} ${response.statusText}. ${errorText}`,
      );
    }

    if (response.status === 204 || options.method === 'DELETE') {
      return undefined as unknown as T;
    }

    const data = await response.json();
    return data as T;
  }
}
