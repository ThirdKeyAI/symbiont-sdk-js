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
 * Core configuration types - these are the source of truth
 * and are used by both the types and core packages
 */

// Retry configuration
export interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

// Cache configuration
export interface CacheConfig {
  enabled: boolean;
  defaultTtlMs: number;
  maxSize: number;
}

// Authentication types
export type AuthStrategy = 'jwt' | 'oauth' | 'api_key' | 'basic';

export interface JWTConfig {
  accessToken?: string;
  refreshToken?: string;
  secret?: string;
  refreshSecret?: string;
  expiresIn?: string;
  refreshExpiresIn?: string;
  algorithm?: 'HS256' | 'HS384' | 'HS512' | 'RS256' | 'RS384' | 'RS512';
  issuer?: string;
  audience?: string;
}

export interface OAuthConfig {
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
  scope?: string[];
  authorizationUrl?: string;
  tokenUrl?: string;
}

export interface AuthConfig {
  strategy: AuthStrategy;
  apiKey?: string;
  jwt?: JWTConfig;
  oauth?: OAuthConfig;
  basicAuth?: {
    username: string;
    password: string;
  };
  tokenRefreshThreshold?: number;
  autoRefresh?: boolean;
  tokenStorage?: 'memory' | 'localStorage' | 'sessionStorage' | 'custom';
  maxRetries?: number;
  retryDelayMs?: number;
}

// Client configuration
export interface ClientConfig {
  runtimeApiUrl?: string;
  toolReviewApiUrl?: string;
  timeout?: number;
  retryConfig?: RetryConfig;
  cacheConfig?: CacheConfig;
  userAgent?: string;
  maxConcurrentRequests?: number;
  requestInterceptors?: any[];
  responseInterceptors?: any[];
}

// Vector database types
export type DistanceMetric = 'Cosine' | 'Dot' | 'Euclid' | 'Manhattan';

export interface VectorConfig {
  provider: 'qdrant' | 'pinecone' | 'weaviate' | 'chroma';
  url?: string;
  apiKey?: string;
  timeout?: number;
  qdrant?: {
    host: string;
    port: number;
    grpcPort: number;
    preferGrpc: boolean;
    apiKey?: string;
    https: boolean;
    prefix?: string;
  };
  collections?: Record<string, any>;
  batchSize?: number;
  maxRetries?: number;
  retryDelayMs?: number;
  defaultLimit?: number;
  defaultWithPayload?: boolean;
  defaultWithVectors?: boolean;
  parallelism?: number;
  connectionPoolSize?: number;
}

// Database configuration types
export interface PoolConfig {
  min: number;
  max: number;
  acquireTimeoutMillis: number;
  createTimeoutMillis: number;
  destroyTimeoutMillis: number;
  idleTimeoutMillis: number;
  reapIntervalMillis: number;
  createRetryIntervalMillis: number;
  propagateCreateError: boolean;
}

export interface SSLConfig {
  enabled: boolean;
  rejectUnauthorized: boolean;
  ca?: string;
  cert?: string;
  key?: string;
  passphrase?: string;
}

export interface DatabaseConfig {
  provider: 'postgresql' | 'mysql' | 'sqlite' | 'mongodb' | 'redis';
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
  url?: string;
  ssl?: SSLConfig;
  pool?: PoolConfig;
  timeout?: number;
  charset?: string;
  timezone?: string;
  schema?: string;
  searchPath?: string[];
  filename?: string;
  authSource?: string;
  replicaSet?: string;
  readPreference?: 'primary' | 'primaryPreferred' | 'secondary' | 'secondaryPreferred' | 'nearest';
  keyPrefix?: string;
  db?: number;
  debug?: boolean;
  acquireConnectionTimeout?: number;
  useNullAsDefault?: boolean;
  maxRetries?: number;
  retryDelayMs?: number;
}

// Logging configuration types
export type LogLevel = 'error' | 'warn' | 'info' | 'http' | 'verbose' | 'debug' | 'silly';
export type LogFormat = 'json' | 'simple' | 'combined' | 'dev' | 'tiny';
export type TransportType = 'console' | 'file' | 'http' | 'stream' | 'syslog';

export interface LoggingConfig {
  level: LogLevel;
  format: LogFormat;
  silent?: boolean;
  exitOnError?: boolean;
  transports?: any[];
  maxsize?: number;
  maxFiles?: number;
  defaultMeta?: Record<string, any>;
  profiling?: boolean;
  timing?: boolean;
  sanitize?: boolean;
  redactFields?: string[];
  logRequests?: boolean;
  logResponses?: boolean;
  logRequestBodies?: boolean;
  logResponseBodies?: boolean;
  maxBodyLength?: number;
  logErrors?: boolean;
  logStackTrace?: boolean;
  development?: {
    level: LogLevel;
    prettyPrint: boolean;
  };
  production?: {
    level: LogLevel;
    prettyPrint: boolean;
  };
}

/**
 * Enhanced nested configuration structure for Symbiont SDK v0.3.1
 * This replaces the flat configuration from v1.x (BREAKING CHANGE)
 */
export interface EnhancedSymbiontConfig {
  // Core client settings
  client: {
    /** Runtime API base URL */
    runtimeApiUrl?: string;
    /** Tool Review API base URL */
    toolReviewApiUrl?: string;
    /** Request timeout in milliseconds */
    timeout?: number;
    /** Retry configuration */
    retryConfig?: {
      maxRetries: number;
      initialDelayMs: number;
      maxDelayMs: number;
      backoffMultiplier: number;
    };
    /** Cache configuration */
    cacheConfig?: {
      enabled: boolean;
      defaultTtlMs: number;
      maxSize: number;
    };
    /** User agent string */
    userAgent?: string;
    /** Maximum concurrent requests */
    maxConcurrentRequests?: number;
  };

  // Authentication configuration
  auth: {
    /** Authentication strategy */
    strategy: 'jwt' | 'oauth' | 'api_key' | 'basic';
    /** API key for simple authentication */
    apiKey?: string;
    /** JWT configuration */
    jwt?: {
      accessToken?: string;
      refreshToken?: string;
      secret?: string;
      refreshSecret?: string;
      expiresIn?: string;
      refreshExpiresIn?: string;
      algorithm?: 'HS256' | 'HS384' | 'HS512' | 'RS256' | 'RS384' | 'RS512';
      issuer?: string;
      audience?: string;
    };
    /** OAuth configuration */
    oauth?: {
      clientId?: string;
      clientSecret?: string;
      redirectUri?: string;
      scope?: string[];
      authorizationUrl?: string;
      tokenUrl?: string;
    };
    /** Basic authentication */
    basicAuth?: {
      username: string;
      password: string;
    };
    /** Token refresh threshold (0-1, when to refresh) */
    tokenRefreshThreshold?: number;
    /** Enable automatic token refresh */
    autoRefresh?: boolean;
    /** Token storage method */
    tokenStorage?: 'memory' | 'localStorage' | 'sessionStorage' | 'custom';
  };

  // Vector database configuration
  vector?: {
    /** Vector database provider */
    provider: 'qdrant' | 'pinecone' | 'weaviate' | 'chroma';
    /** Database URL */
    url?: string;
    /** API key for authentication */
    apiKey?: string;
    /** Connection timeout */
    timeout?: number;
    /** Qdrant-specific settings */
    qdrant?: {
      host: string;
      port: number;
      grpcPort: number;
      preferGrpc: boolean;
      https: boolean;
      prefix?: string;
    };
    /** Default collection configurations */
    collections?: Record<string, any>;
    /** Batch size for operations */
    batchSize?: number;
    /** Search defaults */
    defaultLimit?: number;
    defaultWithPayload?: boolean;
    defaultWithVectors?: boolean;
  };

  // Database configuration
  database?: {
    /** Database provider */
    provider: 'postgresql' | 'mysql' | 'sqlite' | 'mongodb' | 'redis';
    /** Database host */
    host?: string;
    /** Database port */
    port?: number;
    /** Database name */
    database?: string;
    /** Database username */
    username?: string;
    /** Database password */
    password?: string;
    /** Connection string (alternative to individual settings) */
    url?: string;
    /** SSL configuration */
    ssl?: {
      enabled: boolean;
      rejectUnauthorized: boolean;
      ca?: string;
      cert?: string;
      key?: string;
    };
    /** Connection pool settings */
    pool?: {
      min: number;
      max: number;
      acquireTimeoutMillis: number;
      idleTimeoutMillis: number;
    };
    /** Connection timeout */
    timeout?: number;
  };

  // Logging configuration
  logging?: {
    /** Log level */
    level: 'error' | 'warn' | 'info' | 'http' | 'verbose' | 'debug' | 'silly';
    /** Log format */
    format: 'json' | 'simple' | 'combined' | 'dev' | 'tiny';
    /** Silent mode */
    silent?: boolean;
    /** Log requests */
    logRequests?: boolean;
    /** Log responses */
    logResponses?: boolean;
    /** Log errors */
    logErrors?: boolean;
    /** Fields to redact in logs */
    redactFields?: string[];
    /** Maximum log file size */
    maxsize?: number;
    /** Maximum number of log files */
    maxFiles?: number;
  };

  // Environment and global settings
  /** Environment setting */
  environment: 'development' | 'staging' | 'production';
  /** Enable debug mode */
  debug: boolean;
  /** Validation mode for runtime validation */
  validationMode?: ValidationMode;
  /** Path to secrets file (JSON or .env format) */
  secretsFile?: string;
}

/**
 * Enhanced configuration schema with validation
 */
export const EnhancedSymbiontConfigSchema = z.object({
  client: z.object({
    runtimeApiUrl: z.string().url().optional(),
    toolReviewApiUrl: z.string().url().optional(),
    timeout: z.number().min(0).default(30000),
    retryConfig: z.object({
      maxRetries: z.number().min(0).default(3),
      initialDelayMs: z.number().min(0).default(1000),
      maxDelayMs: z.number().min(0).default(30000),
      backoffMultiplier: z.number().min(1).default(2),
    }).optional(),
    cacheConfig: z.object({
      enabled: z.boolean().default(true),
      defaultTtlMs: z.number().min(0).default(300000),
      maxSize: z.number().min(0).default(1000),
    }).optional(),
    userAgent: z.string().optional(),
    maxConcurrentRequests: z.number().min(1).default(10),
  }),
  
  auth: z.object({
    strategy: z.enum(['jwt', 'oauth', 'api_key', 'basic']).default('jwt'),
    apiKey: z.string().optional(),
    jwt: z.object({
      accessToken: z.string().optional(),
      refreshToken: z.string().optional(),
      secret: z.string().optional(),
      refreshSecret: z.string().optional(),
      expiresIn: z.string().default('1h'),
      refreshExpiresIn: z.string().default('7d'),
      algorithm: z.enum(['HS256', 'HS384', 'HS512', 'RS256', 'RS384', 'RS512']).default('HS256'),
      issuer: z.string().optional(),
      audience: z.string().optional(),
    }).optional(),
    oauth: z.object({
      clientId: z.string().optional(),
      clientSecret: z.string().optional(),
      redirectUri: z.string().url().optional(),
      scope: z.array(z.string()).default([]),
      authorizationUrl: z.string().url().optional(),
      tokenUrl: z.string().url().optional(),
    }).optional(),
    basicAuth: z.object({
      username: z.string(),
      password: z.string(),
    }).optional(),
    tokenRefreshThreshold: z.number().min(0).max(1).default(0.1),
    autoRefresh: z.boolean().default(true),
    tokenStorage: z.enum(['memory', 'localStorage', 'sessionStorage', 'custom']).default('memory'),
  }),
  
  vector: z.object({
    provider: z.enum(['qdrant', 'pinecone', 'weaviate', 'chroma']).default('qdrant'),
    url: z.string().url().optional(),
    apiKey: z.string().optional(),
    timeout: z.number().min(0).default(60000),
    qdrant: z.object({
      host: z.string().default('localhost'),
      port: z.number().min(1).max(65535).default(6333),
      grpcPort: z.number().min(1).max(65535).default(6334),
      preferGrpc: z.boolean().default(false),
      https: z.boolean().default(false),
      prefix: z.string().optional(),
    }).optional(),
    collections: z.record(z.string(), z.any()).default({}),
    batchSize: z.number().min(1).default(100),
    defaultLimit: z.number().min(1).default(10),
    defaultWithPayload: z.boolean().default(true),
    defaultWithVectors: z.boolean().default(false),
  }).optional(),
  
  database: z.object({
    provider: z.enum(['postgresql', 'mysql', 'sqlite', 'mongodb', 'redis']).default('postgresql'),
    host: z.string().default('localhost'),
    port: z.number().min(1).max(65535).optional(),
    database: z.string().optional(),
    username: z.string().optional(),
    password: z.string().optional(),
    url: z.string().optional(),
    ssl: z.object({
      enabled: z.boolean().default(false),
      rejectUnauthorized: z.boolean().default(true),
      ca: z.string().optional(),
      cert: z.string().optional(),
      key: z.string().optional(),
    }).optional(),
    pool: z.object({
      min: z.number().min(0).default(0),
      max: z.number().min(1).default(10),
      acquireTimeoutMillis: z.number().min(0).default(60000),
      idleTimeoutMillis: z.number().min(0).default(30000),
    }).optional(),
    timeout: z.number().min(0).default(30000),
  }).optional(),
  
  logging: z.object({
    level: z.enum(['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly']).default('info'),
    format: z.enum(['json', 'simple', 'combined', 'dev', 'tiny']).default('simple'),
    silent: z.boolean().default(false),
    logRequests: z.boolean().default(false),
    logResponses: z.boolean().default(false),
    logErrors: z.boolean().default(true),
    redactFields: z.array(z.string()).default(['password', 'token', 'secret', 'key']),
    maxsize: z.number().min(0).default(5242880),
    maxFiles: z.number().min(0).default(5),
  }).optional(),
  
  environment: z.enum(['development', 'staging', 'production']).default('development'),
  debug: z.boolean().default(false),
  validationMode: z.enum(['strict', 'performance', 'development']).default('development'),
  secretsFile: z.string().optional(),
});

/**
 * Legacy configuration interface (DEPRECATED - for backward compatibility only)
 * Use EnhancedSymbiontConfig instead
 * @deprecated Use EnhancedSymbiontConfig for new implementations
 */
export interface SymbiontConfig {
  /** @deprecated Use config.client.runtimeApiUrl */
  runtimeApiUrl?: string;
  /** @deprecated Use config.client.toolReviewApiUrl */
  toolReviewApiUrl?: string;
  /** @deprecated Use config.auth.apiKey */
  apiKey?: string;
  /** @deprecated Use config.auth.jwt.accessToken */
  jwt?: string;
  /** @deprecated Use config.validationMode */
  validationMode?: ValidationMode;
  /** @deprecated Use config.environment */
  environment?: Environment;
  /** @deprecated Use config.client.timeout */
  timeout?: number;
  /** @deprecated Use config.client.retryConfig */
  retryConfig?: {
    maxRetries: number;
    initialDelayMs: number;
    maxDelayMs: number;
    backoffMultiplier: number;
  };
  /** @deprecated Use config.client.cacheConfig */
  cacheConfig?: {
    enabled: boolean;
    defaultTtlMs: number;
    maxSize: number;
  };
  /** @deprecated Use config.debug */
  debug?: boolean;
  /** @deprecated Use config.secretsFile */
  secretsFile?: string;
}

/**
 * Legacy configuration schema (DEPRECATED)
 * @deprecated Use EnhancedSymbiontConfigSchema instead
 */
export const SymbiontConfigSchema = z.object({
  runtimeApiUrl: z.string().url().optional(),
  toolReviewApiUrl: z.string().url().optional(),
  apiKey: z.string().optional(),
  jwt: z.string().optional(),
  validationMode: z.enum(['strict', 'performance', 'development']).default('development'),
  environment: z.enum(['development', 'staging', 'production']).default('development'),
  timeout: z.number().min(0).default(30000),
  retryConfig: z.object({
    maxRetries: z.number().min(0).default(3),
    initialDelayMs: z.number().min(0).default(1000),
    maxDelayMs: z.number().min(0).default(30000),
    backoffMultiplier: z.number().min(1).default(2),
  }).optional(),
  cacheConfig: z.object({
    enabled: z.boolean().default(true),
    defaultTtlMs: z.number().min(0).default(300000),
    maxSize: z.number().min(0).default(1000),
  }).optional(),
  debug: z.boolean().default(false),
  secretsFile: z.string().optional(),
});

// Legacy types are now defined above as proper interfaces