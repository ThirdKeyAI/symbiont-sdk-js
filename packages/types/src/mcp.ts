import { z } from 'zod';

/**
 * MCP-related types and schemas for the Symbiont SDK
 */

// Server health status schema
export const ServerHealthSchema = z.object({
  status: z.enum(['healthy', 'unhealthy', 'degraded']),
  timestamp: z.string(),
  version: z.string().optional(),
  uptime: z.number().optional(),
  message: z.string().optional(),
});

export type ServerHealth = z.infer<typeof ServerHealthSchema>;

// Workflow execution parameters schema
export const WorkflowParametersSchema = z.record(z.unknown());
export type WorkflowParameters = z.infer<typeof WorkflowParametersSchema>;

// Workflow execution options schema
export const WorkflowExecutionOptionsSchema = z.object({
  timeout: z.number().min(0).optional(),
  priority: z.enum(['low', 'normal', 'high']).default('normal'),
  metadata: z.record(z.unknown()).optional(),
  retryConfig: z.object({
    maxRetries: z.number().min(0).default(3),
    backoffStrategy: z.enum(['linear', 'exponential']).default('exponential'),
    retryDelay: z.number().min(0).default(1000),
  }).optional(),
}).optional();

export type WorkflowExecutionOptions = z.infer<typeof WorkflowExecutionOptionsSchema>;

// Workflow execution payload schema
export const WorkflowExecutionPayloadSchema = z.object({
  workflowId: z.string(),
  parameters: WorkflowParametersSchema,
  options: WorkflowExecutionOptionsSchema,
});

export type WorkflowExecutionPayload = z.infer<typeof WorkflowExecutionPayloadSchema>;

// Workflow execution status schema
export const WorkflowExecutionStatusSchema = z.enum([
  'pending',
  'running',
  'completed',
  'failed',
  'cancelled',
  'timeout'
]);

export type WorkflowExecutionStatus = z.infer<typeof WorkflowExecutionStatusSchema>;

// Workflow execution result schema
export const WorkflowExecutionResultSchema = z.object({
  executionId: z.string(),
  workflowId: z.string(),
  status: WorkflowExecutionStatusSchema,
  result: z.unknown().optional(),
  error: z.string().optional(),
  startedAt: z.string(),
  completedAt: z.string().optional(),
  duration: z.number().optional(),
  parameters: WorkflowParametersSchema,
  metadata: z.record(z.unknown()).optional(),
});

export type WorkflowExecutionResult<T = unknown> = Omit<z.infer<typeof WorkflowExecutionResultSchema>, 'result'> & {
  result?: T;
};

// Workflow definition schema
export const WorkflowDefinitionSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  version: z.string(),
  parameters: z.array(z.object({
    name: z.string(),
    type: z.string(),
    required: z.boolean().default(false),
    description: z.string().optional(),
    defaultValue: z.unknown().optional(),
  })),
  tags: z.array(z.string()).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type WorkflowDefinition = z.infer<typeof WorkflowDefinitionSchema>;

// Workflow list response schema
export const WorkflowListResponseSchema = z.array(WorkflowDefinitionSchema);
export type WorkflowListResponse = z.infer<typeof WorkflowListResponseSchema>;

// MCP server info schema
export const McpServerInfoSchema = z.object({
  name: z.string(),
  version: z.string(),
  description: z.string().optional(),
  capabilities: z.array(z.string()),
  endpoints: z.array(z.string()),
  health: ServerHealthSchema,
});

export type McpServerInfo = z.infer<typeof McpServerInfoSchema>;

// MCP connection status schema
export const McpConnectionStatusSchema = z.object({
  connected: z.boolean(),
  serverInfo: McpServerInfoSchema.optional(),
  lastConnectedAt: z.string().optional(),
  lastError: z.string().optional(),
});

export type McpConnectionStatus = z.infer<typeof McpConnectionStatusSchema>;