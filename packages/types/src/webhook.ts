import { z } from 'zod';

/**
 * Webhook types for the Symbiont SDK.
 *
 * - Signature verification types match the Symbiont Runtime v1.4.0
 *   `webhook_verify` module.
 * - HTTP Input invocation request/response types match the Symbiont Runtime
 *   v1.10.0 HTTP Input handler, which dispatches to a running agent via the
 *   communication bus or falls back to an on-demand LLM ORGA tool-calling
 *   loop against ToolClad manifests.
 */

// ---------------------------------------------------------------------------
// Signature verification
// ---------------------------------------------------------------------------

export const WebhookProviderType = {
  GITHUB: 'github',
  STRIPE: 'stripe',
  SLACK: 'slack',
  CUSTOM: 'custom',
} as const;

export type WebhookProviderType = typeof WebhookProviderType[keyof typeof WebhookProviderType];

/** Webhook verification configuration. */
export interface WebhookVerificationConfig {
  provider: WebhookProviderType;
  secret: string;
  header_name?: string;
  required_issuer?: string;
}

/** Webhook provider preset with header name and optional prefix. */
export interface WebhookProviderPreset {
  header_name: string;
  prefix: string | null;
}

export const WebhookProviderTypeSchema = z.enum(['github', 'stripe', 'slack', 'custom']);

export const WebhookVerificationConfigSchema = z.object({
  provider: WebhookProviderTypeSchema,
  secret: z.string(),
  header_name: z.string().optional(),
  required_issuer: z.string().optional(),
});

export const WebhookProviderPresetSchema = z.object({
  header_name: z.string(),
  prefix: z.string().nullable(),
});

// ---------------------------------------------------------------------------
// HTTP Input invocation (Symbiont Runtime v1.10.0)
// ---------------------------------------------------------------------------

/**
 * Status returned by the HTTP Input handler.
 *
 * - `execution_started`: runtimes older than v1.21.0 only. The target agent
 *   was in the `Running` state and the message was dispatched via the runtime
 *   communication bus, continuing asynchronously. Runtime v1.21.0 retired this
 *   handoff on the HTTP Input route: every reasoning request returns its own
 *   result, including while another invocation of the same agent is active.
 * - `completed`: the agent was not running (or the bus dispatch failed) and
 *   the request was served by the on-demand LLM invocation path, which ran
 *   an ORGA tool-calling loop and produced a final response inline.
 */
export const WebhookInvocationStatus = {
  EXECUTION_STARTED: 'execution_started',
  COMPLETED: 'completed',
} as const;

export type WebhookInvocationStatus =
  typeof WebhookInvocationStatus[keyof typeof WebhookInvocationStatus];

/**
 * A single tool execution performed during an LLM ORGA invocation.
 *
 * `output_preview` is truncated on a UTF-8 character boundary to at most
 * 500 bytes by the runtime.
 */
export interface WebhookToolRun {
  tool: string;
  input: Record<string, unknown>;
  output_preview: string;
}

export const WebhookToolRunSchema = z.object({
  tool: z.string(),
  input: z.record(z.unknown()),
  output_preview: z.string(),
});

/**
 * Public reference to the protected run journal for an invocation.
 * Present from runtime v1.21.0.
 */
export interface WebhookRunAudit {
  run_id: string;
  path: string;
  public_key: string;
}

export const WebhookRunAuditSchema = z.object({
  run_id: z.string(),
  path: z.string(),
  public_key: z.string(),
});

/**
 * Response returned when the target agent was running and the request was
 * dispatched on the communication bus.
 *
 * Runtimes older than v1.21.0 only — v1.21.0 retired this shape on the HTTP
 * Input route. Retained so this SDK still parses supported earlier runtimes.
 */
export interface WebhookExecutionStartedResponse {
  status: 'execution_started';
  agent_id: string;
  message_id: string;
  latency_ms: number;
  timestamp: string;
}

export const WebhookExecutionStartedResponseSchema = z.object({
  status: z.literal('execution_started'),
  agent_id: z.string(),
  message_id: z.string(),
  latency_ms: z.number(),
  timestamp: z.string(),
});

/**
 * Response returned when the request was served by the on-demand LLM
 * ORGA tool-calling loop. Includes the final assistant text, per-tool
 * execution previews, and the model/provider used.
 */
export interface WebhookCompletedResponse {
  status: 'completed';
  agent_id: string;
  response: string;
  tool_runs: WebhookToolRun[];
  /** Why the loop stopped, e.g. `Completed`. Runtime v1.21.0+. */
  termination_reason?: string;
  /** ORGA loop iterations. Runtime v1.21.0+. */
  iterations?: number;
  /** Public audit reference for the protected run journal. Runtime v1.21.0+. */
  audit?: WebhookRunAudit;
  /** Durable invocation identity used for retries. Runtime v1.21.0+. */
  invocation_id?: string;
  /** True when a saved result was returned for a retry. Runtime v1.21.0+. */
  replayed?: boolean;
  /** Token usage totals for the invocation. Runtime v1.21.0+. */
  total_usage?: Record<string, unknown>;
  /** Shared budget snapshot at completion. Runtime v1.21.0+. */
  budget?: Record<string, unknown>;
  model: string;
  provider: string;
  latency_ms: number;
  timestamp: string;
}

export const WebhookCompletedResponseSchema = z.object({
  status: z.literal('completed'),
  agent_id: z.string(),
  response: z.string(),
  tool_runs: z.array(WebhookToolRunSchema),
  termination_reason: z.string().optional(),
  iterations: z.number().optional(),
  audit: WebhookRunAuditSchema.optional(),
  invocation_id: z.string().optional(),
  replayed: z.boolean().optional(),
  total_usage: z.record(z.unknown()).optional(),
  budget: z.record(z.unknown()).optional(),
  model: z.string(),
  provider: z.string(),
  latency_ms: z.number(),
  timestamp: z.string(),
});

/** Discriminated union of all HTTP Input invocation responses. */
export type WebhookInvocationResponse =
  | WebhookExecutionStartedResponse
  | WebhookCompletedResponse;

export const WebhookInvocationResponseSchema = z.discriminatedUnion('status', [
  WebhookExecutionStartedResponseSchema,
  WebhookCompletedResponseSchema,
]);

/**
 * Caller-supplied payload accepted by the HTTP Input endpoint.
 *
 * The runtime extracts the user message from `prompt` (preferred) or
 * `message`; if neither is present the entire JSON body is rendered
 * as the user message. `system_prompt` is optional and is capped at
 * 4096 bytes by the runtime (truncated on a UTF-8 character boundary).
 * Arbitrary additional fields are permitted and passed through.
 */
export interface WebhookInvocationRequest {
  prompt?: string;
  message?: string;
  system_prompt?: string;
  [key: string]: unknown;
}

export const WebhookInvocationRequestSchema = z
  .object({
    prompt: z.string().optional(),
    message: z.string().optional(),
    system_prompt: z.string().max(4096).optional(),
  })
  .passthrough();
