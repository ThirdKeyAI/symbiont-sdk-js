# symbi-policy

[![npm](https://img.shields.io/npm/v/symbi-policy.svg)](https://www.npmjs.com/package/symbi-policy)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](../../LICENSE)

Policy builder for the [Symbiont JavaScript/TypeScript SDK](https://github.com/ThirdKeyAI/symbiont-sdk-js). Constructs `Policy` objects that the Symbiont runtime evaluates via its built-in DSL and [Cedar](https://www.cedarpolicy.com/) authorization.

Most users install [`symbi-core`](https://www.npmjs.com/package/symbi-core), which exposes a `policyBuilder` namespace on `SymbiontClient`. Pull this package directly when you want a narrow dependency for agents/services that only need to construct policies.

## Install

```bash
npm install symbi-policy
```

## Usage

```typescript
import { PolicyBuilder, createPolicyBuilder } from 'symbi-policy';

const policy = createPolicyBuilder()
  .allow({ action: 'read', resource: 'documents' })
  .deny({ action: 'write', resource: '*' })
  .audit({ action: '*', resource: '*' })
  .build();

// Attach to an agent definition or register with the runtime:
// await client.agents.createAgent({ name, description, policies: [policy], ... });
```

Fluent API supports `allow` / `deny` / `audit` effects, conditions (`when`, `unless`, timeboxed rules), priorities, and action/resource globbing.

## See also

- [`symbi-core`](https://www.npmjs.com/package/symbi-core) — exposes `client.policyBuilder`
- [SDK README](https://github.com/ThirdKeyAI/symbiont-sdk-js#readme)
- [docs.symbiont.dev/security-model](https://docs.symbiont.dev/security-model) — how Cedar policies flow through the runtime

## License

Apache 2.0. See [LICENSE](../../LICENSE).
