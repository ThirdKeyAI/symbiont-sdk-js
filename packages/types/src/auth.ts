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

/**
 * Permission interface for RBAC system
 */
export interface Permission {
  id: string;
  resource: string;
  action: string;
  scope?: string;
}

/**
 * Role interface for RBAC system
 */
export interface Role {
  id: string;
  name: string;
  permissions: Permission[];
  description?: string;
}

/**
 * User model with roles and permissions
 */
export interface AuthUser {
  id: string;
  email: string;
  roles: Role[];
  metadata?: Record<string, any>;
}

/**
 * JWT token model with metadata
 */
export interface AuthToken {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  tokenType: 'Bearer';
  scope?: string[];
  metadata?: Record<string, any>;
}

/**
 * JWT payload structure
 */
export interface JWTPayload {
  sub: string;
  email: string;
  roles: string[];
  permissions: string[];
  iat: number;
  exp: number;
  iss?: string;
  aud?: string;
}

/**
 * Authentication credentials
 */
export interface AuthCredentials {
  username?: string;
  password?: string;
  email?: string;
  token?: string;
  refreshToken?: string;
}

/**
 * Authentication request
 */
export interface AuthRequest {
  credentials: AuthCredentials;
  requiredRoles?: string[];
  requiredPermissions?: string[];
}

/**
 * Authentication response
 */
export interface AuthResponse {
  success: boolean;
  user?: AuthUser;
  token?: AuthToken;
  error?: string;
}

/**
 * Token validation result
 */
export interface TokenValidationResult {
  valid: boolean;
  payload?: JWTPayload;
  error?: string;
  remainingTime?: number;
}

/**
 * Token blacklist entry
 */
export interface BlacklistEntry {
  tokenId: string;
  expiresAt: Date;
  reason?: string;
}