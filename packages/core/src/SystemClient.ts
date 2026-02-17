import {
  RequestOptions,
  SymbiontConfig,
  HealthResponse,
} from '@symbi/types';

/**
 * Simple interface to avoid circular dependency with SymbiontClient
 */
interface ClientDependency {
  getAuthHeaders(endpoint: string): Promise<Record<string, string>>;
  configuration: Readonly<SymbiontConfig>;
}

/**
 * Client for system health and metrics endpoints
 */
export class SystemClient {
  private client: ClientDependency;

  constructor(client: ClientDependency) {
    this.client = client;
  }

  /**
   * Get system health status
   * GET /health
   */
  async health(): Promise<HealthResponse> {
    return this.makeRequest<HealthResponse>('/health', {
      method: 'GET',
    });
  }

  /**
   * Get system metrics
   * GET /metrics
   */
  async getMetrics(): Promise<Record<string, unknown>> {
    return this.makeRequest<Record<string, unknown>>('/metrics', {
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
          `System API request failed: ${response.status} ${response.statusText}. ${errorText}`
        );
      }

      const data = await response.json();
      return data as T;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`SystemClient request failed: ${error.message}`);
      }
      throw new Error('SystemClient request failed: Unknown error');
    }
  }
}
