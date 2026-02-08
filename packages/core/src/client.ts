import { SymbiontConfig, EnhancedSymbiontConfig, HealthStatus, HealthResponse } from '@symbiont/types';
import { AuthenticationManager } from './auth';
import { EnvManager } from './config';
import { SystemClient } from './SystemClient';

/**
 * Main Symbiont SDK client providing unified access to both Runtime and Tool Review APIs
 */
export class SymbiontClient {
  private config: SymbiontConfig;
  private enhancedConfig?: EnhancedSymbiontConfig;
  private authManager: AuthenticationManager;
  
  // Lazy-loaded specialized clients
  private _agents?: any; // AgentClient - loaded dynamically to avoid circular deps
  private _schedules?: any; // ScheduleClient
  private _workflows?: any; // WorkflowClient
  private _system?: any; // SystemClient
  private _policies?: any; // PolicyClient
  private _secrets?: any; // SecretsClient
  private _toolReview?: any; // ToolReviewClient
  private _mcp?: any; // McpClient
  private _http?: any; // HttpEndpointManager

  /**
   * Create a new Symbiont SDK client
   * @param config - Configuration for the SDK (supports both legacy and enhanced formats)
   */
  constructor(config: SymbiontConfig | EnhancedSymbiontConfig) {
    // Detect if this is an enhanced config or legacy config
    if (this.isEnhancedConfig(config)) {
      this.enhancedConfig = this.validateAndNormalizeEnhancedConfig(config);
      this.config = this.convertToLegacyConfig(this.enhancedConfig);
    } else {
      this.config = this.validateAndNormalizeConfig(config);
      // Also parse environment variables for enhanced features
      this.enhancedConfig = this.createEnhancedConfigFromLegacy(this.config);
    }
    
    // Initialize secrets manager first
    const secretsManager = this.initializeSecretsManager();
    
    // Pass secrets manager to auth manager
    this.authManager = new AuthenticationManager(this.config, secretsManager);
    
    if (this.config.debug || this.enhancedConfig?.debug) {
      console.log('SymbiontClient initialized with config:', {
        runtimeApiUrl: this.config.runtimeApiUrl,
        toolReviewApiUrl: this.config.toolReviewApiUrl,
        validationMode: this.config.validationMode,
        environment: this.config.environment,
        configType: this.enhancedConfig ? 'enhanced' : 'legacy',
      });
    }
  }

  /**
   * Check if the provided config is an enhanced config
   */
  private isEnhancedConfig(config: any): config is EnhancedSymbiontConfig {
    return config.client !== undefined || config.auth !== undefined;
  }

  /**
   * Validate and normalize enhanced configuration with environment variable support
   */
  private validateAndNormalizeEnhancedConfig(config: EnhancedSymbiontConfig): EnhancedSymbiontConfig {
    // Parse environment variables
    const envConfig = EnvManager.parseEnvironment();
    
    // Safely merge configurations with proper type handling
    const mergedConfig: EnhancedSymbiontConfig = {
      client: { ...envConfig.client, ...config.client },
      auth: {
        ...envConfig.auth,
        ...config.auth,
        strategy: config.auth?.strategy || envConfig.auth.strategy || 'jwt'
      },
      vector: config.vector || envConfig.vector ? {
        provider: 'qdrant',
        ...envConfig.vector,
        ...config.vector
      } : undefined,
      database: config.database || envConfig.database ? {
        provider: 'postgresql',
        ...envConfig.database,
        ...config.database
      } : undefined,
      logging: config.logging || envConfig.logging ? {
        level: 'info' as const,
        format: 'simple' as const,
        ...envConfig.logging,
        ...config.logging
      } : undefined,
      environment: (config.environment || envConfig.environment) as 'development' | 'staging' | 'production',
      debug: config.debug !== undefined ? config.debug : envConfig.debug,
      validationMode: config.validationMode || 'development',
      secretsFile: config.secretsFile,
    };

    // Set default API URLs based on environment if not provided
    if (!mergedConfig.client.runtimeApiUrl) {
      switch (mergedConfig.environment) {
        case 'production':
          mergedConfig.client.runtimeApiUrl = 'https://api.symbiont.com';
          break;
        case 'staging':
          mergedConfig.client.runtimeApiUrl = 'https://staging-api.symbiont.com';
          break;
        default:
          mergedConfig.client.runtimeApiUrl = 'https://dev-api.symbiont.com';
      }
    }

    if (!mergedConfig.client.toolReviewApiUrl) {
      switch (mergedConfig.environment) {
        case 'production':
          mergedConfig.client.toolReviewApiUrl = 'https://tool-review.symbiont.com';
          break;
        case 'staging':
          mergedConfig.client.toolReviewApiUrl = 'https://staging-tool-review.symbiont.com';
          break;
        default:
          mergedConfig.client.toolReviewApiUrl = 'https://dev-tool-review.symbiont.com';
      }
    }

    // Validate that at least one authentication method is provided
    if (!mergedConfig.auth.apiKey && !mergedConfig.auth.jwt?.accessToken) {
      throw new Error('Either auth.apiKey or auth.jwt.accessToken must be provided for authentication');
    }

    return mergedConfig;
  }

  /**
   * Convert enhanced config to legacy format for backward compatibility
   */
  private convertToLegacyConfig(enhancedConfig: EnhancedSymbiontConfig): SymbiontConfig {
    return {
      runtimeApiUrl: enhancedConfig.client.runtimeApiUrl,
      toolReviewApiUrl: enhancedConfig.client.toolReviewApiUrl,
      apiKey: enhancedConfig.auth.apiKey,
      jwt: enhancedConfig.auth.jwt?.accessToken,
      validationMode: enhancedConfig.validationMode,
      environment: enhancedConfig.environment,
      timeout: enhancedConfig.client.timeout,
      retryConfig: enhancedConfig.client.retryConfig,
      cacheConfig: enhancedConfig.client.cacheConfig,
      debug: enhancedConfig.debug,
      secretsFile: enhancedConfig.secretsFile,
    };
  }

  /**
   * Create enhanced config from legacy config by parsing environment variables
   */
  private createEnhancedConfigFromLegacy(legacyConfig: SymbiontConfig): EnhancedSymbiontConfig {
    const envConfig = EnvManager.parseEnvironment();
    
    return {
      client: {
        runtimeApiUrl: legacyConfig.runtimeApiUrl || envConfig.client.runtimeApiUrl,
        toolReviewApiUrl: legacyConfig.toolReviewApiUrl || envConfig.client.toolReviewApiUrl,
        timeout: legacyConfig.timeout || envConfig.client.timeout,
        retryConfig: legacyConfig.retryConfig || envConfig.client.retryConfig,
        cacheConfig: legacyConfig.cacheConfig || envConfig.client.cacheConfig,
        ...envConfig.client,
      },
      auth: {
        strategy: 'jwt' as const,
        apiKey: legacyConfig.apiKey || envConfig.auth.apiKey,
        jwt: legacyConfig.jwt ? { accessToken: legacyConfig.jwt } : envConfig.auth.jwt,
        ...envConfig.auth,
      },
      vector: envConfig.vector ? {
        provider: 'qdrant' as const,
        ...envConfig.vector
      } : undefined,
      database: envConfig.database ? {
        provider: 'postgresql' as const,
        ...envConfig.database
      } : undefined,
      logging: envConfig.logging ? {
        level: 'info' as const,
        format: 'simple' as const,
        ...envConfig.logging
      } : undefined,
      environment: (legacyConfig.environment || envConfig.environment) as 'development' | 'staging' | 'production',
      debug: legacyConfig.debug !== undefined ? legacyConfig.debug : envConfig.debug,
      validationMode: legacyConfig.validationMode,
      secretsFile: legacyConfig.secretsFile,
    };
  }

  /**
   * Initialize the secrets manager for internal use
   */
  private initializeSecretsManager(): any {
    try {
      const { SecretManager } = require('@symbiont/secrets');
      
      const defaultConfig = {
        providers: [
          {
            name: 'environment' as const,
            priority: 100,
            prefix: 'SYMBIONT_'
          },
          ...(this.config.secretsFile ? [{
            name: 'file' as const,
            priority: 50,
            filePath: this.config.secretsFile,
            format: 'json' as const
          }] : [])
        ],
        defaultTimeout: 5000,
        cacheEnabled: true,
        cacheTtl: 300000,
        debug: this.config.debug || false
      };
      
      return new SecretManager(defaultConfig);
    } catch (error) {
      if (this.config.debug) {
        console.warn('Failed to initialize SecretManager:', error);
      }
      return null;
    }
  }

  /**
   * Get the current configuration
   */
  public get configuration(): Readonly<SymbiontConfig> {
    return Object.freeze({ ...this.config });
  }

  /**
   * Lazy-loaded agents client
   */
  get agents(): any {
    if (!this._agents) {
      // Dynamic import to avoid circular dependencies
      const { AgentClient } = require('@symbiont/agent');
      this._agents = new AgentClient(this);
    }
    return this._agents;
  }

  /**
   * Lazy-loaded schedules client
   */
  get schedules(): any {
    if (!this._schedules) {
      const { ScheduleClient } = require('@symbiont/agent');
      this._schedules = new ScheduleClient(this);
    }
    return this._schedules;
  }

  /**
   * Lazy-loaded workflows client
   */
  get workflows(): any {
    if (!this._workflows) {
      const { WorkflowClient } = require('@symbiont/agent');
      this._workflows = new WorkflowClient(this);
    }
    return this._workflows;
  }

  /**
   * Lazy-loaded system client
   */
  get system(): any {
    if (!this._system) {
      this._system = new SystemClient(this);
    }
    return this._system;
  }

  /**
   * Lazy-loaded policies client
   */
  get policies(): any {
    if (!this._policies) {
      throw new Error('PolicyClient not yet implemented. This will be available in Phase 3.');
    }
    return this._policies;
  }

  /**
   * Lazy-loaded secrets client
   */
  get secrets(): any {
    if (!this._secrets) {
      // Dynamic import to avoid circular dependencies
      const { SecretManager } = require('@symbiont/secrets');
      
      // Default configuration with environment and file providers
      const defaultConfig = {
        providers: [
          {
            name: 'environment' as const,
            priority: 100,
            prefix: 'SYMBIONT_'
          },
          ...(this.config.secretsFile ? [{
            name: 'file' as const,
            priority: 50,
            filePath: this.config.secretsFile,
            format: 'json' as const
          }] : [])
        ],
        defaultTimeout: 5000,
        cacheEnabled: true,
        cacheTtl: 300000,
        debug: this.config.debug || false
      };
      
      this._secrets = new SecretManager(defaultConfig);
    }
    return this._secrets;
  }

  /**
   * Lazy-loaded tool review client
   */
  get toolReview(): any {
    if (!this._toolReview) {
      // Dynamic import to avoid circular dependencies
      const { ToolReviewClient } = require('@symbiont/tool-review');
      this._toolReview = new ToolReviewClient(this);
    }
    return this._toolReview;
  }

  /**
   * Lazy-loaded MCP client
   */
  get mcp(): any {
    if (!this._mcp) {
      // Dynamic import to avoid circular dependencies
      const { McpClient } = require('@symbiont/mcp');
      this._mcp = new McpClient(this);
    }
    return this._mcp;
  }

  /**
   * Lazy-loaded HTTP endpoint manager
   */
  get http(): any {
    if (!this._http) {
      // Dynamic import to avoid circular dependencies
      const { HttpEndpointManager } = require('./http');
      
      // Get HTTP configuration with defaults
      const httpConfig = {
        port: 3000,
        host: '0.0.0.0',
        cors: true,
        logging: this.config.debug || false,
        metrics: true,
      };
      
      // Get auth manager for authentication integration
      const authManager = this.authManager;
      
      this._http = new HttpEndpointManager(httpConfig, authManager);
    }
    return this._http;
  }

  /**
   * Create a new PolicyBuilder instance for building policy definitions locally
   */
  get policyBuilder(): any {
    // Dynamic import to avoid circular dependencies
    const { PolicyBuilder } = require('@symbiont/policy');
    return new PolicyBuilder();
  }

  /**
   * Connect to the Symbiont APIs and verify authentication
   */
  async connect(): Promise<void> {
    try {
      if (this.config.debug) {
        console.log('Connecting to Symbiont APIs...');
      }

      // Verify authentication tokens
      await this.authManager.refreshTokens();

      // Perform health checks on available APIs
      const healthStatus = await this.health();
      
      if (healthStatus.status !== 'healthy') {
        throw new Error(`API health check failed: ${healthStatus.status}`);
      }

      if (this.config.debug) {
        console.log('Successfully connected to Symbiont APIs');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to connect to Symbiont APIs: ${message}`);
    }
  }

  /**
   * Get health status of the APIs
   */
  async health(): Promise<HealthStatus> {
    try {
      const response: HealthResponse = await this.system.health();
      return {
        status: 'healthy',
        timestamp: response.timestamp,
        version: response.version,
        uptime: response.uptime_seconds * 1000,
      };
    } catch (err) {
      if (this.config.debug) {
        console.error('Health check failed:', err);
      }
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Validate and normalize the configuration
   */
  private validateAndNormalizeConfig(config: SymbiontConfig): SymbiontConfig {
    const normalized: SymbiontConfig = {
      validationMode: config.validationMode || 'development',
      environment: config.environment || 'development',
      timeout: config.timeout || 30000,
      debug: config.debug || false,
      ...config,
    };

    // Set default API URLs based on environment if not provided
    if (!normalized.runtimeApiUrl) {
      switch (normalized.environment) {
        case 'production':
          normalized.runtimeApiUrl = 'https://api.symbiont.com';
          break;
        case 'staging':
          normalized.runtimeApiUrl = 'https://staging-api.symbiont.com';
          break;
        default:
          normalized.runtimeApiUrl = 'https://dev-api.symbiont.com';
      }
    }

    if (!normalized.toolReviewApiUrl) {
      switch (normalized.environment) {
        case 'production':
          normalized.toolReviewApiUrl = 'https://tool-review.symbiont.com';
          break;
        case 'staging':
          normalized.toolReviewApiUrl = 'https://staging-tool-review.symbiont.com';
          break;
        default:
          normalized.toolReviewApiUrl = 'https://dev-tool-review.symbiont.com';
      }
    }

    // Validate that at least one authentication method is provided
    if (!normalized.apiKey && !normalized.jwt) {
      throw new Error('Either apiKey or jwt must be provided for authentication');
    }

    return normalized;
  }

  /**
   * Get authentication headers for a specific endpoint
   * Exposed for advanced use cases
   */
  async getAuthHeaders(endpoint: string): Promise<Record<string, string>> {
    return this.authManager.getAuthHeaders(endpoint);
  }

  /**
   * Manually refresh authentication tokens
   */
  async refreshAuth(): Promise<void> {
    await this.authManager.refreshTokens();
  }
}