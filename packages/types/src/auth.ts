/**
 * Authentication types for the Symbiont SDK
 */

/**
 * Health status response
 */
export interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  version?: string;
  uptime?: number;
}

/**
 * Token cache data structure
 */
export interface TokenData {
  value: string;
  expiresAt: Date;
  createdAt: Date;
}

/**
 * Authentication context for requests
 */
export interface AuthContext {
  endpoint: string;
  method: string;
  headers?: Record<string, string>;
}

/**
 * Runtime authentication handler interface
 */
export interface RuntimeAuthHandler {
  getHeaders(): Promise<Record<string, string>>;
  refresh(): Promise<void>;
  isValid(): Promise<boolean>;
}

/**
 * Tool Review authentication handler interface  
 */
export interface ToolReviewAuthHandler {
  getHeaders(): Promise<Record<string, string>>;
  refresh(): Promise<void>;
  isValid(): Promise<boolean>;
}

/**
 * Token cache interface
 */
export interface TokenCache {
  get(key: string): Promise<TokenData | null>;
  set(key: string, data: TokenData): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}