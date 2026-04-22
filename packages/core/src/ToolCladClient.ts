import type { SymbiontConfig } from 'symbi-types';
import type { RequestOptions } from 'symbi-types';

/**
 * Minimal interface to avoid circular dependency with SymbiontClient.
 */
interface ClientDependency {
  getAuthHeaders(endpoint: string): Promise<Record<string, string>>;
  configuration: Readonly<SymbiontConfig>;
}

export interface ToolManifestInfo {
  name: string;
  version: string;
  description: string;
  riskTier: string;
  humanApproval: boolean;
  argCount: number;
  backend: string;
  sourcePath: string;
}

export interface ToolValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ToolTestResult {
  command: string;
  validations: string[];
  cedar?: string;
  timeout: number;
}

export interface ToolExecutionResult {
  status: string;
  scanId: string;
  tool: string;
  command: string;
  durationMs: number;
  timestamp: string;
  outputHash?: string;
  exitCode: number;
  stderr: string;
  results: Record<string, unknown>;
}

/**
 * Client for the ToolClad API — listing, validating, testing, and executing
 * security-scanned tool manifests.
 *
 * Accessed via `client.toolclad`:
 * ```ts
 * const tools = await client.toolclad.listTools();
 * const result = await client.toolclad.executeTool('nmap', { target: '10.0.0.1' });
 * ```
 */
export class ToolCladClient {
  private client: ClientDependency;

  constructor(client: ClientDependency) {
    this.client = client;
  }

  /** List all registered tools. GET /api/v1/tools */
  async listTools(): Promise<ToolManifestInfo[]> {
    return this.makeRequest<ToolManifestInfo[]>(
      '/api/v1/tools',
      { method: 'GET' },
    );
  }

  /** Validate a tool manifest at the given path. POST /api/v1/tools/validate */
  async validateManifest(path: string): Promise<ToolValidationResult> {
    return this.makeRequest<ToolValidationResult>(
      '/api/v1/tools/validate',
      { method: 'POST', body: { path } },
    );
  }

  /** Dry-run a tool with the given arguments. POST /api/v1/tools/{toolName}/test */
  async testTool(toolName: string, args: Record<string, string>): Promise<ToolTestResult> {
    return this.makeRequest<ToolTestResult>(
      `/api/v1/tools/${encodeURIComponent(toolName)}/test`,
      { method: 'POST', body: { args } },
    );
  }

  /** Get the JSON schema for a tool. GET /api/v1/tools/{toolName}/schema */
  async getSchema(toolName: string): Promise<Record<string, unknown>> {
    return this.makeRequest<Record<string, unknown>>(
      `/api/v1/tools/${encodeURIComponent(toolName)}/schema`,
      { method: 'GET' },
    );
  }

  /** Execute a tool with the given arguments. POST /api/v1/tools/{toolName}/execute */
  async executeTool(toolName: string, args: Record<string, string>): Promise<ToolExecutionResult> {
    return this.makeRequest<ToolExecutionResult>(
      `/api/v1/tools/${encodeURIComponent(toolName)}/execute`,
      { method: 'POST', body: { args } },
    );
  }

  /** Get detailed info for a specific tool. GET /api/v1/tools/{toolName} */
  async getToolInfo(toolName: string): Promise<ToolManifestInfo> {
    return this.makeRequest<ToolManifestInfo>(
      `/api/v1/tools/${encodeURIComponent(toolName)}`,
      { method: 'GET' },
    );
  }

  /** Reload tool manifests from disk. POST /api/v1/tools/reload */
  async reloadTools(): Promise<void> {
    await this.makeRequest<void>(
      '/api/v1/tools/reload',
      { method: 'POST' },
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
        `ToolClad API request failed: ${response.status} ${response.statusText}. ${errorText}`,
      );
    }

    if (response.status === 204) {
      return undefined as unknown as T;
    }

    const data = await response.json();
    return data as T;
  }
}
