import { z } from 'zod';

/**
 * System types for the Symbiont SDK
 * Covers GET /health, GET /metrics, POST /workflows/execute
 */

/** Response from GET /health. */
export interface HealthResponse {
  status: string;
  uptime_seconds: number;
  timestamp: string;
  version: string;
}

/** Request to POST /workflows/execute. */
export interface WorkflowExecutionRequest {
  workflow_id: string;
  parameters: Record<string, unknown>;
  agent_id?: string;
}

/** Generic error response from the API. */
export interface ErrorResponse {
  error: string;
  code: string;
  details?: Record<string, unknown>;
}

// --- Zod schemas ---

export const HealthResponseSchema = z.object({
  status: z.string(),
  uptime_seconds: z.number(),
  timestamp: z.string(),
  version: z.string(),
});

export const WorkflowExecutionRequestSchema = z.object({
  workflow_id: z.string(),
  parameters: z.record(z.unknown()),
  agent_id: z.string().optional(),
});

export const ErrorResponseSchema = z.object({
  error: z.string(),
  code: z.string(),
  details: z.record(z.unknown()).optional(),
});
