import { z } from 'zod';

/**
 * Reasoning Loop types and schemas for the Symbiont SDK.
 * Maps Rust runtime types from crates/runtime/src/reasoning/.
 */

// =============================================================================
// Inference Types
// =============================================================================

export const UsageSchema = z.object({
  prompt_tokens: z.number().int().min(0),
  completion_tokens: z.number().int().min(0),
  total_tokens: z.number().int().min(0),
});

export type Usage = z.infer<typeof UsageSchema>;

export const ToolDefinitionSchema = z.object({
  name: z.string(),
  description: z.string(),
  parameters: z.unknown(),
});

export type ToolDefinition = z.infer<typeof ToolDefinitionSchema>;

export const ToolCallRequestSchema = z.object({
  id: z.string(),
  name: z.string(),
  arguments: z.string(),
});

export type ToolCallRequest = z.infer<typeof ToolCallRequestSchema>;

export const FinishReasonSchema = z.enum([
  'stop',
  'tool_calls',
  'max_tokens',
  'content_filter',
]);

export type FinishReason = z.infer<typeof FinishReasonSchema>;

export const ResponseFormatTextSchema = z.object({
  type: z.literal('text'),
});

export const ResponseFormatJsonObjectSchema = z.object({
  type: z.literal('json_object'),
});

export const ResponseFormatJsonSchemaSchema = z.object({
  type: z.literal('json_schema'),
  schema: z.unknown(),
  name: z.string().optional(),
});

export const ResponseFormatSchema = z.discriminatedUnion('type', [
  ResponseFormatTextSchema,
  ResponseFormatJsonObjectSchema,
  ResponseFormatJsonSchemaSchema,
]);

export type ResponseFormat = z.infer<typeof ResponseFormatSchema>;

export const InferenceOptionsSchema = z.object({
  max_tokens: z.number().int().min(1),
  temperature: z.number().min(0).max(2),
  tool_definitions: z.array(ToolDefinitionSchema).default([]),
  response_format: ResponseFormatSchema.default({ type: 'text' }),
  model: z.string().optional(),
  extra: z.record(z.unknown()).default({}),
});

export type InferenceOptions = z.infer<typeof InferenceOptionsSchema>;

export const InferenceResponseSchema = z.object({
  content: z.string(),
  tool_calls: z.array(ToolCallRequestSchema).default([]),
  finish_reason: FinishReasonSchema,
  usage: UsageSchema,
  model: z.string(),
});

export type InferenceResponse = z.infer<typeof InferenceResponseSchema>;

// =============================================================================
// Loop Types
// =============================================================================

export const ObservationSchema = z.object({
  source: z.string(),
  content: z.string(),
  is_error: z.boolean().default(false),
  metadata: z.record(z.string()).default({}),
});

export type Observation = z.infer<typeof ObservationSchema>;

export const ProposedActionToolCallSchema = z.object({
  type: z.literal('tool_call'),
  call_id: z.string(),
  name: z.string(),
  arguments: z.string(),
});

export const ProposedActionDelegateSchema = z.object({
  type: z.literal('delegate'),
  target: z.string(),
  message: z.string(),
});

export const ProposedActionRespondSchema = z.object({
  type: z.literal('respond'),
  content: z.string(),
});

export const ProposedActionTerminateSchema = z.object({
  type: z.literal('terminate'),
  reason: z.string(),
  output: z.string(),
});

export const ProposedActionSchema = z.discriminatedUnion('type', [
  ProposedActionToolCallSchema,
  ProposedActionDelegateSchema,
  ProposedActionRespondSchema,
  ProposedActionTerminateSchema,
]);

export type ProposedAction = z.infer<typeof ProposedActionSchema>;

export const LoopDecisionAllowSchema = z.object({
  decision: z.literal('allow'),
});

export const LoopDecisionDenySchema = z.object({
  decision: z.literal('deny'),
  reason: z.string(),
});

export const LoopDecisionModifySchema = z.object({
  decision: z.literal('modify'),
  modified_action: ProposedActionSchema,
  reason: z.string(),
});

export const LoopDecisionSchema = z.discriminatedUnion('decision', [
  LoopDecisionAllowSchema,
  LoopDecisionDenySchema,
  LoopDecisionModifySchema,
]);

export type LoopDecision = z.infer<typeof LoopDecisionSchema>;

// Recovery strategy — discriminated union on "type"
export const RecoveryStrategyRetrySchema = z.object({
  type: z.literal('retry'),
  max_attempts: z.number().int().min(1),
  base_delay_ms: z.number().int().min(0),
});

export const RecoveryStrategyFallbackSchema = z.object({
  type: z.literal('fallback'),
  alternatives: z.array(z.string()),
});

export const RecoveryStrategyCachedResultSchema = z.object({
  type: z.literal('cached_result'),
  max_staleness_ms: z.number().int().min(0),
});

export const RecoveryStrategyLlmRecoverySchema = z.object({
  type: z.literal('llm_recovery'),
  max_recovery_attempts: z.number().int().min(1),
});

export const RecoveryStrategyEscalateSchema = z.object({
  type: z.literal('escalate'),
  queue: z.string(),
  context_snapshot: z.boolean(),
});

export const RecoveryStrategyDeadLetterSchema = z.object({
  type: z.literal('dead_letter'),
});

export const RecoveryStrategySchema = z.discriminatedUnion('type', [
  RecoveryStrategyRetrySchema,
  RecoveryStrategyFallbackSchema,
  RecoveryStrategyCachedResultSchema,
  RecoveryStrategyLlmRecoverySchema,
  RecoveryStrategyEscalateSchema,
  RecoveryStrategyDeadLetterSchema,
]);

export type RecoveryStrategy = z.infer<typeof RecoveryStrategySchema>;

// Termination reason — discriminated union on "type"
export const TerminationReasonCompletedSchema = z.object({
  type: z.literal('completed'),
});

export const TerminationReasonMaxIterationsSchema = z.object({
  type: z.literal('max_iterations'),
});

export const TerminationReasonMaxTokensSchema = z.object({
  type: z.literal('max_tokens'),
});

export const TerminationReasonTimeoutSchema = z.object({
  type: z.literal('timeout'),
});

export const TerminationReasonPolicyDenialSchema = z.object({
  type: z.literal('policy_denial'),
  reason: z.string(),
});

export const TerminationReasonErrorSchema = z.object({
  type: z.literal('error'),
  message: z.string(),
});

export const TerminationReasonSchema = z.discriminatedUnion('type', [
  TerminationReasonCompletedSchema,
  TerminationReasonMaxIterationsSchema,
  TerminationReasonMaxTokensSchema,
  TerminationReasonTimeoutSchema,
  TerminationReasonPolicyDenialSchema,
  TerminationReasonErrorSchema,
]);

export type TerminationReason = z.infer<typeof TerminationReasonSchema>;

export const LoopConfigSchema = z.object({
  max_iterations: z.number().int().min(1).default(10),
  max_total_tokens: z.number().int().min(1).default(100000),
  timeout_ms: z.number().int().min(0).default(300000),
  default_recovery: RecoveryStrategySchema.default({ type: 'dead_letter' }),
  tool_timeout_ms: z.number().int().min(0).default(30000),
  max_concurrent_tools: z.number().int().min(1).default(4),
  context_token_budget: z.number().int().min(0).default(4096),
  tool_definitions: z.array(ToolDefinitionSchema).default([]),
});

export type LoopConfig = z.infer<typeof LoopConfigSchema>;

export const LoopStateSchema = z.object({
  agent_id: z.string(),
  iteration: z.number().int().min(0),
  total_usage: UsageSchema,
  pending_observations: z.array(ObservationSchema).default([]),
  started_at: z.string(),
  current_phase: z.string(),
  metadata: z.record(z.unknown()).default({}),
});

export type LoopState = z.infer<typeof LoopStateSchema>;

export const LoopResultSchema = z.object({
  output: z.string(),
  iterations: z.number().int().min(0),
  total_usage: UsageSchema,
  termination_reason: TerminationReasonSchema,
  duration_ms: z.number().int().min(0),
});

export type LoopResult = z.infer<typeof LoopResultSchema>;

// =============================================================================
// Journal Types
// =============================================================================

export const LoopEventStartedSchema = z.object({
  type: z.literal('started'),
  agent_id: z.string(),
  config: LoopConfigSchema,
});

export const LoopEventReasoningCompleteSchema = z.object({
  type: z.literal('reasoning_complete'),
  iteration: z.number().int(),
  actions: z.array(ProposedActionSchema),
  usage: UsageSchema,
});

export const LoopEventPolicyEvaluatedSchema = z.object({
  type: z.literal('policy_evaluated'),
  iteration: z.number().int(),
  action_count: z.number().int(),
  denied_count: z.number().int(),
});

export const LoopEventToolsDispatchedSchema = z.object({
  type: z.literal('tools_dispatched'),
  iteration: z.number().int(),
  tool_count: z.number().int(),
  duration_ms: z.number().int().min(0),
});

export const LoopEventObservationsCollectedSchema = z.object({
  type: z.literal('observations_collected'),
  iteration: z.number().int(),
  observation_count: z.number().int(),
});

export const LoopEventTerminatedSchema = z.object({
  type: z.literal('terminated'),
  reason: TerminationReasonSchema,
  iterations: z.number().int(),
  total_usage: UsageSchema,
  duration_ms: z.number().int().min(0),
});

export const LoopEventRecoveryTriggeredSchema = z.object({
  type: z.literal('recovery_triggered'),
  iteration: z.number().int(),
  tool_name: z.string(),
  strategy: RecoveryStrategySchema,
  error: z.string(),
});

export const LoopEventSchema = z.discriminatedUnion('type', [
  LoopEventStartedSchema,
  LoopEventReasoningCompleteSchema,
  LoopEventPolicyEvaluatedSchema,
  LoopEventToolsDispatchedSchema,
  LoopEventObservationsCollectedSchema,
  LoopEventTerminatedSchema,
  LoopEventRecoveryTriggeredSchema,
]);

export type LoopEvent = z.infer<typeof LoopEventSchema>;

export const JournalEntrySchema = z.object({
  sequence: z.number().int().min(0),
  timestamp: z.string(),
  agent_id: z.string(),
  iteration: z.number().int().min(0),
  event: LoopEventSchema,
});

export type JournalEntry = z.infer<typeof JournalEntrySchema>;

// =============================================================================
// Cedar Policy Types
// =============================================================================

export const CedarPolicySchema = z.object({
  name: z.string(),
  source: z.string(),
  active: z.boolean().default(true),
});

export type CedarPolicy = z.infer<typeof CedarPolicySchema>;

// =============================================================================
// Knowledge Bridge Types
// =============================================================================

export const KnowledgeConfigSchema = z.object({
  max_context_items: z.number().int().min(0).default(5),
  relevance_threshold: z.number().min(0).max(1).default(0.7),
  auto_persist: z.boolean().default(false),
});

export type KnowledgeConfig = z.infer<typeof KnowledgeConfigSchema>;

// =============================================================================
// Circuit Breaker Types
// =============================================================================

export const CircuitStateSchema = z.enum(['closed', 'open', 'half_open']);

export type CircuitState = z.infer<typeof CircuitStateSchema>;

export const CircuitBreakerConfigSchema = z.object({
  failure_threshold: z.number().int().min(1).default(5),
  recovery_timeout_ms: z.number().int().min(0).default(30000),
  half_open_max_calls: z.number().int().min(1).default(3),
});

export type CircuitBreakerConfig = z.infer<typeof CircuitBreakerConfigSchema>;

export const CircuitBreakerStatusSchema = z.object({
  state: CircuitStateSchema,
  failure_count: z.number().int().min(0),
  success_count: z.number().int().min(0),
  config: CircuitBreakerConfigSchema,
});

export type CircuitBreakerStatus = z.infer<typeof CircuitBreakerStatusSchema>;

// =============================================================================
// API Request / Response Types
// =============================================================================

export const RunReasoningLoopRequestSchema = z.object({
  config: LoopConfigSchema,
  initial_message: z.string(),
  inference_options: InferenceOptionsSchema.optional(),
  cedar_policies: z.array(CedarPolicySchema).optional(),
  knowledge_config: KnowledgeConfigSchema.optional(),
});

export type RunReasoningLoopRequest = z.infer<typeof RunReasoningLoopRequestSchema>;

export const RunReasoningLoopResponseSchema = z.object({
  loop_id: z.string(),
  result: LoopResultSchema,
  journal_entries: z.array(JournalEntrySchema).default([]),
});

export type RunReasoningLoopResponse = z.infer<typeof RunReasoningLoopResponseSchema>;
