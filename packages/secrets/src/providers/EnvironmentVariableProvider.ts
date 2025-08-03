import {
  SecretProvider,
  SecretResolutionResult,
  EnvironmentVariableProviderConfig
} from '@symbiont/types';

/**
 * Provider that resolves secrets from environment variables
 */
export class EnvironmentVariableProvider implements SecretProvider {
  readonly name = 'environment';
  readonly priority: number;
  private config: EnvironmentVariableProviderConfig;

  constructor(config: EnvironmentVariableProviderConfig) {
    this.config = config;
    this.priority = config.priority ?? 100; // Default high priority
  }

  /**
   * Get secret from environment variables
   */
  async getSecret(key: string): Promise<SecretResolutionResult> {
    const transformedKey = this.transformKey(key);
    const value = process.env[transformedKey];

    return {
      value: value || '',
      source: 'environment',
      found: value !== undefined
    };
  }

  /**
   * Environment provider is always available in Node.js environments
   */
  async isAvailable(): Promise<boolean> {
    return typeof process !== 'undefined' && 
           typeof process.env === 'object' &&
           process.env !== null;
  }

  /**
   * Transform the key according to configuration
   */
  private transformKey(key: string): string {
    let transformedKey = key;

    // Apply prefix if configured
    if (this.config.prefix) {
      transformedKey = `${this.config.prefix}${transformedKey}`;
    }

    // Apply custom transform function if provided
    if (this.config.transform) {
      transformedKey = this.config.transform(transformedKey);
    }

    return transformedKey;
  }
}