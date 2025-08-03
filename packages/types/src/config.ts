import { z } from 'zod';

/**
 * Validation modes for the SDK
 */
export type ValidationMode = 'strict' | 'performance' | 'development';

/**
 * Environment types
 */
export type Environment = 'development' | 'staging' | 'production';

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
 * Main SDK configuration schema
 */
export const SymbiontConfigSchema = z.object({
  // API Configuration
  runtimeApiUrl: z.string().url().optional(),
  toolReviewApiUrl: z.string().url().optional(),
  
  // Authentication
  apiKey: z.string().optional(),
  jwt: z.string().optional(),
  
  // Validation Mode
  validationMode: z.enum(['strict', 'performance', 'development']).default('development'),
  
  // Environment
  environment: z.enum(['development', 'staging', 'production']).default('development'),
  
  // Advanced Configuration
  timeout: z.number().min(0).default(30000),
  retryConfig: RetryConfigSchema.optional(),
  cacheConfig: CacheConfigSchema.optional(),
  debug: z.boolean().default(false),
  
  // Secrets Configuration
  secretsFile: z.string().optional(),
});

/**
 * Configuration interface for the Symbiont SDK
 */
export interface SymbiontConfig {
  /** Runtime API base URL */
  runtimeApiUrl?: string;
  /** Tool Review API base URL */
  toolReviewApiUrl?: string;
  
  /** API key for Runtime API authentication */
  apiKey?: string;
  /** JWT token for Tool Review API authentication */
  jwt?: string;
  
  /** Validation mode for runtime validation */
  validationMode?: ValidationMode;
  /** Environment setting */
  environment?: Environment;
  
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Retry configuration */
  retryConfig?: RetryConfig;
  /** Cache configuration */
  cacheConfig?: CacheConfig;
  /** Enable debug logging */
  debug?: boolean;
  
  /** Path to secrets file (JSON or .env format) */
  secretsFile?: string;
}