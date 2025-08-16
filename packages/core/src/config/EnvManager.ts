import { z } from 'zod';
import { ClientConfig, ClientConfigSchema } from './ClientConfig';
import { AuthConfig, AuthConfigSchema } from './AuthConfig';
import { VectorConfig, VectorConfigSchema } from './VectorConfig';
import { DatabaseConfig, DatabaseConfigSchema } from './DatabaseConfig';
import { LoggingConfig, LoggingConfigSchema } from './LoggingConfig';

/**
 * Environment variable prefix for Symbiont SDK
 */
export const ENV_PREFIX = 'SYMBIONT_';

/**
 * Environment variable manager for parsing and validating configuration from environment variables
 */
export class EnvManager {
  /**
   * Parse environment variables into configuration objects
   */
  static parseEnvironment(): {
    client: Partial<ClientConfig>;
    auth: Partial<AuthConfig>;
    vector: Partial<VectorConfig>;
    database: Partial<DatabaseConfig>;
    logging: Partial<LoggingConfig>;
    environment: string;
    debug: boolean;
  } {
    // Load dotenv if available
    try {
      require('dotenv').config();
    } catch {
      // dotenv not available, continue with process.env
    }

    const env = process.env;
    
    return {
      client: this.parseClientConfig(env),
      auth: this.parseAuthConfig(env),
      vector: this.parseVectorConfig(env),
      database: this.parseDatabaseConfig(env),
      logging: this.parseLoggingConfig(env),
      environment: this.getEnvValue(env, 'ENVIRONMENT', 'development')!,
      debug: this.getBooleanValue(env, 'DEBUG', false)!,
    };
  }

  /**
   * Parse client configuration from environment variables
   */
  private static parseClientConfig(env: NodeJS.ProcessEnv): Partial<ClientConfig> {
    const config: Partial<ClientConfig> = {};

    // Basic client settings
    const runtimeApiUrl = this.getEnvValue(env, 'RUNTIME_API_URL');
    if (runtimeApiUrl) config.runtimeApiUrl = runtimeApiUrl;

    const toolReviewApiUrl = this.getEnvValue(env, 'TOOL_REVIEW_API_URL');
    if (toolReviewApiUrl) config.toolReviewApiUrl = toolReviewApiUrl;

    const timeout = this.getNumberValue(env, 'TIMEOUT');
    if (timeout !== undefined) config.timeout = timeout;

    const userAgent = this.getEnvValue(env, 'USER_AGENT');
    if (userAgent) config.userAgent = userAgent;

    const maxConcurrentRequests = this.getNumberValue(env, 'MAX_CONCURRENT_REQUESTS');
    if (maxConcurrentRequests !== undefined) config.maxConcurrentRequests = maxConcurrentRequests;

    // Retry configuration
    const retryConfig: any = {};
    const maxRetries = this.getNumberValue(env, 'RETRY_MAX_RETRIES');
    if (maxRetries !== undefined) retryConfig.maxRetries = maxRetries;

    const initialDelayMs = this.getNumberValue(env, 'RETRY_INITIAL_DELAY_MS');
    if (initialDelayMs !== undefined) retryConfig.initialDelayMs = initialDelayMs;

    const maxDelayMs = this.getNumberValue(env, 'RETRY_MAX_DELAY_MS');
    if (maxDelayMs !== undefined) retryConfig.maxDelayMs = maxDelayMs;

    const backoffMultiplier = this.getNumberValue(env, 'RETRY_BACKOFF_MULTIPLIER');
    if (backoffMultiplier !== undefined) retryConfig.backoffMultiplier = backoffMultiplier;

    if (Object.keys(retryConfig).length > 0) {
      config.retryConfig = retryConfig;
    }

    // Cache configuration
    const cacheConfig: any = {};
    const cacheEnabled = this.getBooleanValue(env, 'CACHE_ENABLED');
    if (cacheEnabled !== undefined) cacheConfig.enabled = cacheEnabled;

    const defaultTtlMs = this.getNumberValue(env, 'CACHE_DEFAULT_TTL_MS');
    if (defaultTtlMs !== undefined) cacheConfig.defaultTtlMs = defaultTtlMs;

    const maxSize = this.getNumberValue(env, 'CACHE_MAX_SIZE');
    if (maxSize !== undefined) cacheConfig.maxSize = maxSize;

    if (Object.keys(cacheConfig).length > 0) {
      config.cacheConfig = cacheConfig;
    }

    return config;
  }

  /**
   * Parse authentication configuration from environment variables
   */
  private static parseAuthConfig(env: NodeJS.ProcessEnv): Partial<AuthConfig> {
    const config: Partial<AuthConfig> = {};

    const strategy = this.getEnvValue(env, 'AUTH_STRATEGY');
    if (strategy) config.strategy = strategy as any;

    const apiKey = this.getEnvValue(env, 'AUTH_API_KEY') || this.getEnvValue(env, 'API_KEY');
    if (apiKey) config.apiKey = apiKey;

    // JWT configuration
    const jwtConfig: any = {};
    const jwtAccessToken = this.getEnvValue(env, 'AUTH_JWT_ACCESS_TOKEN');
    if (jwtAccessToken) jwtConfig.accessToken = jwtAccessToken;

    const jwtRefreshToken = this.getEnvValue(env, 'AUTH_JWT_REFRESH_TOKEN');
    if (jwtRefreshToken) jwtConfig.refreshToken = jwtRefreshToken;

    const jwtSecret = this.getEnvValue(env, 'AUTH_JWT_SECRET');
    if (jwtSecret) jwtConfig.secret = jwtSecret;

    const jwtRefreshSecret = this.getEnvValue(env, 'AUTH_JWT_REFRESH_SECRET');
    if (jwtRefreshSecret) jwtConfig.refreshSecret = jwtRefreshSecret;

    const jwtExpiresIn = this.getEnvValue(env, 'AUTH_JWT_EXPIRES_IN');
    if (jwtExpiresIn) jwtConfig.expiresIn = jwtExpiresIn;

    const jwtRefreshExpiresIn = this.getEnvValue(env, 'AUTH_JWT_REFRESH_EXPIRES_IN');
    if (jwtRefreshExpiresIn) jwtConfig.refreshExpiresIn = jwtRefreshExpiresIn;

    const jwtAlgorithm = this.getEnvValue(env, 'AUTH_JWT_ALGORITHM');
    if (jwtAlgorithm) jwtConfig.algorithm = jwtAlgorithm;

    if (Object.keys(jwtConfig).length > 0) {
      config.jwt = jwtConfig;
    }

    // OAuth configuration
    const oauthConfig: any = {};
    const oauthClientId = this.getEnvValue(env, 'AUTH_OAUTH_CLIENT_ID');
    if (oauthClientId) oauthConfig.clientId = oauthClientId;

    const oauthClientSecret = this.getEnvValue(env, 'AUTH_OAUTH_CLIENT_SECRET');
    if (oauthClientSecret) oauthConfig.clientSecret = oauthClientSecret;

    const oauthRedirectUri = this.getEnvValue(env, 'AUTH_OAUTH_REDIRECT_URI');
    if (oauthRedirectUri) oauthConfig.redirectUri = oauthRedirectUri;

    if (Object.keys(oauthConfig).length > 0) {
      config.oauth = oauthConfig;
    }

    const tokenRefreshThreshold = this.getNumberValue(env, 'AUTH_TOKEN_REFRESH_THRESHOLD');
    if (tokenRefreshThreshold !== undefined) config.tokenRefreshThreshold = tokenRefreshThreshold;

    const autoRefresh = this.getBooleanValue(env, 'AUTH_AUTO_REFRESH');
    if (autoRefresh !== undefined) config.autoRefresh = autoRefresh;

    const tokenStorage = this.getEnvValue(env, 'AUTH_TOKEN_STORAGE');
    if (tokenStorage) config.tokenStorage = tokenStorage as any;

    return config;
  }

  /**
   * Parse vector configuration from environment variables
   */
  private static parseVectorConfig(env: NodeJS.ProcessEnv): Partial<VectorConfig> {
    const config: any = {};

    const provider = this.getEnvValue(env, 'VECTOR_PROVIDER');
    if (provider) config.provider = provider;

    const url = this.getEnvValue(env, 'VECTOR_URL') || this.getEnvValue(env, 'QDRANT_URL');
    if (url) config.url = url;

    const apiKey = this.getEnvValue(env, 'VECTOR_API_KEY') || this.getEnvValue(env, 'QDRANT_API_KEY');
    if (apiKey) config.apiKey = apiKey;

    // Qdrant-specific configuration
    const qdrantConfig: any = {};
    const qdrantHost = this.getEnvValue(env, 'QDRANT_HOST');
    if (qdrantHost) qdrantConfig.host = qdrantHost;

    const qdrantPort = this.getNumberValue(env, 'QDRANT_PORT');
    if (qdrantPort !== undefined) qdrantConfig.port = qdrantPort;

    const qdrantGrpcPort = this.getNumberValue(env, 'QDRANT_GRPC_PORT');
    if (qdrantGrpcPort !== undefined) qdrantConfig.grpcPort = qdrantGrpcPort;

    const qdrantPreferGrpc = this.getBooleanValue(env, 'QDRANT_PREFER_GRPC');
    if (qdrantPreferGrpc !== undefined) qdrantConfig.preferGrpc = qdrantPreferGrpc;

    const qdrantHttps = this.getBooleanValue(env, 'QDRANT_HTTPS');
    if (qdrantHttps !== undefined) qdrantConfig.https = qdrantHttps;

    if (Object.keys(qdrantConfig).length > 0) {
      config.qdrant = qdrantConfig;
    }

    return config;
  }

  /**
   * Parse database configuration from environment variables
   */
  private static parseDatabaseConfig(env: NodeJS.ProcessEnv): Partial<DatabaseConfig> {
    const config: any = {};

    const provider = this.getEnvValue(env, 'DATABASE_PROVIDER') || this.getEnvValue(env, 'DB_PROVIDER');
    if (provider) config.provider = provider;

    const url = this.getEnvValue(env, 'DATABASE_URL') || this.getEnvValue(env, 'DB_URL');
    if (url) config.url = url;

    const host = this.getEnvValue(env, 'DATABASE_HOST') || this.getEnvValue(env, 'DB_HOST');
    if (host) config.host = host;

    const port = this.getNumberValue(env, 'DATABASE_PORT') || this.getNumberValue(env, 'DB_PORT');
    if (port !== undefined) config.port = port;

    const database = this.getEnvValue(env, 'DATABASE_NAME') || this.getEnvValue(env, 'DB_NAME');
    if (database) config.database = database;

    const username = this.getEnvValue(env, 'DATABASE_USERNAME') || this.getEnvValue(env, 'DB_USERNAME');
    if (username) config.username = username;

    const password = this.getEnvValue(env, 'DATABASE_PASSWORD') || this.getEnvValue(env, 'DB_PASSWORD');
    if (password) config.password = password;

    return config;
  }

  /**
   * Parse logging configuration from environment variables
   */
  private static parseLoggingConfig(env: NodeJS.ProcessEnv): Partial<LoggingConfig> {
    const config: any = {};

    const level = this.getEnvValue(env, 'LOGGING_LEVEL') || this.getEnvValue(env, 'LOG_LEVEL');
    if (level) config.level = level;

    const format = this.getEnvValue(env, 'LOGGING_FORMAT') || this.getEnvValue(env, 'LOG_FORMAT');
    if (format) config.format = format;

    const silent = this.getBooleanValue(env, 'LOGGING_SILENT') || this.getBooleanValue(env, 'LOG_SILENT');
    if (silent !== undefined) config.silent = silent;

    const logRequests = this.getBooleanValue(env, 'LOG_REQUESTS');
    if (logRequests !== undefined) config.logRequests = logRequests;

    const logResponses = this.getBooleanValue(env, 'LOG_RESPONSES');
    if (logResponses !== undefined) config.logResponses = logResponses;

    const logErrors = this.getBooleanValue(env, 'LOG_ERRORS');
    if (logErrors !== undefined) config.logErrors = logErrors;

    return config;
  }

  /**
   * Get environment variable value with prefix
   */
  private static getEnvValue(env: NodeJS.ProcessEnv, key: string, defaultValue?: string): string | undefined {
    const prefixedKey = `${ENV_PREFIX}${key}`;
    return env[prefixedKey] || defaultValue;
  }

  /**
   * Get numeric environment variable value
   */
  private static getNumberValue(env: NodeJS.ProcessEnv, key: string, defaultValue?: number): number | undefined {
    const value = this.getEnvValue(env, key);
    if (value === undefined) return defaultValue;
    
    const parsed = parseFloat(value);
    return isNaN(parsed) ? defaultValue : parsed;
  }

  /**
   * Get boolean environment variable value
   */
  private static getBooleanValue(env: NodeJS.ProcessEnv, key: string, defaultValue?: boolean): boolean | undefined {
    const value = this.getEnvValue(env, key);
    if (value === undefined) return defaultValue;
    
    return value.toLowerCase() === 'true' || value === '1';
  }

  /**
   * Validate configuration using schemas
   */
  static validateConfig(config: any): {
    client: ClientConfig;
    auth: AuthConfig;
    vector: VectorConfig;
    database: DatabaseConfig;
    logging: LoggingConfig;
  } {
    try {
      return {
        client: ClientConfigSchema.parse(config.client || {}),
        auth: AuthConfigSchema.parse(config.auth || {}),
        vector: VectorConfigSchema.parse(config.vector || {}),
        database: DatabaseConfigSchema.parse(config.database || {}),
        logging: LoggingConfigSchema.parse(config.logging || {}),
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessage = error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ');
        throw new Error(`Configuration validation failed: ${errorMessage}`);
      }
      throw error;
    }
  }
}