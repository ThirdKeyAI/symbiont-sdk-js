/**
 * @symbi/types - Shared TypeScript interfaces and Zod schemas for Symbiont SDK
 */

// Configuration types
export * from './config';

// Authentication types
export * from './auth';

// Agent types
export * from './agent';

// Tool Review types
export * from './tool-review';

// Policy types
export * from './policy';

// Secret types
export * from './secrets';

// MCP types
export * from './mcp';

// Memory types
export * from './memory';

// Vector types
export * from './vector';

// HTTP types
export * from './http';

// Schedule types
export * from './schedule';

// Channel types
export * from './channel';

// System types
export * from './system';

// AgentPin types
export * from './agentpin';

// Webhook types
export * from './webhook';

// Skills types
export * from './skills';

// Metrics types
export * from './metrics';

// Common utility types
export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: unknown;
  timeout?: number;
  requestSchemaKey?: string;
  responseSchemaKey?: string;
  cacheable?: boolean;
}

export interface RequestContext {
  endpoint: string;
  method: string;
  headers: Record<string, string>;
  body?: unknown;
  timeout: number;
  requestSchemaKey?: string;
  responseSchemaKey?: string;
  cacheable: boolean;
  cacheKey?: string;
  retryCount: number;
  maxRetries: number;
  response?: unknown;
  fromCache?: boolean;
}

export interface ErrorContext {
  endpoint: string;
  method: string;
  retryCount: number;
  authManager?: any;
}

export type NextFunction = () => Promise<RequestContext>;