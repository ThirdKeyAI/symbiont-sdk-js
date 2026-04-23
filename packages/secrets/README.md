# symbi-secrets

[![npm](https://img.shields.io/npm/v/symbi-secrets.svg)](https://www.npmjs.com/package/symbi-secrets)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](../../LICENSE)

Secret management for the [Symbiont JavaScript/TypeScript SDK](https://github.com/ThirdKeyAI/symbiont-sdk-js). Provides a pluggable `SecretManager` with HashiCorp Vault, encrypted-file, and environment-variable backends.

Most users install [`symbi-core`](https://www.npmjs.com/package/symbi-core), which exposes secrets via `client.secrets`. Pull this package directly when you want a narrow dependency for services that only need secret resolution.

## Install

```bash
npm install symbi-secrets
```

## Usage

```typescript
import {
  SecretManager,
  EnvironmentVariableProvider,
  FileProvider,
  VaultProvider,
} from 'symbi-secrets';

const manager = new SecretManager({
  providers: [
    new EnvironmentVariableProvider({ prefix: 'SYMBIONT_' }),
    new FileProvider({ path: '/run/secrets/symbiont.json' }),
    new VaultProvider({ endpoint: 'https://vault.internal', token: process.env.VAULT_TOKEN }),
  ],
});

const apiKey = await manager.get('api-key');
```

The manager tries providers in order. Use it for database credentials, API keys, and signing keys that shouldn't live in config.

## Providers

| Provider | Backend |
|----------|---------|
| `EnvironmentVariableProvider` | `process.env` with optional prefix and mapping |
| `FileProvider` | JSON / YAML / flat key-value files with optional AES-256-GCM encryption |
| `VaultProvider` | HashiCorp Vault (Token, Kubernetes, AWS IAM, AppRole auth methods) |

Implement the `SecretProvider` interface to add more.

## See also

- [`symbi-core`](https://www.npmjs.com/package/symbi-core) — exposes `client.secrets`
- [SDK README](https://github.com/ThirdKeyAI/symbiont-sdk-js#readme)
- [docs.symbiont.dev/security-model](https://docs.symbiont.dev/security-model)

## License

Apache 2.0. See [LICENSE](../../LICENSE).
