import { z } from 'zod';

/**
 * JWT configuration schema
 */
export const JWTConfigSchema = z.object({
  accessToken: z.string().optional(),
  refreshToken: z.string().optional(),
  secret: z.string().optional(),
  refreshSecret: z.string().optional(),
  expiresIn: z.string().default('1h'),
  refreshExpiresIn: z.string().default('7d'),
  algorithm: z.enum(['HS256', 'HS384', 'HS512', 'RS256', 'RS384', 'RS512']).default('HS256'),
  issuer: z.string().optional(),
  audience: z.string().optional(),
});

export type JWTConfig = z.infer<typeof JWTConfigSchema>;

/**
 * OAuth configuration schema
 */
export const OAuthConfigSchema = z.object({
  clientId: z.string().optional(),
  clientSecret: z.string().optional(),
  redirectUri: z.string().url().refine(url => {
    if (!url) return true; // Optional field
    return url.startsWith('http://') || url.startsWith('https://');
  }, { message: 'Redirect URI must use HTTP or HTTPS protocol' }).optional(),
  scope: z.array(z.string()).default([]),
  authorizationUrl: z.string().url().refine(url => {
    if (!url) return true; // Optional field
    return url.startsWith('http://') || url.startsWith('https://');
  }, { message: 'Authorization URL must use HTTP or HTTPS protocol' }).optional(),
  tokenUrl: z.string().url().refine(url => {
    if (!url) return true; // Optional field
    return url.startsWith('http://') || url.startsWith('https://');
  }, { message: 'Token URL must use HTTP or HTTPS protocol' }).optional(),
});

export type OAuthConfig = z.infer<typeof OAuthConfigSchema>;

/**
 * Authentication strategy enum
 */
export const AuthStrategySchema = z.enum(['jwt', 'oauth', 'api_key', 'basic']);
export type AuthStrategy = z.infer<typeof AuthStrategySchema>;

/**
 * Authentication configuration schema
 */
export const AuthConfigSchema = z.object({
  strategy: AuthStrategySchema.default('jwt'),
  apiKey: z.string().optional(),
  jwt: JWTConfigSchema.optional(),
  oauth: OAuthConfigSchema.optional(),
  basicAuth: z.object({
    username: z.string(),
    password: z.string(),
  }).optional(),
  tokenRefreshThreshold: z.number().min(0).max(1).default(0.1), // Refresh when 10% time left
  autoRefresh: z.boolean().default(true),
  tokenStorage: z.enum(['memory', 'localStorage', 'sessionStorage', 'custom']).default('memory'),
  maxRetries: z.number().min(0).default(3),
  retryDelayMs: z.number().min(0).default(1000),
});

export type AuthConfig = z.infer<typeof AuthConfigSchema>;

/**
 * Default authentication configuration
 */
export const defaultAuthConfig: Partial<AuthConfig> = {
  strategy: 'jwt',
  tokenRefreshThreshold: 0.1,
  autoRefresh: true,
  tokenStorage: 'memory',
  maxRetries: 3,
  retryDelayMs: 1000,
  jwt: {
    expiresIn: '1h',
    refreshExpiresIn: '7d',
    algorithm: 'HS256',
  },
  oauth: {
    scope: [],
  },
};