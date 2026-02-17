import * as fs from 'fs';
import * as path from 'path';
import type { MetricsSnapshot as MetricsSnapshotType } from '@symbi/types';
import {
  RequestOptions,
  SymbiontConfig,
} from '@symbi/types';

// Re-export the type
export type { MetricsSnapshotType };

/**
 * Error thrown when metrics export operations fail.
 */
export class MetricsExportError extends Error {
  public backend: string;

  constructor(message: string, backend: string) {
    super(message);
    this.name = 'MetricsExportError';
    this.backend = backend;
  }
}

/**
 * Metrics snapshot data class with serialization support.
 */
export interface MetricsSnapshotData {
  timestamp: string;
  scheduler?: {
    jobs_total: number;
    jobs_active: number;
    jobs_paused: number;
    runs_total: number;
    runs_succeeded: number;
    runs_failed: number;
  };
  task_manager?: {
    tasks_active: number;
    tasks_queued: number;
    tasks_completed: number;
    tasks_failed: number;
  };
  load_balancer?: {
    total_requests: number;
    active_connections: number;
    backends_healthy: number;
    backends_total: number;
  };
  system?: {
    cpu_usage_percent: number;
    memory_usage_bytes: number;
    memory_usage_percent: number;
    disk_usage_bytes: number;
    disk_usage_percent: number;
  };
}

// --- Exporter Config ---

export interface FileExporterConfig {
  path: string;
  compact?: boolean;
}

// --- Exporters ---

/**
 * Abstract metrics exporter interface.
 */
export interface MetricsExporter {
  export(snapshot: MetricsSnapshotData): void;
  shutdown(): void;
}

/**
 * Writes metrics snapshots to a JSON file atomically.
 */
export class FileMetricsExporter implements MetricsExporter {
  private filePath: string;
  private compact: boolean;

  constructor(config: FileExporterConfig) {
    this.filePath = config.path;
    this.compact = config.compact !== false;
  }

  export(snapshot: MetricsSnapshotData): void {
    const parentDir = path.dirname(this.filePath);
    if (parentDir) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    const jsonStr = this.compact
      ? JSON.stringify(snapshot)
      : JSON.stringify(snapshot, null, 2);

    // Atomic write via temp file + rename
    const tmpPath = path.join(parentDir || '.', `.metrics_${Date.now()}.json`);
    fs.writeFileSync(tmpPath, jsonStr, 'utf-8');
    fs.renameSync(tmpPath, this.filePath);
  }

  shutdown(): void {
    // No-op
  }
}

/**
 * Fan-out exporter that delegates to multiple backends.
 */
export class CompositeExporter implements MetricsExporter {
  private exporters: MetricsExporter[];

  constructor(exporters: MetricsExporter[]) {
    this.exporters = [...exporters];
  }

  export(snapshot: MetricsSnapshotData): void {
    const errors: string[] = [];
    for (const exporter of this.exporters) {
      try {
        exporter.export(snapshot);
      } catch (err) {
        errors.push(String(err));
      }
    }
    if (errors.length === this.exporters.length && errors.length > 0) {
      throw new MetricsExportError(
        `All exporters failed: ${errors.join('; ')}`,
        'composite'
      );
    }
  }

  shutdown(): void {
    for (const exporter of this.exporters) {
      try {
        exporter.shutdown();
      } catch {
        // Log and continue
      }
    }
  }
}

/**
 * Background metrics collector that periodically exports snapshots.
 */
export class MetricsCollector {
  private exporter: MetricsExporter;
  private intervalMs: number;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(exporter: MetricsExporter, intervalSeconds = 60) {
    this.exporter = exporter;
    this.intervalMs = intervalSeconds * 1000;
  }

  start(): void {
    if (this.timer !== null) return;

    const doExport = (): void => {
      const snapshot: MetricsSnapshotData = {
        timestamp: new Date().toISOString(),
        system: {
          cpu_usage_percent: 0,
          memory_usage_bytes: 0,
          memory_usage_percent: 0,
          disk_usage_bytes: 0,
          disk_usage_percent: 0,
        },
      };
      try {
        this.exporter.export(snapshot);
      } catch {
        // Silently continue
      }
    };

    // Export immediately, then on interval
    doExport();
    this.timer = setInterval(doExport, this.intervalMs);
  }

  stop(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.exporter.shutdown();
  }
}

// --- API Client ---

/**
 * Simple interface to avoid circular dependency with SymbiontClient.
 */
interface ClientDependency {
  getAuthHeaders(endpoint: string): Promise<Record<string, string>>;
  configuration: Readonly<SymbiontConfig>;
}

/**
 * Client for querying runtime metrics via the Symbiont Runtime API.
 *
 * Accessed via `client.metricsClient`:
 * ```ts
 * const snapshot = await client.metricsClient.getMetricsSnapshot();
 * ```
 */
export class MetricsApiClient {
  private client: ClientDependency;

  constructor(client: ClientDependency) {
    this.client = client;
  }

  /** Get the current metrics snapshot. GET /metrics/snapshot */
  async getMetricsSnapshot(): Promise<Record<string, unknown>> {
    return this.makeRequest<Record<string, unknown>>('/metrics/snapshot', {
      method: 'GET',
    });
  }

  /** Get scheduler-specific metrics. GET /metrics/scheduler */
  async getSchedulerMetrics(): Promise<Record<string, unknown>> {
    return this.makeRequest<Record<string, unknown>>('/metrics/scheduler', {
      method: 'GET',
    });
  }

  /** Get system resource metrics. GET /metrics/system */
  async getSystemMetrics(): Promise<Record<string, unknown>> {
    return this.makeRequest<Record<string, unknown>>('/metrics/system', {
      method: 'GET',
    });
  }

  /** Trigger a metrics export. POST /metrics/export */
  async exportMetrics(): Promise<Record<string, unknown>> {
    return this.makeRequest<Record<string, unknown>>('/metrics/export', {
      method: 'POST',
    });
  }

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
          `Metrics API request failed: ${response.status} ${response.statusText}. ${errorText}`
        );
      }

      const data = await response.json();
      return data as T;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`MetricsApiClient request failed: ${error.message}`);
      }
      throw new Error('MetricsApiClient request failed: Unknown error');
    }
  }
}
