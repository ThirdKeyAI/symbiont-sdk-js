import { z } from 'zod';

/**
 * Retry configuration schema
 */
export const RetryConfigSchema = z.object({
  maxRetries: z.number().min(0).default(3),
  initialDelayMs: z.number().min(0).default(1000),
  maxDelayMs: z.number().min(0).default(30000),
  backoffMultiplier: z.number().min(1).default(2),
});

export type RetryConfig = z.infer<typeof RetryConfigSchema>;

/**
 * Cache configuration schema
 */
export const CacheConfigSchema = z.object({
  enabled: z.boolean().default(true),
  defaultTtlMs: z.number().min(0).default(300000), // 5 minutes
  maxSize: z.number().min(0).default(1000),
});

export type CacheConfig = z.infer<typeof CacheConfigSchema>;

/**
 * Client configuration schema
 */
export const ClientConfigSchema = z.object({
  runtimeApiUrl: z.string().url().refine(url => {
    if (!url) return true; // Optional field
    return url.startsWith('http://') || url.startsWith('https://');
  }, { message: 'Runtime API URL must use HTTP or HTTPS protocol' }).optional(),
  toolReviewApiUrl: z.string().url().refine(url => {
    if (!url) return true; // Optional field
    return url.startsWith('http://') || url.startsWith('https://');
  }, { message: 'Tool Review API URL must use HTTP or HTTPS protocol' }).optional(),
  timeout: z.number().min(0).default(30000),
  retryConfig: RetryConfigSchema.optional(),
  cacheConfig: CacheConfigSchema.optional(),
  userAgent: z.string().optional(),
  maxConcurrentRequests: z.number().min(1).default(10),
  requestInterceptors: z.array(z.any()).default([]),
  responseInterceptors: z.array(z.any()).default([]),
});

export type ClientConfig = z.infer<typeof ClientConfigSchema>;

/**
 * Default client configuration
 */
export const defaultClientConfig: Partial<ClientConfig> = {
  timeout: 30000,
  retryConfig: {
    maxRetries: 3,
    initialDelayMs: 1000,
    maxDelayMs: 30000,
    backoffMultiplier: 2,
  },
  cacheConfig: {
    enabled: true,
    defaultTtlMs: 300000,
    maxSize: 1000,
  },
  maxConcurrentRequests: 10,
  requestInterceptors: [],
  responseInterceptors: [],
};