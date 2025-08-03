/**
 * @symbiont/secrets - Secret management utilities for Symbiont SDK
 */

export { SecretManager } from './SecretManager';
export { EnvironmentVariableProvider } from './providers/EnvironmentVariableProvider';
export { FileProvider } from './providers/FileProvider';
export { VaultProvider } from './providers/VaultProvider';

// Re-export types from @symbiont/types for convenience
export type {
  SecretProvider,
  SecretResolutionResult,
  SecretManagerConfig,
  SecretResolutionOptions,
  SecretCacheEntry,
  ProviderConfig,
  EnvironmentVariableProviderConfig,
  FileProviderConfig,
  VaultProviderConfig,
  SecretError,
  SecretNotFoundError,
  SecretProviderError,
  SecretTimeoutError
} from '@symbiont/types';