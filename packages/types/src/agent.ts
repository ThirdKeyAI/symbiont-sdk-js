import { z } from 'zod';

/**
 * Agent-related types and schemas for the Symbiont SDK
 */

// Base agent metadata schema
export const AgentMetadataSchema = z.object({
  version: z.string(),
  author: z.string(),
  description: z.string(),
  tags: z.array(z.string()).optional(),
});

export type AgentMetadata = z.infer<typeof AgentMetadataSchema>;

// Parameter definition schema
export const ParameterSchema = z.object({
  name: z.string(),
  type: z.object({
    name: z.string(),
    description: z.string().optional(),
  }),
  required: z.boolean().default(false),
  description: z.string().optional(),
});

export type Parameter = z.infer<typeof ParameterSchema>;

// Type definition schema
export const TypeDefinitionSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
});

export type TypeDefinition = z.infer<typeof TypeDefinitionSchema>;

// Policy definition schema
export const PolicyDefinitionSchema = z.object({
  name: z.string(),
  type: z.string(),
  rules: z.array(z.string()),
});

export type PolicyDefinition = z.infer<typeof PolicyDefinitionSchema>;

// Execution configuration schema
export const ExecutionConfigSchema = z.object({
  memory: z.enum(['ephemeral', 'persistent']).default('ephemeral'),
  privacy: z.enum(['low', 'medium', 'high']).default('medium'),
  timeout: z.number().min(0).optional(),
  maxRetries: z.number().min(0).default(3),
});

export type ExecutionConfig = z.infer<typeof ExecutionConfigSchema>;

// Agent definition schema (for creation)
export const AgentDefinitionSchema = z.object({
  metadata: AgentMetadataSchema,
  name: z.string(),
  parameters: z.array(ParameterSchema),
  returnType: TypeDefinitionSchema,
  capabilities: z.array(z.string()),
  policies: z.array(PolicyDefinitionSchema),
  executionConfig: ExecutionConfigSchema,
  dslSource: z.string(),
});

export type AgentDefinition = z.infer<typeof AgentDefinitionSchema>;

// Agent status enum
export const AgentStatusSchema = z.enum([
  'active',
  'inactive', 
  'pending',
  'error',
  'executing',
  'paused'
]);

export type AgentStatus = z.infer<typeof AgentStatusSchema>;

// Agent entity schema (returned from API)
export const AgentSchema = z.object({
  id: z.string(),
  definition: AgentDefinitionSchema,
  status: AgentStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
  lastExecutedAt: z.string().optional(),
  executionCount: z.number().default(0),
});

export type Agent = z.infer<typeof AgentSchema>;

// Agent create payload schema
export const AgentCreatePayloadSchema = AgentDefinitionSchema;
export type AgentCreatePayload = z.infer<typeof AgentCreatePayloadSchema>;

// Agent update payload schema (partial definition)
export const AgentUpdatePayloadSchema = AgentDefinitionSchema.partial();
export type AgentUpdatePayload = z.infer<typeof AgentUpdatePayloadSchema>;

// Agent status response schema
export const AgentStatusResponseSchema = z.object({
  id: z.string(),
  status: AgentStatusSchema,
  lastExecutedAt: z.string().optional(),
  executionCount: z.number(),
  currentExecution: z.object({
    executionId: z.string(),
    startedAt: z.string(),
    parameters: z.record(z.unknown()),
  }).optional(),
});

export type AgentStatusResponse = z.infer<typeof AgentStatusResponseSchema>;

// Execution result schema
export const ExecutionResultSchema = z.object({
  executionId: z.string(),
  agentId: z.string(),
  status: z.enum(['success', 'error', 'timeout', 'cancelled']),
  result: z.unknown().optional(),
  error: z.string().optional(),
  startedAt: z.string(),
  completedAt: z.string().optional(),
  duration: z.number().optional(),
  parameters: z.record(z.unknown()),
});

export type ExecutionResult<T = unknown> = Omit<z.infer<typeof ExecutionResultSchema>, 'result'> & {
  result?: T;
};

// Agent execution history item schema
export const AgentHistoryItemSchema = ExecutionResultSchema;
export type AgentHistoryItem = z.infer<typeof AgentHistoryItemSchema>;

// Agent list response schema
export const AgentListResponseSchema = z.array(AgentSchema);
export type AgentListResponse = z.infer<typeof AgentListResponseSchema>;

// Agent history response schema
export const AgentHistoryResponseSchema = z.object({
  agentId: z.string(),
  executions: z.array(AgentHistoryItemSchema),
  totalCount: z.number(),
  page: z.number(),
  pageSize: z.number(),
});

export type AgentHistoryResponse = z.infer<typeof AgentHistoryResponseSchema>;

// Execution options schema
export const ExecutionOptionsSchema = z.object({
  timeout: z.number().min(0).optional(),
  priority: z.enum(['low', 'normal', 'high']).default('normal'),
  metadata: z.record(z.unknown()).optional(),
}).optional();

export type ExecutionOptions = z.infer<typeof ExecutionOptionsSchema>;