import {
  SecretResolutionOptions,
  SecretProvider,
  SecretResolutionResult,
  SecretManagerConfig
} from '@symbiont/types';

/**
 * Mock secret manager for testing
 */
export class MockSecretManager {
  private secrets = new Map<string, string>();
  private providers: MockSecretProvider[] = [];
  private secretCalls: SecretCall[] = [];
  private shouldThrow = false;
  private throwError: Error | null = null;

  constructor(config?: Partial<SecretManagerConfig>) {
    // Initialize with some default mock providers
    this.providers = [
      new MockSecretProvider('environment', 100),
      new MockSecretProvider('file', 50)
    ];
  }

  /**
   * Set a mock secret value
   */
  setSecret(key: string, value: string, providerName?: string): void {
    const fullKey = providerName ? `${providerName}:${key}` : key;
    this.secrets.set(fullKey, value);
  }

  /**
   * Set multiple secrets at once
   */
  setSecrets(secrets: Record<string, string>, providerName?: string): void {
    Object.entries(secrets).forEach(([key, value]) => {
      this.setSecret(key, value, providerName);
    });
  }

  /**
   * Configure the mock to throw an error
   */
  setShouldThrow(error: Error | boolean): void {
    if (error === true) {
      this.shouldThrow = true;
      this.throwError = new Error('Mock secret resolution failed');
    } else if (error instanceof Error) {
      this.shouldThrow = true;
      this.throwError = error;
    } else {
      this.shouldThrow = false;
      this.throwError = null;
    }
  }

  /**
   * Clear all mock secrets
   */
  clearSecrets(): void {
    this.secrets.clear();
    this.secretCalls = [];
    this.shouldThrow = false;
    this.throwError = null;
  }

  /**
   * Get call history for verification
   */
  getSecretCalls(): readonly SecretCall[] {
    return [...this.secretCalls];
  }

  /**
   * Get calls for a specific secret key
   */
  getCallsForSecret(key: string): SecretCall[] {
    return this.secretCalls.filter(call => call.key === key);
  }

  /**
   * Mock implementation of getSecret
   */
  async getSecret(
    key: string, 
    options: SecretResolutionOptions = {}
  ): Promise<string> {
    this.secretCalls.push({
      key,
      options: { ...options },
      timestamp: new Date()
    });

    if (this.shouldThrow && this.throwError) {
      throw this.throwError;
    }

    const opts = {
      timeout: 5000,
      required: true,
      ...options
    };

    // Try provider-specific secret first
    if (opts.providerName) {
      const providerKey = `${opts.providerName}:${key}`;
      const value = this.secrets.get(providerKey);
      if (value !== undefined) {
        return value;
      }
    }

    // Try general secret
    const value = this.secrets.get(key);
    if (value !== undefined) {
      return value;
    }

    // Return default value if provided
    if (opts.defaultValue !== undefined) {
      return opts.defaultValue;
    }

    // Throw if required and not found
    if (opts.required) {
      throw new Error(`Secret '${key}' not found in mock`);
    }

    return '';
  }

  /**
   * Mock implementation of hasSecret
   */
  async hasSecret(key: string, providerName?: string): Promise<boolean> {
    const fullKey = providerName ? `${providerName}:${key}` : key;
    return this.secrets.has(fullKey) || this.secrets.has(key);
  }

  /**
   * Mock implementation of getProviders
   */
  getProviders(): ReadonlyArray<SecretProvider> {
    return [...this.providers];
  }

  /**
   * Mock implementation of getProvider
   */
  getProvider(name: string): SecretProvider | undefined {
    return this.providers.find(p => p.name === name);
  }

  /**
   * Mock implementation of clearCache
   */
  clearCache(): void {
    // No-op for mock
  }

  /**
   * Mock implementation of initialize
   */
  async initialize(): Promise<void> {
    // No-op for mock
  }

  /**
   * Mock implementation of cleanup
   */
  async cleanup(): Promise<void> {
    this.clearSecrets();
  }
}

/**
 * Mock secret provider
 */
class MockSecretProvider implements SecretProvider {
  constructor(
    public readonly name: string,
    public readonly priority: number
  ) {}

  async getSecret(key: string): Promise<SecretResolutionResult> {
    return {
      value: `mock-${key}`,
      source: this.name,
      found: true
    };
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }
}

export interface SecretCall {
  key: string;
  options: SecretResolutionOptions;
  timestamp: Date;
}