/**
 * Secret management types for the Symbiont SDK
 */

/**
 * Result of a secret resolution attempt
 */
export interface SecretResolutionResult {
  value: string;
  source: string;
  found: boolean;
}

/**
 * Configuration for secret providers
 */
export interface SecretProviderConfig {
  name: string;
  priority?: number;
  [key: string]: unknown;
}

/**
 * Environment variable provider configuration
 */
export interface EnvironmentVariableProviderConfig extends SecretProviderConfig {
  name: 'environment';
  prefix?: string;
  transform?: (key: string) => string;
}

/**
 * File provider configuration
 */
export interface FileProviderConfig extends SecretProviderConfig {
  name: 'file';
  filePath: string;
  format?: 'json' | 'env';
  encoding?: BufferEncoding;
}

/**
 * Vault provider configuration (for future implementation)
 */
export interface VaultProviderConfig extends SecretProviderConfig {
  name: 'vault';
  url: string;
  token?: string;
  namespace?: string;
  mount?: string;
}

/**
 * Union type for all provider configurations
 */
export type ProviderConfig = 
  | EnvironmentVariableProviderConfig 
  | FileProviderConfig 
  | VaultProviderConfig;

/**
 * Interface for secret providers
 */
export interface SecretProvider {
  readonly name: string;
  readonly priority: number;
  
  /**
   * Resolve a secret by key
   * @param key - The secret key to resolve
   * @returns Promise resolving to SecretResolutionResult
   */
  getSecret(key: string): Promise<SecretResolutionResult>;
  
  /**
   * Check if the provider is available and properly configured
   * @returns Promise resolving to boolean indicating availability
   */
  isAvailable(): Promise<boolean>;
  
  /**
   * Initialize the provider (if needed)
   * @returns Promise that resolves when initialization is complete
   */
  initialize?(): Promise<void>;
  
  /**
   * Clean up resources (if needed)
   * @returns Promise that resolves when cleanup is complete
   */
  cleanup?(): Promise<void>;
}

/**
 * Configuration for the SecretManager
 */
export interface SecretManagerConfig {
  providers: ProviderConfig[];
  defaultTimeout?: number;
  cacheEnabled?: boolean;
  cacheTtl?: number;
  debug?: boolean;
}

/**
 * Options for secret resolution
 */
export interface SecretResolutionOptions {
  timeout?: number;
  required?: boolean;
  defaultValue?: string;
  providerName?: string;
}

/**
 * Cache entry for resolved secrets
 */
export interface SecretCacheEntry {
  value: string;
  source: string;
  timestamp: number;
  ttl: number;
}

/**
 * Error types for secret management
 */
export class SecretError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly key?: string,
    public readonly provider?: string
  ) {
    super(message);
    this.name = 'SecretError';
  }
}

export class SecretNotFoundError extends SecretError {
  constructor(key: string, providers: string[]) {
    super(
      `Secret '${key}' not found in any of the configured providers: ${providers.join(', ')}`,
      'SECRET_NOT_FOUND',
      key
    );
    this.name = 'SecretNotFoundError';
  }
}

export class SecretProviderError extends SecretError {
  constructor(message: string, provider: string, key?: string) {
    super(message, 'PROVIDER_ERROR', key, provider);
    this.name = 'SecretProviderError';
  }
}

export class SecretTimeoutError extends SecretError {
  constructor(key: string, timeout: number) {
    super(
      `Secret resolution for '${key}' timed out after ${timeout}ms`,
      'TIMEOUT',
      key
    );
    this.name = 'SecretTimeoutError';
  }
}