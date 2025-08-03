# Secrets Management Guide

This guide covers securely handling credentials, API keys, and other sensitive data using the Symbiont SDK's [`SecretManager`](../api/classes/secrets_src.SecretManager.html) and secret providers.

## Table of Contents

- [Overview](#overview)
- [Basic Setup](#basic-setup)
- [Secret Providers](#secret-providers)
- [Retrieving Secrets](#retrieving-secrets)
- [Provider Configuration](#provider-configuration)
- [Advanced Usage](#advanced-usage)
- [Best Practices](#best-practices)
- [Security Considerations](#security-considerations)

## Overview

The [`SecretManager`](../api/classes/secrets_src.SecretManager.html) provides a unified interface for resolving secrets from multiple sources with automatic fallback, caching, and security features. It supports multiple provider types and allows for flexible configuration based on your deployment environment.

### Key Features

- **Multiple Providers**: Environment variables, files, HashiCorp Vault, and more
- **Automatic Fallback**: Try providers in priority order
- **Intelligent Caching**: Configurable caching with TTL
- **Provider Priority**: Control the order of secret resolution
- **Async Operation**: Non-blocking secret retrieval
- **Error Handling**: Comprehensive error handling with specific error types

### Supported Providers

- **Environment Variables**: Read from process environment
- **File Provider**: Read from JSON/YAML files  
- **Vault Provider**: Integration with HashiCorp Vault
- **Custom Providers**: Implement your own secret sources

## Basic Setup

### Quick Start

```typescript
import { SecretManager } from '@symbiont/secrets';

// Basic configuration with environment variables
const secretManager = new SecretManager({
  providers: [
    {
      name: 'environment',
      priority: 100,
      prefix: 'MYAPP_' // Optional prefix for environment variables
    }
  ],
  defaultTimeout: 5000,
  cacheEnabled: true,
  cacheTtl: 300000, // 5 minutes
  debug: false
});

// Initialize the manager
await secretManager.initialize();

// Retrieve a secret
const apiKey = await secretManager.getSecret('API_KEY');
console.log('API Key retrieved');
```

### Using with SymbiontClient

The SymbiontClient automatically uses a SecretManager internally:

```typescript
import { SymbiontClient } from '@symbiont/core';

const client = new SymbiontClient({
  apiKey: process.env.SYMBIONT_API_KEY, // Direct value
  // or let SecretManager resolve it:
  // (SecretManager will automatically try to resolve missing keys)
  secretsFile: './config/secrets.json' // Optional secrets file
});

// The client will use SecretManager internally for auth token resolution
await client.connect();
```

## Secret Providers

### Environment Variable Provider

Reads secrets from environment variables with optional prefix support.

```typescript
import { SecretManager, EnvironmentVariableProvider } from '@symbiont/secrets';

const secretManager = new SecretManager({
  providers: [
    {
      name: 'environment',
      priority: 100,
      prefix: 'SYMBIONT_', // Will look for SYMBIONT_API_KEY, SYMBIONT_DB_PASSWORD, etc.
      caseSensitive: true // Default: true
    }
  ]
});

await secretManager.initialize();

// This will look for SYMBIONT_API_KEY in environment
const apiKey = await secretManager.getSecret('API_KEY');

// Or access without prefix
const dbPassword = await secretManager.getSecret('SYMBIONT_DB_PASSWORD');
```

### File Provider

Reads secrets from JSON or YAML files.

```typescript
// Create a secrets file: config/secrets.json
const secretsContent = {
  "api_key": "sk-1234567890",
  "database": {
    "username": "app_user",
    "password": "secure_password",
    "host": "db.example.com"
  },
  "external_services": {
    "stripe_key": "sk_test_...",
    "sendgrid_key": "SG...."
  }
};

const secretManager = new SecretManager({
  providers: [
    {
      name: 'file',
      priority: 200,
      filePath: './config/secrets.json',
      format: 'json', // 'json' or 'yaml'
      watchFile: true // Reload on file changes
    },
    {
      name: 'environment',
      priority: 100 // Higher priority than file
    }
  ]
});

await secretManager.initialize();

// Access nested secrets using dot notation
const dbPassword = await secretManager.getSecret('database.password');
const stripeKey = await secretManager.getSecret('external_services.stripe_key');
```

### Vault Provider

Integration with HashiCorp Vault for enterprise secret management.

```typescript
const secretManager = new SecretManager({
  providers: [
    {
      name: 'vault',
      priority: 300,
      endpoint: 'https://vault.company.com',
      token: process.env.VAULT_TOKEN,
      namespace: 'myapp', // Optional namespace
      mountPath: 'secret', // KV mount path
      apiVersion: 'v2' // Vault KV API version
    },
    {
      name: 'environment',
      priority: 100 // Fallback to environment
    }
  ]
});

await secretManager.initialize();

// Vault secrets are accessed by path
const dbCreds = await secretManager.getSecret('database/production');
const apiKey = await secretManager.getSecret('api-keys/external-service');
```

### Multiple Providers with Fallback

```typescript
// Production configuration with multiple fallback providers
const secretManager = new SecretManager({
  providers: [
    // 1st priority: Vault for production secrets
    {
      name: 'vault',
      priority: 300,
      endpoint: process.env.VAULT_ENDPOINT,
      token: process.env.VAULT_TOKEN,
      mountPath: 'secret'
    },
    // 2nd priority: Local secrets file for development
    {
      name: 'file',
      priority: 200,
      filePath: './config/secrets.json',
      format: 'json'
    },
    // 3rd priority: Environment variables as fallback
    {
      name: 'environment',
      priority: 100,
      prefix: 'MYAPP_'
    }
  ],
  defaultTimeout: 10000,
  cacheEnabled: true,
  cacheTtl: 600000, // 10 minutes
  debug: process.env.NODE_ENV === 'development'
});
```

## Retrieving Secrets

### Basic Secret Retrieval

```typescript
// Simple secret retrieval
const apiKey = await secretManager.getSecret('API_KEY');

// Required secret (throws error if not found)
const dbPassword = await secretManager.getSecret('DB_PASSWORD', {
  required: true
});

// Optional secret with default value
const logLevel = await secretManager.getSecret('LOG_LEVEL', {
  required: false,
  defaultValue: 'info'
});

// With custom timeout
const slowSecret = await secretManager.getSecret('SLOW_SECRET', {
  timeout: 30000 // 30 seconds
});
```

### Provider-Specific Retrieval

```typescript
// Force retrieval from specific provider
const vaultSecret = await secretManager.getSecret('database/config', {
  providerName: 'vault'
});

const envSecret = await secretManager.getSecret('DEBUG_MODE', {
  providerName: 'environment'
});
```

### Error Handling

```typescript
import { 
  SecretNotFoundError, 
  SecretTimeoutError, 
  SecretProviderError 
} from '@symbiont/secrets';

try {
  const secret = await secretManager.getSecret('CRITICAL_SECRET', {
    required: true,
    timeout: 5000
  });
  
  console.log('Secret retrieved successfully');
} catch (error) {
  if (error instanceof SecretNotFoundError) {
    console.error(`Secret not found: ${error.key}`);
    console.error(`Tried providers: ${error.providers.join(', ')}`);
  } else if (error instanceof SecretTimeoutError) {
    console.error(`Secret retrieval timed out: ${error.key}`);
    console.error(`Timeout: ${error.timeout}ms`);
  } else if (error instanceof SecretProviderError) {
    console.error(`Provider error: ${error.provider}`);
    console.error(`Details: ${error.message}`);
  } else {
    console.error('Unexpected error:', error.message);
  }
}
```

### Checking Secret Existence

```typescript
// Check if secret exists without retrieving it
const hasApiKey = await secretManager.hasSecret('API_KEY');
if (hasApiKey) {
  const apiKey = await secretManager.getSecret('API_KEY');
}

// Check with specific provider
const hasVaultSecret = await secretManager.hasSecret('database/config', 'vault');
```

## Provider Configuration

### Environment Variable Provider Configuration

```typescript
const envProviderConfig = {
  name: 'environment',
  priority: 100,
  prefix: 'MYAPP_',           // Prefix for all environment variables
  caseSensitive: true,        // Case sensitive variable names
  stripPrefix: true,          // Remove prefix from secret keys
  transformKey: (key) => {    // Custom key transformation
    return key.toUpperCase().replace(/-/g, '_');
  }
};
```

### File Provider Configuration

```typescript
const fileProviderConfig = {
  name: 'file',
  priority: 200,
  filePath: './secrets.json',
  format: 'json',             // 'json' or 'yaml'
  watchFile: true,            // Watch for file changes
  encoding: 'utf8',           // File encoding
  keyPath: 'secrets',         // Root key in file (optional)
  transformKey: (key) => {    // Transform dot notation to nested access
    return key.split('.').reduce((obj, k) => obj?.[k], obj);
  }
};
```

### Vault Provider Configuration

```typescript
const vaultProviderConfig = {
  name: 'vault',
  priority: 300,
  endpoint: 'https://vault.company.com',
  token: process.env.VAULT_TOKEN,
  namespace: 'myapp',
  mountPath: 'secret',
  apiVersion: 'v2',
  timeout: 10000,
  retryAttempts: 3,
  retryDelay: 1000,
  tlsConfig: {
    rejectUnauthorized: true,
    ca: './certs/vault-ca.pem'
  }
};
```

## Advanced Usage

### Custom Secret Provider

```typescript
import { SecretProvider, SecretResolutionResult } from '@symbiont/secrets';

class DatabaseSecretProvider implements SecretProvider {
  name = 'database';
  priority = 150;

  constructor(private connectionString: string) {}

  async isAvailable(): Promise<boolean> {
    // Check if database is accessible
    try {
      // Attempt connection test
      return true;
    } catch {
      return false;
    }
  }

  async getSecret(key: string): Promise<SecretResolutionResult> {
    try {
      // Query database for secret
      const result = await this.queryDatabase(key);
      
      if (result) {
        return {
          value: result.value,
          source: `database:${this.name}`,
          found: true
        };
      } else {
        return {
          value: '',
          source: '',
          found: false
        };
      }
    } catch (error) {
      throw new Error(`Database secret provider error: ${error.message}`);
    }
  }

  private async queryDatabase(key: string): Promise<any> {
    // Implementation specific to your database
    // Return { value: string } or null
  }

  async initialize(): Promise<void> {
    // Setup database connection
  }

  async cleanup(): Promise<void> {
    // Close database connections
  }
}

// Use custom provider
const secretManager = new SecretManager({
  providers: [
    // Add custom provider to configuration
    // Note: This would require extending the configuration system
  ]
});
```

### Caching and Performance

```typescript
const secretManager = new SecretManager({
  providers: [
    { name: 'vault', priority: 300, endpoint: 'https://vault.company.com' },
    { name: 'environment', priority: 100 }
  ],
  
  // Caching configuration
  cacheEnabled: true,
  cacheTtl: 300000, // 5 minutes
  
  // Performance settings
  defaultTimeout: 5000,
  
  debug: true
});

// Pre-load frequently used secrets
const criticalSecrets = ['API_KEY', 'DB_PASSWORD', 'JWT_SECRET'];
await Promise.all(
  criticalSecrets.map(key => 
    secretManager.getSecret(key).catch(err => 
      console.warn(`Failed to pre-load ${key}:`, err.message)
    )
  )
);

// Clear cache when needed
secretManager.clearCache();
```

### Configuration-Based Setup

```typescript
// Load provider configuration from file
const configFile = './config/secret-providers.json';
const providerConfig = JSON.parse(fs.readFileSync(configFile, 'utf8'));

const secretManager = new SecretManager({
  providers: providerConfig.providers,
  defaultTimeout: providerConfig.timeout || 5000,
  cacheEnabled: providerConfig.cache?.enabled || true,
  cacheTtl: providerConfig.cache?.ttl || 300000,
  debug: process.env.NODE_ENV === 'development'
});

await secretManager.initialize();

// Batch secret retrieval
const secretKeys = ['API_KEY', 'DB_HOST', 'DB_USER', 'DB_PASSWORD', 'REDIS_URL'];
const secrets = await Promise.allSettled(
  secretKeys.map(async key => ({
    key,
    value: await secretManager.getSecret(key, { required: false })
  }))
);

const resolvedSecrets = secrets
  .filter(result => result.status === 'fulfilled')
  .map(result => result.value)
  .filter(secret => secret.value !== '');

console.log(`Resolved ${resolvedSecrets.length}/${secretKeys.length} secrets`);
```

## Best Practices

### 1. Provider Priority Strategy

```typescript
// ✅ Good: Logical priority ordering
const productionConfig = {
  providers: [
    // Highest priority: Dedicated secret management system
    { name: 'vault', priority: 300, endpoint: process.env.VAULT_ENDPOINT },
    
    // Medium priority: Kubernetes secrets (if in k8s)
    { name: 'file', priority: 200, filePath: '/var/secrets/app-secrets.json' },
    
    // Lowest priority: Environment variables (development/fallback)
    { name: 'environment', priority: 100, prefix: 'MYAPP_' }
  ]
};

// ❌ Bad: All same priority (unpredictable order)
const badConfig = {
  providers: [
    { name: 'vault', priority: 100 },
    { name: 'file', priority: 100 },
    { name: 'environment', priority: 100 }
  ]
};
```

### 2. Error Handling Strategy

```typescript
// ✅ Good: Graceful degradation
async function getConfigWithFallback() {
  const config = {
    apiKey: '',
    dbPassword: '',
    optionalFeature: false
  };

  try {
    // Critical secrets must be available
    config.apiKey = await secretManager.getSecret('API_KEY', { required: true });
    config.dbPassword = await secretManager.getSecret('DB_PASSWORD', { required: true });
  } catch (error) {
    console.error('Failed to load critical secrets:', error.message);
    throw new Error('Cannot start application without critical secrets');
  }

  try {
    // Optional secrets with fallback
    const featureFlag = await secretManager.getSecret('ENABLE_FEATURE_X', {
      required: false,
      defaultValue: 'false'
    });
    config.optionalFeature = featureFlag === 'true';
  } catch (error) {
    console.warn('Failed to load optional feature flag:', error.message);
  }

  return config;
}
```

### 3. Secret Rotation Handling

```typescript
// ✅ Good: Handle secret rotation gracefully
class SecretRotationHandler {
  private secretManager: SecretManager;
  private rotationCheckInterval: NodeJS.Timer;

  constructor(secretManager: SecretManager) {
    this.secretManager = secretManager;
  }

  startRotationMonitoring(intervalMs = 60000) {
    this.rotationCheckInterval = setInterval(async () => {
      try {
        // Clear cache to force fresh secret retrieval
        this.secretManager.clearCache();
        
        // Test critical secrets
        await this.secretManager.getSecret('API_KEY');
        console.log('Secret rotation check: OK');
      } catch (error) {
        console.error('Secret rotation check failed:', error.message);
        // Implement notification/alerting logic
      }
    }, intervalMs);
  }

  stopRotationMonitoring() {
    if (this.rotationCheckInterval) {
      clearInterval(this.rotationCheckInterval);
    }
  }
}
```

### 4. Environment-Specific Configuration

```typescript
// ✅ Good: Environment-aware configuration
function createSecretManager() {
  const environment = process.env.NODE_ENV || 'development';

  switch (environment) {
    case 'production':
      return new SecretManager({
        providers: [
          {
            name: 'vault',
            priority: 300,
            endpoint: process.env.VAULT_ENDPOINT,
            token: process.env.VAULT_TOKEN,
            namespace: 'production'
          },
          {
            name: 'environment',
            priority: 100,
            prefix: 'PROD_'
          }
        ],
        cacheEnabled: true,
        cacheTtl: 600000, // 10 minutes
        debug: false
      });

    case 'staging':
      return new SecretManager({
        providers: [
          {
            name: 'vault',
            priority: 300,
            endpoint: process.env.VAULT_ENDPOINT,
            token: process.env.VAULT_TOKEN,
            namespace: 'staging'
          },
          {
            name: 'file',
            priority: 200,
            filePath: './config/staging-secrets.json'
          },
          {
            name: 'environment',
            priority: 100,
            prefix: 'STAGING_'
          }
        ],
        cacheEnabled: true,
        cacheTtl: 300000, // 5 minutes
        debug: true
      });

    case 'development':
    default:
      return new SecretManager({
        providers: [
          {
            name: 'file',
            priority: 200,
            filePath: './config/dev-secrets.json'
          },
          {
            name: 'environment',
            priority: 100,
            prefix: 'DEV_'
          }
        ],
        cacheEnabled: false, // Disable cache for development
        debug: true
      });
  }
}
```

## Security Considerations

### 1. Secure File Permissions

```bash
# Ensure secret files have restricted permissions
chmod 600 ./config/secrets.json
chown app:app ./config/secrets.json

# For production, consider using encrypted files
gpg --encrypt --recipient ops@company.com secrets.json
```

### 2. Memory Security

```typescript
// ✅ Good: Clear sensitive data from memory
class SecureSecretManager {
  private secrets = new Map<string, string>();

  async getSecret(key: string): Promise<string> {
    try {
      const secret = await this.secretManager.getSecret(key);
      return secret;
    } finally {
      // Clear from cache after use for highly sensitive secrets
      if (this.isHighlySensitive(key)) {
        this.secretManager.clearCache();
      }
    }
  }

  private isHighlySensitive(key: string): boolean {
    const sensitivePrefixes = ['PRIVATE_KEY', 'JWT_SECRET', 'MASTER_PASSWORD'];
    return sensitivePrefixes.some(prefix => key.startsWith(prefix));
  }

  cleanup() {
    // Clear all cached secrets
    this.secrets.clear();
    this.secretManager.clearCache();
  }
}
```

### 3. Audit Logging

```typescript
// ✅ Good: Audit secret access
class AuditingSecretManager {
  private secretManager: SecretManager;
  private auditLogger: AuditLogger;

  constructor(secretManager: SecretManager, auditLogger: AuditLogger) {
    this.secretManager = secretManager;
    this.auditLogger = auditLogger;
  }

  async getSecret(key: string, options?: any): Promise<string> {
    const startTime = Date.now();
    
    try {
      const secret = await this.secretManager.getSecret(key, options);
      
      // Log successful access
      this.auditLogger.logSecretAccess({
        key,
        success: true,
        timestamp: new Date(),
        duration: Date.now() - startTime,
        provider: 'unknown', // Could be enhanced to track actual provider
        user: process.env.USER || 'system'
      });
      
      return secret;
    } catch (error) {
      // Log failed access
      this.auditLogger.logSecretAccess({
        key,
        success: false,
        error: error.message,
        timestamp: new Date(),
        duration: Date.now() - startTime,
        user: process.env.USER || 'system'
      });
      
      throw error;
    }
  }
}
```

## API Reference

For complete API documentation, see:

- [`SecretManager`](../api/classes/secrets_src.SecretManager.html) - Main secret management class
- [`EnvironmentVariableProvider`](../api/classes/secrets_src.EnvironmentVariableProvider.html) - Environment variable provider
- [`FileProvider`](../api/classes/secrets_src.FileProvider.html) - File-based secret provider
- [`VaultProvider`](../api/classes/secrets_src.VaultProvider.html) - HashiCorp Vault provider

### Key Methods

- [`getSecret()`](../api/classes/secrets_src.SecretManager.html#getSecret) - Retrieve a secret by key
- [`hasSecret()`](../api/classes/secrets_src.SecretManager.html#hasSecret) - Check if a secret exists
- [`initialize()`](../api/classes/secrets_src.SecretManager.html#initialize) - Initialize the secret manager
- [`clearCache()`](../api/classes/secrets_src.SecretManager.html#clearCache) - Clear the secret cache

## Next Steps

- **[Agent Management](./agent-management.md)** - Use secrets in AI agents
- **[Policy Creation](./policy-creation.md)** - Create policies for secret access
- **[Tool Review Workflow](./tool-review-workflow.md)** - Submit secret management tools for review
- **[API Reference](../api/index.html)** - Complete API documentation

For more examples and advanced secret management patterns, check out the [examples directory](../../examples/).
