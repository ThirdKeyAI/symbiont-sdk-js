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
 * - `execution_started`: the target agent was in the `Running` state and the
 *   message was dispatched via the runtime communication bus. Execution
 *   continues asynchronously.
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
 * Response returned when the target agent was running and the request was
 * dispatched on the communication bus.
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
