import { z } from 'zod';

/**
 * Policy-related types and schemas for the Symbiont SDK
 * Based on the policy DSL syntax: allow/deny/require/audit with conditions
 */

// Policy operator schemas
export const PolicyOperatorSchema = z.enum([
  'equals',
  'not_equals',
  'greater_than',
  'less_than',
  'greater_than_or_equal',
  'less_than_or_equal',
  'contains',
  'not_contains',
  'starts_with',
  'ends_with',
  'in',
  'not_in',
  'exists',
  'not_exists'
]);

export type PolicyOperator = z.infer<typeof PolicyOperatorSchema>;

// Policy condition schema
export const PolicyConditionSchema = z.object({
  fact: z.string(),
  operator: PolicyOperatorSchema,
  value: z.union([z.string(), z.number(), z.boolean(), z.array(z.unknown())]),
});

export type PolicyCondition = z.infer<typeof PolicyConditionSchema>;

// Policy effect schema (what the rule does)
export const PolicyEffectSchema = z.enum(['allow', 'deny', 'require', 'audit']);
export type PolicyEffect = z.infer<typeof PolicyEffectSchema>;

// Policy rule schema
export const PolicyRuleSchema = z.object({
  id: z.string(),
  effect: PolicyEffectSchema,
  actions: z.array(z.string()),
  conditions: z.array(PolicyConditionSchema).optional(),
  target: z.string().optional(),
  priority: z.number().min(0).default(0),
  description: z.string().optional(),
});

export type PolicyRule = z.infer<typeof PolicyRuleSchema>;

// Audit specification schema
export const AuditSpecificationSchema = z.object({
  enabled: z.boolean().default(true),
  level: z.enum(['basic', 'detailed', 'full']).default('basic'),
  destinations: z.array(z.string()).default(['console']),
  includeContext: z.boolean().default(false),
  retentionDays: z.number().min(1).optional(),
});

export type AuditSpecification = z.infer<typeof AuditSpecificationSchema>;

// Policy configuration schema
export const PolicyConfigurationSchema = z.object({
  enforceMode: z.enum(['strict', 'permissive', 'monitor']).default('strict'),
  defaultEffect: PolicyEffectSchema.default('deny'),
  inheritanceEnabled: z.boolean().default(true),
  conflictResolution: z.enum(['deny_overrides', 'allow_overrides', 'first_applicable']).default('deny_overrides'),
  audit: AuditSpecificationSchema.optional(),
});

export type PolicyConfiguration = z.infer<typeof PolicyConfigurationSchema>;

// Complete policy schema
export const PolicySchema = z.object({
  id: z.string(),
  name: z.string(),
  version: z.string().default('1.0.0'),
  description: z.string().optional(),
  rules: z.array(PolicyRuleSchema),
  configuration: PolicyConfigurationSchema.optional(),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type Policy = z.infer<typeof PolicySchema>;

// Enhanced PolicyDefinition schema (replacement for the basic one in agent.ts)
export const EnhancedPolicyDefinitionSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  rules: z.array(PolicyRuleSchema),
  configuration: PolicyConfigurationSchema.optional(),
});

export type EnhancedPolicyDefinition = z.infer<typeof EnhancedPolicyDefinitionSchema>;

// Policy evaluation context schema
export const PolicyEvaluationContextSchema = z.object({
  agentId: z.string(),
  action: z.string(),
  resource: z.string().optional(),
  environment: z.record(z.unknown()).optional(),
  timestamp: z.string(),
  userId: z.string().optional(),
  sessionId: z.string().optional(),
});

export type PolicyEvaluationContext = z.infer<typeof PolicyEvaluationContextSchema>;

// Policy evaluation result schema
export const PolicyEvaluationResultSchema = z.object({
  decision: z.enum(['allow', 'deny']),
  appliedRules: z.array(z.string()),
  reason: z.string().optional(),
  context: PolicyEvaluationContextSchema,
  auditRequired: z.boolean().default(false),
});

export type PolicyEvaluationResult = z.infer<typeof PolicyEvaluationResultSchema>;

// Policy validation error schema
export const PolicyValidationErrorSchema = z.object({
  field: z.string(),
  message: z.string(),
  code: z.string(),
  value: z.unknown().optional(),
});

export type PolicyValidationError = z.infer<typeof PolicyValidationErrorSchema>;

// Policy validation result schema
export const PolicyValidationResultSchema = z.object({
  valid: z.boolean(),
  errors: z.array(PolicyValidationErrorSchema),
  warnings: z.array(PolicyValidationErrorSchema).optional(),
});

export type PolicyValidationResult = z.infer<typeof PolicyValidationResultSchema>;