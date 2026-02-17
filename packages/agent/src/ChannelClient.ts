import {
  RequestOptions,
  SymbiontConfig,
  RegisterChannelRequest,
  RegisterChannelResponse,
  UpdateChannelRequest,
  ChannelSummary,
  ChannelDetail,
  ChannelActionResponse,
  DeleteChannelResponse,
  ChannelHealthResponse,
  IdentityMappingEntry,
  AddIdentityMappingRequest,
  ChannelAuditResponse,
} from '@symbi/types';

/**
 * Simple interface to avoid circular dependency with SymbiontClient
 */
interface ClientDependency {
  getAuthHeaders(endpoint: string): Promise<Record<string, string>>;
  configuration: Readonly<SymbiontConfig>;
}

// Re-export channel types for backward compatibility
export type {
  RegisterChannelRequest,
  RegisterChannelResponse,
  UpdateChannelRequest,
  ChannelSummary,
  ChannelDetail,
  ChannelActionResponse,
  DeleteChannelResponse,
  ChannelHealthResponse,
  IdentityMappingEntry,
  AddIdentityMappingRequest,
  ChannelAuditResponse,
};

/**
 * Client for managing channel adapters via the Symbiont Runtime API
 */
export class ChannelClient {
  private client: ClientDependency;

  constructor(client: ClientDependency) {
    this.client = client;
  }

  // ── Community endpoints ──────────────────────────────────────

  /** List all registered channel adapters. GET /channels */
  async listChannels(): Promise<ChannelSummary[]> {
    return this.makeRequest<ChannelSummary[]>('/channels', {
      method: 'GET',
    });
  }

  /** Register a new channel adapter. POST /channels */
  async registerChannel(
    request: RegisterChannelRequest
  ): Promise<RegisterChannelResponse> {
    return this.makeRequest<RegisterChannelResponse>('/channels', {
      method: 'POST',
      body: request,
    });
  }

  /** Get details of a channel adapter. GET /channels/{id} */
  async getChannel(id: string): Promise<ChannelDetail> {
    if (!id) throw new Error('Channel ID is required');
    return this.makeRequest<ChannelDetail>(`/channels/${id}`, {
      method: 'GET',
    });
  }

  /** Update a channel adapter. PUT /channels/{id} */
  async updateChannel(
    id: string,
    request: UpdateChannelRequest
  ): Promise<ChannelDetail> {
    if (!id) throw new Error('Channel ID is required');
    return this.makeRequest<ChannelDetail>(`/channels/${id}`, {
      method: 'PUT',
      body: request,
    });
  }

  /** Delete a channel adapter. DELETE /channels/{id} */
  async deleteChannel(id: string): Promise<DeleteChannelResponse> {
    if (!id) throw new Error('Channel ID is required');
    return this.makeRequest<DeleteChannelResponse>(`/channels/${id}`, {
      method: 'DELETE',
    });
  }

  /** Start a channel adapter. POST /channels/{id}/start */
  async startChannel(id: string): Promise<ChannelActionResponse> {
    if (!id) throw new Error('Channel ID is required');
    return this.makeRequest<ChannelActionResponse>(
      `/channels/${id}/start`,
      { method: 'POST' }
    );
  }

  /** Stop a channel adapter. POST /channels/{id}/stop */
  async stopChannel(id: string): Promise<ChannelActionResponse> {
    if (!id) throw new Error('Channel ID is required');
    return this.makeRequest<ChannelActionResponse>(
      `/channels/${id}/stop`,
      { method: 'POST' }
    );
  }

  /** Get channel health info. GET /channels/{id}/health */
  async getChannelHealth(id: string): Promise<ChannelHealthResponse> {
    if (!id) throw new Error('Channel ID is required');
    return this.makeRequest<ChannelHealthResponse>(
      `/channels/${id}/health`,
      { method: 'GET' }
    );
  }

  // ── Enterprise endpoints ─────────────────────────────────────

  /** List identity mappings for a channel. GET /channels/{id}/mappings */
  async listMappings(id: string): Promise<IdentityMappingEntry[]> {
    if (!id) throw new Error('Channel ID is required');
    return this.makeRequest<IdentityMappingEntry[]>(
      `/channels/${id}/mappings`,
      { method: 'GET' }
    );
  }

  /** Add an identity mapping. POST /channels/{id}/mappings */
  async addMapping(
    id: string,
    request: AddIdentityMappingRequest
  ): Promise<IdentityMappingEntry> {
    if (!id) throw new Error('Channel ID is required');
    return this.makeRequest<IdentityMappingEntry>(
      `/channels/${id}/mappings`,
      { method: 'POST', body: request }
    );
  }

  /** Remove an identity mapping. DELETE /channels/{id}/mappings/{userId} */
  async removeMapping(id: string, userId: string): Promise<void> {
    if (!id) throw new Error('Channel ID is required');
    if (!userId) throw new Error('User ID is required');
    await this.makeRequest<void>(
      `/channels/${id}/mappings/${userId}`,
      { method: 'DELETE' }
    );
  }

  /** Query audit log. GET /channels/{id}/audit */
  async queryAudit(
    id: string,
    limit = 50
  ): Promise<ChannelAuditResponse> {
    if (!id) throw new Error('Channel ID is required');
    const params = new URLSearchParams({ limit: limit.toString() });
    return this.makeRequest<ChannelAuditResponse>(
      `/channels/${id}/audit?${params}`,
      { method: 'GET' }
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
          `Channel API request failed: ${response.status} ${response.statusText}. ${errorText}`
        );
      }

      if (options.method === 'DELETE') {
        return undefined as T;
      }

      const data = await response.json();
      return data as T;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`ChannelClient request failed: ${error.message}`);
      }
      throw new Error('ChannelClient request failed: Unknown error');
    }
  }
}
