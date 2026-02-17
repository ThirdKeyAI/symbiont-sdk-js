import {
  SecretProvider,
  SecretManagerConfig,
  SecretResolutionOptions,
  SecretResolutionResult,
  SecretCacheEntry,
  SecretError,
  SecretNotFoundError,
  SecretTimeoutError,
  ProviderConfig
} from '@symbi/types';

/**
 * SecretManager provides a unified interface for resolving secrets from multiple sources
 */
export class SecretManager {
  private providers: SecretProvider[] = [];
  private cache = new Map<string, SecretCacheEntry>();
  private config: Required<SecretManagerConfig>;

  constructor(config: SecretManagerConfig) {
    this.config = {
      defaultTimeout: 5000,
      cacheEnabled: true,
      cacheTtl: 300000, // 5 minutes
      debug: false,
      ...config
    };

    // Note: Provider initialization moved to initialize() method to avoid race conditions
  }

  /**
   * Get a secret by key, trying providers in priority order
   */
  async getSecret(
    key: string, 
    options: SecretResolutionOptions = {}
  ): Promise<string> {
    const opts = {
      timeout: this.config.defaultTimeout,
      required: true,
      ...options
    };

    if (this.config.debug) {
      console.log(`SecretManager: Resolving secret '${key}'`);
    }

    // Check cache first if enabled
    if (this.config.cacheEnabled && !opts.providerName) {
      const cached = this.getCachedSecret(key);
      if (cached) {
        if (this.config.debug) {
          console.log(`SecretManager: Found '${key}' in cache from ${cached.source}`);
        }
        return cached.value;
      }
    }

    // Filter providers if specific provider requested
    const providersToTry = opts.providerName
      ? this.providers.filter(p => p.name === opts.providerName)
      : this.providers;

    if (providersToTry.length === 0) {
      throw new SecretError(
        `No providers available${opts.providerName ? ` for provider '${opts.providerName}'` : ''}`,
        'NO_PROVIDERS'
      );
    }

    // Create timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new SecretTimeoutError(key, opts.timeout!)), opts.timeout);
    });

    try {
      // Try to resolve from providers with timeout
      const result = await Promise.race([
        this.resolveFromProviders(key, providersToTry),
        timeoutPromise
      ]);

      if (result.found) {
        // Cache the result if caching is enabled
        if (this.config.cacheEnabled) {
          this.setCachedSecret(key, result.value, result.source);
        }

        if (this.config.debug) {
          console.log(`SecretManager: Resolved '${key}' from ${result.source}`);
        }

        return result.value;
      }

      // Secret not found in any provider
      if (opts.defaultValue !== undefined) {
        if (this.config.debug) {
          console.log(`SecretManager: Using default value for '${key}'`);
        }
        return opts.defaultValue;
      }

      if (opts.required) {
        throw new SecretNotFoundError(key, providersToTry.map(p => p.name));
      }

      return '';
    } catch (error) {
      if (error instanceof SecretError) {
        throw error;
      }

      throw new SecretError(
        `Failed to resolve secret '${key}': ${error instanceof Error ? error.message : 'Unknown error'}`,
        'RESOLUTION_FAILED',
        key
      );
    }
  }

  /**
   * Check if a secret exists without retrieving its value
   */
  async hasSecret(key: string, providerName?: string): Promise<boolean> {
    try {
      const result = await this.getSecret(key, { 
        required: false, 
        providerName,
        timeout: 2000 // Shorter timeout for existence checks
      });
      return result !== '';
    } catch {
      return false;
    }
  }

  /**
   * Get all available providers
   */
  getProviders(): ReadonlyArray<SecretProvider> {
    return [...this.providers];
  }

  /**
   * Get a specific provider by name
   */
  getProvider(name: string): SecretProvider | undefined {
    return this.providers.find(p => p.name === name);
  }

  /**
   * Clear the secret cache
   */
  clearCache(): void {
    this.cache.clear();
    if (this.config.debug) {
      console.log('SecretManager: Cache cleared');
    }
  }

  /**
   * Initialize the manager - loads providers and initializes them
   */
  async initialize(): Promise<void> {
    // First, initialize providers from configuration
    await this.initializeProviders();

    // Then initialize any provider-specific setup
    const initPromises = this.providers
      .filter(p => p.initialize)
      .map(p => p.initialize!());

    await Promise.allSettled(initPromises);

    if (this.config.debug) {
      console.log(`SecretManager: Initialized with ${this.providers.length} providers`);
    }
  }

  async cleanup(): Promise<void> {
    const cleanupPromises = this.providers
      .filter(p => p.cleanup)
      .map(p => p.cleanup!());

    await Promise.allSettled(cleanupPromises);
    this.clearCache();

    if (this.config.debug) {
      console.log('SecretManager: Cleanup completed');
    }
  }

  /**
   * Initialize providers from configuration
   */
  private async initializeProviders(): Promise<void> {
    // Dynamically import and create providers
    for (const providerConfig of this.config.providers) {
      try {
        const provider = await this.createProvider(providerConfig);
        if (await provider.isAvailable()) {
          this.providers.push(provider);
        } else if (this.config.debug) {
          console.warn(`SecretManager: Provider '${providerConfig.name}' is not available`);
        }
      } catch (error) {
        if (this.config.debug) {
          console.error(`SecretManager: Failed to create provider '${providerConfig.name}':`, error);
        }
      }
    }

    // Sort providers by priority (higher priority first)
    this.providers.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Create a provider instance from configuration
   */
  private async createProvider(config: ProviderConfig): Promise<SecretProvider> {
    switch (config.name) {
      case 'environment': {
        const { EnvironmentVariableProvider } = await import('./providers/EnvironmentVariableProvider');
        return new EnvironmentVariableProvider(config);
      }
      case 'file': {
        const { FileProvider } = await import('./providers/FileProvider');
        return new FileProvider(config);
      }
      case 'vault': {
        const { VaultProvider } = await import('./providers/VaultProvider');
        return new VaultProvider(config);
      }
      default:
        throw new SecretError(
          `Unknown provider type: ${(config as any).name}`,
          'UNKNOWN_PROVIDER'
        );
    }
  }

  /**
   * Resolve secret from available providers
   */
  private async resolveFromProviders(
    key: string, 
    providers: SecretProvider[]
  ): Promise<SecretResolutionResult> {
    for (const provider of providers) {
      try {
        const result = await provider.getSecret(key);
        if (result.found) {
          return result;
        }
      } catch (error) {
        if (this.config.debug) {
          console.warn(`SecretManager: Provider '${provider.name}' failed for key '${key}':`, error);
        }
        // Continue to next provider on error
      }
    }

    return {
      value: '',
      source: '',
      found: false
    };
  }

  /**
   * Get cached secret if available and not expired
   */
  private getCachedSecret(key: string): SecretCacheEntry | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry;
  }

  /**
   * Cache a resolved secret
   */
  private setCachedSecret(key: string, value: string, source: string): void {
    this.cache.set(key, {
      value,
      source,
      timestamp: Date.now(),
      ttl: this.config.cacheTtl
    });
  }
}