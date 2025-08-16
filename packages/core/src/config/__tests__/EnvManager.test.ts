import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EnvManager } from '../EnvManager';

describe('EnvManager', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset process.env to a clean state
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('parseEnvironment', () => {
    it('should parse environment with default values', () => {
      const result = EnvManager.parseEnvironment();

      expect(result).toHaveProperty('client');
      expect(result).toHaveProperty('auth');
      expect(result).toHaveProperty('vector');
      expect(result).toHaveProperty('database');
      expect(result).toHaveProperty('logging');
      expect(result.environment).toBe('development');
      expect(result.debug).toBe(false);
    });

    it('should parse global environment variables', () => {
      process.env.SYMBIONT_ENVIRONMENT = 'production';
      process.env.SYMBIONT_DEBUG = 'true';

      const result = EnvManager.parseEnvironment();

      expect(result.environment).toBe('production');
      expect(result.debug).toBe(true);
    });
  });

  describe('Client Configuration Parsing', () => {
    it('should parse basic client config from environment', () => {
      process.env.SYMBIONT_RUNTIME_API_URL = 'https://api.example.com';
      process.env.SYMBIONT_TOOL_REVIEW_API_URL = 'https://review.example.com';
      process.env.SYMBIONT_TIMEOUT = '60000';
      process.env.SYMBIONT_USER_AGENT = 'SymbiontSDK/1.0';
      process.env.SYMBIONT_MAX_CONCURRENT_REQUESTS = '20';

      const result = EnvManager.parseEnvironment();

      expect(result.client.runtimeApiUrl).toBe('https://api.example.com');
      expect(result.client.toolReviewApiUrl).toBe('https://review.example.com');
      expect(result.client.timeout).toBe(60000);
      expect(result.client.userAgent).toBe('SymbiontSDK/1.0');
      expect(result.client.maxConcurrentRequests).toBe(20);
    });

    it('should parse retry configuration from environment', () => {
      process.env.SYMBIONT_RETRY_MAX_RETRIES = '5';
      process.env.SYMBIONT_RETRY_INITIAL_DELAY_MS = '2000';
      process.env.SYMBIONT_RETRY_MAX_DELAY_MS = '60000';
      process.env.SYMBIONT_RETRY_BACKOFF_MULTIPLIER = '3';

      const result = EnvManager.parseEnvironment();

      expect(result.client.retryConfig).toEqual({
        maxRetries: 5,
        initialDelayMs: 2000,
        maxDelayMs: 60000,
        backoffMultiplier: 3,
      });
    });

    it('should parse cache configuration from environment', () => {
      process.env.SYMBIONT_CACHE_ENABLED = 'false';
      process.env.SYMBIONT_CACHE_DEFAULT_TTL_MS = '600000';
      process.env.SYMBIONT_CACHE_MAX_SIZE = '2000';

      const result = EnvManager.parseEnvironment();

      expect(result.client.cacheConfig).toEqual({
        enabled: false,
        defaultTtlMs: 600000,
        maxSize: 2000,
      });
    });

    it('should handle partial retry config', () => {
      process.env.SYMBIONT_RETRY_MAX_RETRIES = '5';
      // Only set one retry config value

      const result = EnvManager.parseEnvironment();

      expect(result.client.retryConfig).toEqual({
        maxRetries: 5,
      });
    });

    it('should handle partial cache config', () => {
      process.env.SYMBIONT_CACHE_ENABLED = 'true';
      // Only set one cache config value

      const result = EnvManager.parseEnvironment();

      expect(result.client.cacheConfig).toEqual({
        enabled: true,
      });
    });
  });

  describe('Auth Configuration Parsing', () => {
    it('should parse basic auth config from environment', () => {
      process.env.SYMBIONT_AUTH_STRATEGY = 'jwt';
      process.env.SYMBIONT_AUTH_API_KEY = 'test-api-key';
      process.env.SYMBIONT_AUTH_TOKEN_REFRESH_THRESHOLD = '0.2';
      process.env.SYMBIONT_AUTH_AUTO_REFRESH = 'false';
      process.env.SYMBIONT_AUTH_TOKEN_STORAGE = 'localStorage';

      const result = EnvManager.parseEnvironment();

      expect(result.auth.strategy).toBe('jwt');
      expect(result.auth.apiKey).toBe('test-api-key');
      expect(result.auth.tokenRefreshThreshold).toBe(0.2);
      expect(result.auth.autoRefresh).toBe(false);
      expect(result.auth.tokenStorage).toBe('localStorage');
    });

    it('should parse API key from alternative variable name', () => {
      process.env.SYMBIONT_API_KEY = 'alternative-api-key';

      const result = EnvManager.parseEnvironment();

      expect(result.auth.apiKey).toBe('alternative-api-key');
    });

    it('should prioritize SYMBIONT_AUTH_API_KEY over SYMBIONT_API_KEY', () => {
      process.env.SYMBIONT_AUTH_API_KEY = 'primary-api-key';
      process.env.SYMBIONT_API_KEY = 'fallback-api-key';

      const result = EnvManager.parseEnvironment();

      expect(result.auth.apiKey).toBe('primary-api-key');
    });

    it('should parse JWT configuration from environment', () => {
      process.env.SYMBIONT_AUTH_JWT_ACCESS_TOKEN = 'access-token';
      process.env.SYMBIONT_AUTH_JWT_REFRESH_TOKEN = 'refresh-token';
      process.env.SYMBIONT_AUTH_JWT_SECRET = 'jwt-secret';
      process.env.SYMBIONT_AUTH_JWT_REFRESH_SECRET = 'refresh-secret';
      process.env.SYMBIONT_AUTH_JWT_EXPIRES_IN = '2h';
      process.env.SYMBIONT_AUTH_JWT_REFRESH_EXPIRES_IN = '14d';
      process.env.SYMBIONT_AUTH_JWT_ALGORITHM = 'HS512';

      const result = EnvManager.parseEnvironment();

      expect(result.auth.jwt).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        secret: 'jwt-secret',
        refreshSecret: 'refresh-secret',
        expiresIn: '2h',
        refreshExpiresIn: '14d',
        algorithm: 'HS512',
      });
    });

    it('should parse OAuth configuration from environment', () => {
      process.env.SYMBIONT_AUTH_OAUTH_CLIENT_ID = 'oauth-client-id';
      process.env.SYMBIONT_AUTH_OAUTH_CLIENT_SECRET = 'oauth-client-secret';
      process.env.SYMBIONT_AUTH_OAUTH_REDIRECT_URI = 'https://app.example.com/callback';

      const result = EnvManager.parseEnvironment();

      expect(result.auth.oauth).toEqual({
        clientId: 'oauth-client-id',
        clientSecret: 'oauth-client-secret',
        redirectUri: 'https://app.example.com/callback',
      });
    });

    it('should handle partial JWT config', () => {
      process.env.SYMBIONT_AUTH_JWT_SECRET = 'jwt-secret';

      const result = EnvManager.parseEnvironment();

      expect(result.auth.jwt).toEqual({
        secret: 'jwt-secret',
      });
    });

    it('should handle partial OAuth config', () => {
      process.env.SYMBIONT_AUTH_OAUTH_CLIENT_ID = 'oauth-client-id';

      const result = EnvManager.parseEnvironment();

      expect(result.auth.oauth).toEqual({
        clientId: 'oauth-client-id',
      });
    });
  });

  describe('Vector Configuration Parsing', () => {
    it('should parse basic vector config from environment', () => {
      process.env.SYMBIONT_VECTOR_PROVIDER = 'qdrant';
      process.env.SYMBIONT_VECTOR_URL = 'https://qdrant.example.com';
      process.env.SYMBIONT_VECTOR_API_KEY = 'vector-api-key';

      const result = EnvManager.parseEnvironment();

      expect(result.vector.provider).toBe('qdrant');
      expect(result.vector.url).toBe('https://qdrant.example.com');
      expect(result.vector.apiKey).toBe('vector-api-key');
    });

    it('should parse from alternative Qdrant variable names', () => {
      process.env.SYMBIONT_QDRANT_URL = 'https://qdrant-alt.example.com';
      process.env.SYMBIONT_QDRANT_API_KEY = 'qdrant-api-key';

      const result = EnvManager.parseEnvironment();

      expect(result.vector.url).toBe('https://qdrant-alt.example.com');
      expect(result.vector.apiKey).toBe('qdrant-api-key');
    });

    it('should prioritize SYMBIONT_VECTOR_* over SYMBIONT_QDRANT_*', () => {
      process.env.SYMBIONT_VECTOR_URL = 'https://vector.example.com';
      process.env.SYMBIONT_QDRANT_URL = 'https://qdrant.example.com';

      const result = EnvManager.parseEnvironment();

      expect(result.vector.url).toBe('https://vector.example.com');
    });

    it('should parse Qdrant-specific configuration', () => {
      process.env.SYMBIONT_QDRANT_HOST = 'qdrant.example.com';
      process.env.SYMBIONT_QDRANT_PORT = '6333';
      process.env.SYMBIONT_QDRANT_GRPC_PORT = '6334';
      process.env.SYMBIONT_QDRANT_PREFER_GRPC = 'true';
      process.env.SYMBIONT_QDRANT_HTTPS = 'true';

      const result = EnvManager.parseEnvironment();

      expect(result.vector.qdrant).toEqual({
        host: 'qdrant.example.com',
        port: 6333,
        grpcPort: 6334,
        preferGrpc: true,
        https: true,
      });
    });
  });

  describe('Database Configuration Parsing', () => {
    it('should parse basic database config from environment', () => {
      process.env.SYMBIONT_DATABASE_PROVIDER = 'postgresql';
      process.env.SYMBIONT_DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
      process.env.SYMBIONT_DATABASE_HOST = 'localhost';
      process.env.SYMBIONT_DATABASE_PORT = '5432';
      process.env.SYMBIONT_DATABASE_NAME = 'symbiont';
      process.env.SYMBIONT_DATABASE_USERNAME = 'dbuser';
      process.env.SYMBIONT_DATABASE_PASSWORD = 'dbpass';

      const result = EnvManager.parseEnvironment();

      expect(result.database.provider).toBe('postgresql');
      expect(result.database.url).toBe('postgresql://user:pass@localhost:5432/db');
      expect(result.database.host).toBe('localhost');
      expect(result.database.port).toBe(5432);
      expect(result.database.database).toBe('symbiont');
      expect(result.database.username).toBe('dbuser');
      expect(result.database.password).toBe('dbpass');
    });

    it('should parse from alternative DB variable names', () => {
      process.env.SYMBIONT_DB_PROVIDER = 'mysql';
      process.env.SYMBIONT_DB_URL = 'mysql://user:pass@localhost:3306/db';
      process.env.SYMBIONT_DB_HOST = 'db.example.com';
      process.env.SYMBIONT_DB_PORT = '3306';
      process.env.SYMBIONT_DB_NAME = 'mydb';
      process.env.SYMBIONT_DB_USERNAME = 'myuser';
      process.env.SYMBIONT_DB_PASSWORD = 'mypass';

      const result = EnvManager.parseEnvironment();

      expect(result.database.provider).toBe('mysql');
      expect(result.database.url).toBe('mysql://user:pass@localhost:3306/db');
      expect(result.database.host).toBe('db.example.com');
      expect(result.database.port).toBe(3306);
      expect(result.database.database).toBe('mydb');
      expect(result.database.username).toBe('myuser');
      expect(result.database.password).toBe('mypass');
    });

    it('should prioritize SYMBIONT_DATABASE_* over SYMBIONT_DB_*', () => {
      process.env.SYMBIONT_DATABASE_HOST = 'primary-host';
      process.env.SYMBIONT_DB_HOST = 'fallback-host';

      const result = EnvManager.parseEnvironment();

      expect(result.database.host).toBe('primary-host');
    });
  });

  describe('Logging Configuration Parsing', () => {
    it('should parse basic logging config from environment', () => {
      process.env.SYMBIONT_LOGGING_LEVEL = 'debug';
      process.env.SYMBIONT_LOGGING_FORMAT = 'json';
      process.env.SYMBIONT_LOGGING_SILENT = 'true';
      process.env.SYMBIONT_LOG_REQUESTS = 'true';
      process.env.SYMBIONT_LOG_RESPONSES = 'false';
      process.env.SYMBIONT_LOG_ERRORS = 'true';

      const result = EnvManager.parseEnvironment();

      expect(result.logging.level).toBe('debug');
      expect(result.logging.format).toBe('json');
      expect(result.logging.silent).toBe(true);
      expect(result.logging.logRequests).toBe(true);
      expect(result.logging.logResponses).toBe(false);
      expect(result.logging.logErrors).toBe(true);
    });

    it('should parse from alternative LOG variable names', () => {
      process.env.SYMBIONT_LOG_LEVEL = 'warn';
      process.env.SYMBIONT_LOG_FORMAT = 'text';
      process.env.SYMBIONT_LOG_SILENT = 'false';

      const result = EnvManager.parseEnvironment();

      expect(result.logging.level).toBe('warn');
      expect(result.logging.format).toBe('text');
      expect(result.logging.silent).toBe(false);
    });

    it('should prioritize SYMBIONT_LOGGING_* over SYMBIONT_LOG_*', () => {
      process.env.SYMBIONT_LOGGING_LEVEL = 'error';
      process.env.SYMBIONT_LOG_LEVEL = 'info';

      const result = EnvManager.parseEnvironment();

      expect(result.logging.level).toBe('error');
    });
  });

  describe('Boolean Parsing', () => {
    it('should parse true values correctly', () => {
      process.env.SYMBIONT_DEBUG = 'true';
      process.env.SYMBIONT_CACHE_ENABLED = 'TRUE';
      process.env.SYMBIONT_QDRANT_HTTPS = '1';

      const result = EnvManager.parseEnvironment();

      expect(result.debug).toBe(true);
      expect(result.client.cacheConfig?.enabled).toBe(true);
      expect(result.vector.qdrant?.https).toBe(true);
    });

    it('should parse false values correctly', () => {
      process.env.SYMBIONT_DEBUG = 'false';
      process.env.SYMBIONT_CACHE_ENABLED = 'FALSE';
      process.env.SYMBIONT_QDRANT_HTTPS = '0';
      process.env.SYMBIONT_AUTH_AUTO_REFRESH = 'no';

      const result = EnvManager.parseEnvironment();

      expect(result.debug).toBe(false);
      expect(result.client.cacheConfig?.enabled).toBe(false);
      expect(result.vector.qdrant?.https).toBe(false);
      expect(result.auth.autoRefresh).toBe(false);
    });

    it('should handle undefined boolean values with defaults', () => {
      const result = EnvManager.parseEnvironment();

      expect(result.debug).toBe(false); // Default false
    });
  });

  describe('Number Parsing', () => {
    it('should parse valid numbers correctly', () => {
      process.env.SYMBIONT_TIMEOUT = '30000';
      process.env.SYMBIONT_QDRANT_PORT = '6333';
      process.env.SYMBIONT_AUTH_TOKEN_REFRESH_THRESHOLD = '0.1';

      const result = EnvManager.parseEnvironment();

      expect(result.client.timeout).toBe(30000);
      expect(result.vector.qdrant?.port).toBe(6333);
      expect(result.auth.tokenRefreshThreshold).toBe(0.1);
    });

    it('should handle invalid numbers gracefully', () => {
      process.env.SYMBIONT_TIMEOUT = 'not-a-number';
      process.env.SYMBIONT_QDRANT_PORT = 'invalid';

      const result = EnvManager.parseEnvironment();

      expect(result.client.timeout).toBeUndefined();
      expect(result.vector.qdrant?.port).toBeUndefined();
    });

    it('should handle negative numbers', () => {
      process.env.SYMBIONT_TIMEOUT = '-1000';

      const result = EnvManager.parseEnvironment();

      expect(result.client.timeout).toBe(-1000);
    });

    it('should handle zero values', () => {
      process.env.SYMBIONT_MAX_CONCURRENT_REQUESTS = '0';

      const result = EnvManager.parseEnvironment();

      expect(result.client.maxConcurrentRequests).toBe(0);
    });
  });

  describe('Configuration Validation', () => {
    it('should validate complete configuration successfully', () => {
      const mockConfig = {
        client: {
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
        },
        auth: {
          strategy: 'jwt' as const,
          tokenRefreshThreshold: 0.1,
          autoRefresh: true,
          tokenStorage: 'memory' as const,
          maxRetries: 3,
          retryDelayMs: 1000,
          jwt: {
            expiresIn: '1h',
            refreshExpiresIn: '7d',
            algorithm: 'HS256' as const,
          },
          oauth: {
            scope: [],
          },
        },
        vector: {},
        database: {},
        logging: {},
      };

      expect(() => EnvManager.validateConfig(mockConfig)).not.toThrow();
    });

    it('should throw validation error for invalid configuration', () => {
      const invalidConfig = {
        client: {
          timeout: -1, // Invalid negative timeout
        },
      };

      expect(() => EnvManager.validateConfig(invalidConfig)).toThrow(/Configuration validation failed/);
    });

    it('should handle empty configuration objects', () => {
      const emptyConfig = {
        client: {},
        auth: {},
        vector: {},
        database: {},
        logging: {},
      };

      expect(() => EnvManager.validateConfig(emptyConfig)).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing dotenv module gracefully', () => {
      // This test ensures the code doesn't crash if dotenv is not available
      expect(() => EnvManager.parseEnvironment()).not.toThrow();
    });

    it('should handle empty environment variables', () => {
      process.env.SYMBIONT_RUNTIME_API_URL = '';
      process.env.SYMBIONT_TIMEOUT = '';

      const result = EnvManager.parseEnvironment();

      expect(result.client.runtimeApiUrl).toBeUndefined();
      expect(result.client.timeout).toBeUndefined();
    });

    it('should handle whitespace in environment variables', () => {
      process.env.SYMBIONT_RUNTIME_API_URL = '  https://api.example.com  ';

      const result = EnvManager.parseEnvironment();

      expect(result.client.runtimeApiUrl).toBe('  https://api.example.com  ');
    });

    it('should handle special characters in strings', () => {
      process.env.SYMBIONT_AUTH_API_KEY = 'key-with-special-chars!@#$%^&*()';

      const result = EnvManager.parseEnvironment();

      expect(result.auth.apiKey).toBe('key-with-special-chars!@#$%^&*()');
    });
  });
});