import { SymbiontConfig, HealthStatus } from '@symbiont/types';
import { AuthenticationManager } from './auth';

/**
 * Main Symbiont SDK client providing unified access to both Runtime and Tool Review APIs
 */
export class SymbiontClient {
  private config: SymbiontConfig;
  private authManager: AuthenticationManager;
  
  // Lazy-loaded specialized clients
  private _agents?: any; // AgentClient - loaded dynamically to avoid circular deps
  private _policies?: any; // PolicyClient
  private _secrets?: any; // SecretsClient
  private _toolReview?: any; // ToolReviewClient
  private _mcp?: any; // McpClient

  /**
   * Create a new Symbiont SDK client
   * @param config - Configuration for the SDK
   */
  constructor(config: SymbiontConfig) {
    this.config = this.validateAndNormalizeConfig(config);
    
    // Initialize secrets manager first
    const secretsManager = this.initializeSecretsManager();
    
    // Pass secrets manager to auth manager
    this.authManager = new AuthenticationManager(this.config, secretsManager);
    
    if (this.config.debug) {
      console.log('SymbiontClient initialized with config:', {
        runtimeApiUrl: this.config.runtimeApiUrl,
        toolReviewApiUrl: this.config.toolReviewApiUrl,
        validationMode: this.config.validationMode,
        environment: this.config.environment,
      });
    }
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
      // For now, return a mock health status
      // In future phases, this will make actual API calls
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        uptime: Date.now(),
      };
    } catch {
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