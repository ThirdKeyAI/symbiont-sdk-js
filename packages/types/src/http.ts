/**
 * HTTP Endpoint Management Types
 * 
 * Provides types for dynamic HTTP endpoint creation and management
 */

import { z } from 'zod';

/**
 * HTTP methods supported by the endpoint manager
 */
export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
  PATCH = 'PATCH',
  OPTIONS = 'OPTIONS',
  HEAD = 'HEAD'
}

/**
 * Authentication requirements for an endpoint
 */
export interface AuthRequirement {
  /** Whether authentication is required */
  required: boolean;
  /** Required roles for access */
  roles?: string[];
  /** Required permissions for access */
  permissions?: string[];
  /** Scope limitations */
  scope?: string;
}

/**
 * Request to create a new HTTP endpoint
 */
export interface HttpEndpointCreateRequest {
  /** The URL path for the endpoint */
  path: string;
  /** HTTP method for the endpoint */
  method: HttpMethod;
  /** Handler function name or identifier */
  handler: string;
  /** Optional middleware to apply */
  middleware?: string[];
  /** Authentication requirements */
  auth?: AuthRequirement;
  /** Endpoint description */
  description?: string;
  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Metrics tracking for an endpoint
 */
export interface EndpointMetrics {
  /** Total number of requests to this endpoint */
  requestCount: number;
  /** Average response time in milliseconds */
  averageResponseTime: number;
  /** Error rate as a percentage (0-100) */
  errorRate: number;
  /** Timestamp of last access */
  lastAccessed: Date;
  /** Response status code counts */
  statusCodes: Record<number, number>;
  /** Peak requests per minute */
  peakRpm: number;
  /** Current active requests */
  activeRequests: number;
}

/**
 * Information about a registered HTTP endpoint
 */
export interface HttpEndpointInfo {
  /** Unique identifier for the endpoint */
  id: string;
  /** The URL path */
  path: string;
  /** HTTP method */
  method: HttpMethod;
  /** Current status of the endpoint */
  status: 'active' | 'inactive' | 'error';
  /** Handler function identifier */
  handler: string;
  /** Applied middleware */
  middleware?: string[];
  /** Authentication requirements */
  auth?: AuthRequirement;
  /** Endpoint description */
  description?: string;
  /** Metrics for this endpoint */
  metrics: EndpointMetrics;
  /** When the endpoint was created */
  createdAt: Date;
  /** When the endpoint was last updated */
  updatedAt: Date;
  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Request to update an existing endpoint
 */
export interface HttpEndpointUpdateRequest {
  /** Endpoint ID to update */
  id: string;
  /** New handler (optional) */
  handler?: string;
  /** New middleware configuration (optional) */
  middleware?: string[];
  /** New authentication requirements (optional) */
  auth?: AuthRequirement;
  /** New description (optional) */
  description?: string;
  /** New status (optional) */
  status?: 'active' | 'inactive';
  /** Additional metadata (optional) */
  metadata?: Record<string, any>;
}

/**
 * Filter options for listing endpoints
 */
export interface EndpointListFilter {
  /** Filter by status */
  status?: 'active' | 'inactive' | 'error';
  /** Filter by HTTP method */
  method?: HttpMethod;
  /** Filter by path pattern */
  pathPattern?: string;
  /** Filter by handler */
  handler?: string;
  /** Pagination offset */
  offset?: number;
  /** Pagination limit */
  limit?: number;
}

/**
 * Response for listing endpoints
 */
export interface EndpointListResponse {
  /** List of endpoints */
  endpoints: HttpEndpointInfo[];
  /** Total count of endpoints matching filter */
  total: number;
  /** Pagination offset */
  offset: number;
  /** Pagination limit */
  limit: number;
}

/**
 * Configuration for the HTTP endpoint manager
 */
export interface HttpEndpointConfig {
  /** Port to run the HTTP server on */
  port?: number;
  /** Host to bind the server to */
  host?: string;
  /** Enable CORS */
  cors?: boolean;
  /** Maximum request body size */
  maxBodySize?: string;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Enable request logging */
  logging?: boolean;
  /** Enable metrics collection */
  metrics?: boolean;
  /** Rate limiting configuration */
  rateLimit?: {
    windowMs: number;
    max: number;
  };
}

// Zod schemas for validation

export const HttpMethodSchema = z.nativeEnum(HttpMethod);

export const AuthRequirementSchema = z.object({
  required: z.boolean(),
  roles: z.array(z.string()).optional(),
  permissions: z.array(z.string()).optional(),
  scope: z.string().optional(),
});

export const HttpEndpointCreateRequestSchema = z.object({
  path: z.string().min(1),
  method: HttpMethodSchema,
  handler: z.string().min(1),
  middleware: z.array(z.string()).optional(),
  auth: AuthRequirementSchema.optional(),
  description: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

export const EndpointMetricsSchema = z.object({
  requestCount: z.number().int().min(0),
  averageResponseTime: z.number().min(0),
  errorRate: z.number().min(0).max(100),
  lastAccessed: z.date(),
  statusCodes: z.record(z.string(), z.number().int().min(0)),
  peakRpm: z.number().min(0),
  activeRequests: z.number().int().min(0),
});

export const HttpEndpointInfoSchema = z.object({
  id: z.string(),
  path: z.string(),
  method: HttpMethodSchema,
  status: z.enum(['active', 'inactive', 'error']),
  handler: z.string(),
  middleware: z.array(z.string()).optional(),
  auth: AuthRequirementSchema.optional(),
  description: z.string().optional(),
  metrics: EndpointMetricsSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
  metadata: z.record(z.any()).optional(),
});

export const HttpEndpointUpdateRequestSchema = z.object({
  id: z.string(),
  handler: z.string().optional(),
  middleware: z.array(z.string()).optional(),
  auth: AuthRequirementSchema.optional(),
  description: z.string().optional(),
  status: z.enum(['active', 'inactive']).optional(),
  metadata: z.record(z.any()).optional(),
});

export const EndpointListFilterSchema = z.object({
  status: z.enum(['active', 'inactive', 'error']).optional(),
  method: HttpMethodSchema.optional(),
  pathPattern: z.string().optional(),
  handler: z.string().optional(),
  offset: z.number().int().min(0).optional(),
  limit: z.number().int().min(1).max(100).optional(),
});

export const HttpEndpointConfigSchema = z.object({
  port: z.number().int().min(1).max(65535).optional(),
  host: z.string().optional(),
  cors: z.boolean().optional(),
  maxBodySize: z.string().optional(),
  timeout: z.number().int().min(1).optional(),
  logging: z.boolean().optional(),
  metrics: z.boolean().optional(),
  rateLimit: z.object({
    windowMs: z.number().int().min(1),
    max: z.number().int().min(1),
  }).optional(),
});