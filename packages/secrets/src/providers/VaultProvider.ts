import {
  SecretProvider,
  SecretResolutionResult,
  VaultProviderConfig,
  SecretProviderError
} from '@symbi/types';

/**
 * Provider that resolves secrets from HashiCorp Vault
 * This is a placeholder implementation for future development
 */
export class VaultProvider implements SecretProvider {
  readonly name = 'vault';
  readonly priority: number;
  private config: VaultProviderConfig;

  constructor(config: VaultProviderConfig) {
    this.config = config;
    this.priority = config.priority ?? 75; // Default high priority
  }

  /**
   * Get secret from Vault (placeholder implementation)
   */
  async getSecret(key: string): Promise<SecretResolutionResult> {
    throw new SecretProviderError(
      'Vault provider is not yet implemented. This will be available in a future release.',
      this.name,
      key
    );
  }

  /**
   * Vault provider is not available yet
   */
  async isAvailable(): Promise<boolean> {
    return false; // Not implemented yet
  }

  /**
   * Initialize Vault connection (placeholder)
   */
  async initialize(): Promise<void> {
    throw new SecretProviderError(
      'Vault provider initialization is not yet implemented',
      this.name
    );
  }

  /**
   * Cleanup Vault connection (placeholder)
   */
  async cleanup(): Promise<void> {
    // No-op for now
  }
}