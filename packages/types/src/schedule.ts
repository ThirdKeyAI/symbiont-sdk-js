import { z } from 'zod';

/**
 * Schedule types for the Symbiont SDK
 * Matches Symbiont Runtime API v1.0.0 schedule endpoints
 */

// --- Request / Response interfaces ---

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

/** Scheduler health response from GET /health/scheduler. */
export interface SchedulerHealthResponse {
  is_running: boolean;
  store_accessible: boolean;
  jobs_total: number;
  jobs_active: number;
  jobs_paused: number;
  jobs_dead_letter: number;
  global_active_runs: number;
  max_concurrent: number;
  runs_total: number;
  runs_succeeded: number;
  runs_failed: number;
  average_execution_time_ms: number;
  longest_run_ms: number;
}

// --- Zod schemas ---

export const CreateScheduleRequestSchema = z.object({
  name: z.string(),
  cron_expression: z.string(),
  timezone: z.string().optional(),
  agent_name: z.string(),
  policy_ids: z.array(z.string()).optional(),
  one_shot: z.boolean().optional(),
});

export const CreateScheduleResponseSchema = z.object({
  job_id: z.string(),
  next_run: z.string().nullable(),
  status: z.string(),
});

export const UpdateScheduleRequestSchema = z.object({
  cron_expression: z.string().optional(),
  timezone: z.string().optional(),
  policy_ids: z.array(z.string()).optional(),
  one_shot: z.boolean().optional(),
});

export const ScheduleSummarySchema = z.object({
  job_id: z.string(),
  name: z.string(),
  cron_expression: z.string(),
  timezone: z.string(),
  status: z.string(),
  enabled: z.boolean(),
  next_run: z.string().nullable(),
  run_count: z.number(),
});

export const ScheduleDetailSchema = z.object({
  job_id: z.string(),
  name: z.string(),
  cron_expression: z.string(),
  timezone: z.string(),
  status: z.string(),
  enabled: z.boolean(),
  one_shot: z.boolean(),
  next_run: z.string().nullable(),
  last_run: z.string().nullable(),
  run_count: z.number(),
  failure_count: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const ScheduleRunEntrySchema = z.object({
  run_id: z.string(),
  started_at: z.string(),
  completed_at: z.string().nullable(),
  status: z.string(),
  error: z.string().nullable(),
  execution_time_ms: z.number().nullable(),
});

export const ScheduleHistoryResponseSchema = z.object({
  job_id: z.string(),
  history: z.array(ScheduleRunEntrySchema),
});

export const NextRunsResponseSchema = z.object({
  job_id: z.string(),
  next_runs: z.array(z.string()),
});

export const ScheduleActionResponseSchema = z.object({
  job_id: z.string(),
  action: z.string(),
  status: z.string(),
});

export const DeleteScheduleResponseSchema = z.object({
  job_id: z.string(),
  deleted: z.boolean(),
});

export const SchedulerHealthResponseSchema = z.object({
  is_running: z.boolean(),
  store_accessible: z.boolean(),
  jobs_total: z.number(),
  jobs_active: z.number(),
  jobs_paused: z.number(),
  jobs_dead_letter: z.number(),
  global_active_runs: z.number(),
  max_concurrent: z.number(),
  runs_total: z.number(),
  runs_succeeded: z.number(),
  runs_failed: z.number(),
  average_execution_time_ms: z.number(),
  longest_run_ms: z.number(),
});
