import { z } from 'zod';

// ---------------------------------------------------------------------------
// Communication Policy Gate types
// ---------------------------------------------------------------------------

export const CommunicationRuleSchema = z.object({
  id: z.string().optional(),
  fromAgent: z.string(),
  toAgent: z.string(),
  action: z.string(),
  effect: z.enum(['allow', 'deny']),
  reason: z.string().optional(),
  priority: z.number().optional(),
  maxDepth: z.number().optional(),
});

export type CommunicationRule = z.infer<typeof CommunicationRuleSchema>;

export const CommunicationEvaluationSchema = z.object({
  allowed: z.boolean(),
  rule: CommunicationRuleSchema.optional(),
  reason: z.string(),
});

export type CommunicationEvaluation = z.infer<typeof CommunicationEvaluationSchema>;

export const EvaluateCommunicationRequestSchema = z.object({
  sender: z.string(),
  recipient: z.string(),
  action: z.string(),
});

export type EvaluateCommunicationRequest = z.infer<typeof EvaluateCommunicationRequestSchema>;
