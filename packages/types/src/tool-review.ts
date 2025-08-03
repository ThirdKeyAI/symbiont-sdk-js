import { z } from 'zod';

/**
 * Tool Review API types and schemas for the Symbiont SDK
 */

// Basic enum schemas
export const ReviewStatusSchema = z.enum([
  'pending',
  'analyzing', 
  'awaiting_human_review',
  'approved',
  'rejected',
  'signed',
  'failed'
]);

export type ReviewStatus = z.infer<typeof ReviewStatusSchema>;

export const SecuritySeveritySchema = z.enum([
  'low',
  'medium', 
  'high',
  'critical'
]);

export type SecuritySeverity = z.infer<typeof SecuritySeveritySchema>;

export const SecurityCategorySchema = z.enum([
  'vulnerability',
  'malicious_code',
  'resource_abuse',
  'privacy_violation',
  'policy_violation'
]);

export type SecurityCategory = z.infer<typeof SecurityCategorySchema>;

export const ReviewDecisionSchema = z.enum([
  'approved',
  'rejected',
  'escalated'
]);

export type ReviewDecision = z.infer<typeof ReviewDecisionSchema>;

export const ReviewPrioritySchema = z.enum([
  'low',
  'normal',
  'high',
  'urgent'
]);

export type ReviewPriority = z.infer<typeof ReviewPrioritySchema>;

// Provider information schema
export const ProviderInfoSchema = z.object({
  name: z.string(),
  domain: z.string(),
  publicKeyUrl: z.string().url().optional(),
  contact: z.string().email().optional(),
});

export type ProviderInfo = z.infer<typeof ProviderInfoSchema>;

// Security finding schema
export const SecurityFindingSchema = z.object({
  id: z.string(),
  category: SecurityCategorySchema,
  severity: SecuritySeveritySchema,
  title: z.string(),
  description: z.string(),
  location: z.object({
    file: z.string().optional(),
    line: z.number().optional(),
    column: z.number().optional(),
  }).optional(),
  recommendation: z.string().optional(),
  confidence: z.number().min(0).max(1),
});

export type SecurityFinding = z.infer<typeof SecurityFindingSchema>;

// Security analysis schema
export const SecurityAnalysisSchema = z.object({
  analysisId: z.string(),
  riskScore: z.number().min(0).max(1),
  findings: z.array(SecurityFindingSchema),
  summary: z.string(),
  recommendation: z.string(),
  analyzedAt: z.string(),
  analyzer: z.object({
    name: z.string(),
    version: z.string(),
  }),
});

export type SecurityAnalysis = z.infer<typeof SecurityAnalysisSchema>;

// Tool submission schema
export const ToolSubmissionSchema = z.object({
  toolName: z.string(),
  version: z.string().optional(),
  schemaContent: z.string(),
  sourceCode: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  providerInfo: ProviderInfoSchema,
  priority: ReviewPrioritySchema.default('normal'),
  tags: z.array(z.string()).optional(),
});

export type ToolSubmission = z.infer<typeof ToolSubmissionSchema>;

// Review session schema
export const ReviewSessionSchema = z.object({
  reviewId: z.string(),
  toolName: z.string(),
  version: z.string().optional(),
  status: ReviewStatusSchema,
  priority: ReviewPrioritySchema,
  submittedAt: z.string(),
  updatedAt: z.string(),
  completedAt: z.string().optional(),
  submitter: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().email().optional(),
  }),
  providerInfo: ProviderInfoSchema,
  securityAnalysis: SecurityAnalysisSchema.optional(),
  humanReviews: z.array(z.object({
    reviewerId: z.string(),
    reviewerName: z.string(),
    decision: ReviewDecisionSchema,
    comments: z.string().optional(),
    reviewedAt: z.string(),
  })).optional(),
  finalDecision: ReviewDecisionSchema.optional(),
  rejectionReason: z.string().optional(),
  signingInfo: z.object({
    signedAt: z.string(),
    signature: z.string(),
    certificateId: z.string(),
  }).optional(),
});

export type ReviewSession = z.infer<typeof ReviewSessionSchema>;

// Pagination parameters schema
export const PaginationParamsSchema = z.object({
  page: z.number().min(1).default(1),
  pageSize: z.number().min(1).max(100).default(20),
  sortBy: z.enum(['submittedAt', 'updatedAt', 'priority', 'status']).optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  status: ReviewStatusSchema.optional(),
  priority: ReviewPrioritySchema.optional(),
  submitter: z.string().optional(),
});

export type PaginationParams = z.infer<typeof PaginationParamsSchema>;

// Response schemas
export const SubmitForReviewResponseSchema = z.object({
  reviewId: z.string(),
  status: ReviewStatusSchema,
  estimatedCompletionTime: z.string().optional(),
  message: z.string().optional(),
});

export type SubmitForReviewResponse = z.infer<typeof SubmitForReviewResponseSchema>;

export const ListReviewSessionsResponseSchema = z.object({
  sessions: z.array(ReviewSessionSchema),
  pagination: z.object({
    page: z.number(),
    pageSize: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
});

export type ListReviewSessionsResponse = z.infer<typeof ListReviewSessionsResponseSchema>;

export const ReviewQueueItemSchema = z.object({
  reviewId: z.string(),
  toolName: z.string(),
  priority: ReviewPrioritySchema,
  submittedAt: z.string(),
  waitingTime: z.number(), // minutes
  analysisId: z.string().optional(),
  riskScore: z.number().min(0).max(1).optional(),
});

export type ReviewQueueItem = z.infer<typeof ReviewQueueItemSchema>;

export const ReviewQueueResponseSchema = z.object({
  queue: z.array(ReviewQueueItemSchema),
  stats: z.object({
    totalPending: z.number(),
    averageWaitTime: z.number(),
    highPriorityCount: z.number(),
  }),
});

export type ReviewQueueResponse = z.infer<typeof ReviewQueueResponseSchema>;

export const DecisionSubmissionSchema = z.object({
  decision: ReviewDecisionSchema,
  comments: z.string().optional(),
  requiresAdditionalReview: z.boolean().optional(),
});

export type DecisionSubmission = z.infer<typeof DecisionSubmissionSchema>;

export const DecisionSubmissionResponseSchema = z.object({
  reviewId: z.string(),
  decision: ReviewDecisionSchema,
  processedAt: z.string(),
  nextAction: z.string().optional(),
});

export type DecisionSubmissionResponse = z.infer<typeof DecisionSubmissionResponseSchema>;

export const SigningStatusSchema = z.object({
  reviewId: z.string(),
  status: z.enum(['pending', 'signing', 'signed', 'failed']),
  signedAt: z.string().optional(),
  downloadUrl: z.string().url().optional(),
  error: z.string().optional(),
});

export type SigningStatus = z.infer<typeof SigningStatusSchema>;

export const StatsResponseSchema = z.object({
  totalSubmissions: z.number(),
  totalApproved: z.number(),
  totalRejected: z.number(),
  averageProcessingTime: z.number(), // minutes
  securityFindings: z.object({
    total: z.number(),
    bySeverity: z.record(SecuritySeveritySchema, z.number()),
    byCategory: z.record(SecurityCategorySchema, z.number()),
  }),
  recentActivity: z.array(z.object({
    date: z.string(),
    submissions: z.number(),
    approvals: z.number(),
    rejections: z.number(),
  })),
});

export type StatsResponse = z.infer<typeof StatsResponseSchema>;