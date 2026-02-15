import { z } from 'zod';

/**
 * Metrics collection and export types for the Symbiont SDK
 * Matches Symbiont Runtime v1.4.0 metrics module
 */

// --- Enums ---

export const OtlpProtocol = {
  GRPC: 'grpc',
  HTTP: 'http',
} as const;

export type OtlpProtocol = typeof OtlpProtocol[keyof typeof OtlpProtocol];

// --- Interfaces ---

/** OTLP exporter configuration. */
export interface OtlpConfig {
  endpoint: string;
  protocol?: OtlpProtocol;
  headers?: Record<string, string>;
  timeout_seconds?: number;
}

/** File-based metrics exporter configuration. */
export interface FileMetricsConfig {
  path: string;
  compact?: boolean;
}

/** Top-level metrics configuration. */
export interface MetricsConfig {
  enabled?: boolean;
  export_interval_seconds?: number;
  otlp?: OtlpConfig;
  file?: FileMetricsConfig;
}

/** Scheduler metrics snapshot. */
export interface SchedulerMetricsSnapshot {
  jobs_total: number;
  jobs_active: number;
  jobs_paused: number;
  runs_total: number;
  runs_succeeded: number;
  runs_failed: number;
}

/** Task manager metrics snapshot. */
export interface TaskManagerMetricsSnapshot {
  tasks_active: number;
  tasks_queued: number;
  tasks_completed: number;
  tasks_failed: number;
}

/** Load balancer metrics snapshot. */
export interface LoadBalancerMetricsSnapshot {
  total_requests: number;
  active_connections: number;
  backends_healthy: number;
  backends_total: number;
}

/** System resource metrics snapshot. */
export interface SystemResourceMetricsSnapshot {
  cpu_usage_percent: number;
  memory_usage_bytes: number;
  memory_usage_percent: number;
  disk_usage_bytes: number;
  disk_usage_percent: number;
}

/** Complete metrics snapshot at a point in time. */
export interface MetricsSnapshot {
  timestamp: string;
  scheduler?: SchedulerMetricsSnapshot;
  task_manager?: TaskManagerMetricsSnapshot;
  load_balancer?: LoadBalancerMetricsSnapshot;
  system?: SystemResourceMetricsSnapshot;
}

// --- Zod schemas ---

export const OtlpProtocolSchema = z.enum(['grpc', 'http']);

export const OtlpConfigSchema = z.object({
  endpoint: z.string(),
  protocol: OtlpProtocolSchema.optional(),
  headers: z.record(z.string()).optional(),
  timeout_seconds: z.number().optional(),
});

export const FileMetricsConfigSchema = z.object({
  path: z.string(),
  compact: z.boolean().optional(),
});

export const MetricsConfigSchema = z.object({
  enabled: z.boolean().optional(),
  export_interval_seconds: z.number().optional(),
  otlp: OtlpConfigSchema.optional(),
  file: FileMetricsConfigSchema.optional(),
});

export const SchedulerMetricsSnapshotSchema = z.object({
  jobs_total: z.number(),
  jobs_active: z.number(),
  jobs_paused: z.number(),
  runs_total: z.number(),
  runs_succeeded: z.number(),
  runs_failed: z.number(),
});

export const TaskManagerMetricsSnapshotSchema = z.object({
  tasks_active: z.number(),
  tasks_queued: z.number(),
  tasks_completed: z.number(),
  tasks_failed: z.number(),
});

export const LoadBalancerMetricsSnapshotSchema = z.object({
  total_requests: z.number(),
  active_connections: z.number(),
  backends_healthy: z.number(),
  backends_total: z.number(),
});

export const SystemResourceMetricsSnapshotSchema = z.object({
  cpu_usage_percent: z.number(),
  memory_usage_bytes: z.number(),
  memory_usage_percent: z.number(),
  disk_usage_bytes: z.number(),
  disk_usage_percent: z.number(),
});

export const MetricsSnapshotSchema = z.object({
  timestamp: z.string(),
  scheduler: SchedulerMetricsSnapshotSchema.optional(),
  task_manager: TaskManagerMetricsSnapshotSchema.optional(),
  load_balancer: LoadBalancerMetricsSnapshotSchema.optional(),
  system: SystemResourceMetricsSnapshotSchema.optional(),
});
