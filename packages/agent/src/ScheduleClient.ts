import {
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

/** Request to create a new scheduled job. */
export interface CreateScheduleRequest {
  name: string;
  cron_expression: string;
  timezone?: string;
  agent_name: string;
  policy_ids?: string[];
  one_shot?: boolean;
}

/** Response after creating a schedule. */
export interface CreateScheduleResponse {
  job_id: string;
  next_run: string | null;
  status: string;
}

/** Request to update an existing schedule. */
export interface UpdateScheduleRequest {
  cron_expression?: string;
  timezone?: string;
  policy_ids?: string[];
  one_shot?: boolean;
}

/** Summary of a scheduled job. */
export interface ScheduleSummary {
  job_id: string;
  name: string;
  cron_expression: string;
  timezone: string;
  status: string;
  enabled: boolean;
  next_run: string | null;
  run_count: number;
}

/** Detailed schedule information. */
export interface ScheduleDetail {
  job_id: string;
  name: string;
  cron_expression: string;
  timezone: string;
  status: string;
  enabled: boolean;
  one_shot: boolean;
  next_run: string | null;
  last_run: string | null;
  run_count: number;
  failure_count: number;
  created_at: string;
  updated_at: string;
}

/** A single run history entry. */
export interface ScheduleRunEntry {
  run_id: string;
  started_at: string;
  completed_at: string | null;
  status: string;
  error: string | null;
  execution_time_ms: number | null;
}

/** Response for schedule history. */
export interface ScheduleHistoryResponse {
  job_id: string;
  history: ScheduleRunEntry[];
}

/** Response for next run times. */
export interface NextRunsResponse {
  job_id: string;
  next_runs: string[];
}

/** Generic action response. */
export interface ScheduleActionResponse {
  job_id: string;
  action: string;
  status: string;
}

/** Delete response. */
export interface DeleteScheduleResponse {
  job_id: string;
  deleted: boolean;
}

/**
 * Client for managing cron schedules via the Symbiont Runtime API
 */
export class ScheduleClient {
  private client: ClientDependency;

  constructor(client: ClientDependency) {
    this.client = client;
  }

  /** List all scheduled jobs. GET /schedules */
  async listSchedules(): Promise<ScheduleSummary[]> {
    return this.makeRequest<ScheduleSummary[]>('/schedules', {
      method: 'GET',
    });
  }

  /** Create a new scheduled job. POST /schedules */
  async createSchedule(
    request: CreateScheduleRequest
  ): Promise<CreateScheduleResponse> {
    return this.makeRequest<CreateScheduleResponse>('/schedules', {
      method: 'POST',
      body: request,
    });
  }

  /** Get details of a scheduled job. GET /schedules/{id} */
  async getSchedule(jobId: string): Promise<ScheduleDetail> {
    if (!jobId) throw new Error('Job ID is required');
    return this.makeRequest<ScheduleDetail>(`/schedules/${jobId}`, {
      method: 'GET',
    });
  }

  /** Update a scheduled job. PUT /schedules/{id} */
  async updateSchedule(
    jobId: string,
    request: UpdateScheduleRequest
  ): Promise<ScheduleDetail> {
    if (!jobId) throw new Error('Job ID is required');
    return this.makeRequest<ScheduleDetail>(`/schedules/${jobId}`, {
      method: 'PUT',
      body: request,
    });
  }

  /** Delete a scheduled job. DELETE /schedules/{id} */
  async deleteSchedule(jobId: string): Promise<DeleteScheduleResponse> {
    if (!jobId) throw new Error('Job ID is required');
    return this.makeRequest<DeleteScheduleResponse>(`/schedules/${jobId}`, {
      method: 'DELETE',
    });
  }

  /** Pause a scheduled job. POST /schedules/{id}/pause */
  async pauseSchedule(jobId: string): Promise<ScheduleActionResponse> {
    if (!jobId) throw new Error('Job ID is required');
    return this.makeRequest<ScheduleActionResponse>(
      `/schedules/${jobId}/pause`,
      { method: 'POST' }
    );
  }

  /** Resume a paused job. POST /schedules/{id}/resume */
  async resumeSchedule(jobId: string): Promise<ScheduleActionResponse> {
    if (!jobId) throw new Error('Job ID is required');
    return this.makeRequest<ScheduleActionResponse>(
      `/schedules/${jobId}/resume`,
      { method: 'POST' }
    );
  }

  /** Force-trigger a job immediately. POST /schedules/{id}/trigger */
  async triggerSchedule(jobId: string): Promise<ScheduleActionResponse> {
    if (!jobId) throw new Error('Job ID is required');
    return this.makeRequest<ScheduleActionResponse>(
      `/schedules/${jobId}/trigger`,
      { method: 'POST' }
    );
  }

  /** Get run history. GET /schedules/{id}/history */
  async getScheduleHistory(
    jobId: string,
    limit = 50
  ): Promise<ScheduleHistoryResponse> {
    if (!jobId) throw new Error('Job ID is required');
    const params = new URLSearchParams({ limit: limit.toString() });
    return this.makeRequest<ScheduleHistoryResponse>(
      `/schedules/${jobId}/history?${params}`,
      { method: 'GET' }
    );
  }

  /** Get next N run times. GET /schedules/{id}/next-runs */
  async getScheduleNextRuns(
    jobId: string,
    count = 10
  ): Promise<NextRunsResponse> {
    if (!jobId) throw new Error('Job ID is required');
    const params = new URLSearchParams({ count: count.toString() });
    return this.makeRequest<NextRunsResponse>(
      `/schedules/${jobId}/next-runs?${params}`,
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
          `Schedule API request failed: ${response.status} ${response.statusText}. ${errorText}`
        );
      }

      if (options.method === 'DELETE') {
        return undefined as T;
      }

      const data = await response.json();
      return data as T;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`ScheduleClient request failed: ${error.message}`);
      }
      throw new Error('ScheduleClient request failed: Unknown error');
    }
  }
}
