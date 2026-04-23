# symbi-types

[![npm](https://img.shields.io/npm/v/symbi-types.svg)](https://www.npmjs.com/package/symbi-types)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](../../LICENSE)

Shared TypeScript interfaces and [Zod](https://zod.dev) schemas for the Symbiont SDK. Part of the [Symbiont JavaScript/TypeScript SDK](https://github.com/ThirdKeyAI/symbiont-sdk-js) — the official client for Symbiont, the policy-governed agent runtime.

Most users don't install this directly — it's re-exported from [`symbi-core`](https://www.npmjs.com/package/symbi-core). Pull it in explicitly when you want types (and Zod schemas) without any runtime code.

## Install

```bash
npm install symbi-types
```

## Usage

```typescript
import type {
  Agent,
  ExecutionResult,
  ToolManifestInfo,
  CommunicationRule,
  WebhookInvocationResponse,
} from 'symbi-types';

// Zod schemas are available for every type:
import { WebhookInvocationResponseSchema } from 'symbi-types';

const parsed = WebhookInvocationResponseSchema.parse(await response.json());
```

## Scope

Types and schemas cover every runtime surface the SDK speaks to: agents, schedules, channels, workflows, reasoning-loop (ORGA, Cedar, journal, circuit breakers, knowledge bridge), ToolClad manifests, Communication Policy Gate, AgentPin credentials, secrets, MCP, HTTP endpoints, webhooks (verification + v1.10.0 HTTP Input invocation responses), skills, memory, metrics.

## See also

- [`symbi-core`](https://www.npmjs.com/package/symbi-core) — main client
- [SDK README](https://github.com/ThirdKeyAI/symbiont-sdk-js#readme) — full capabilities, examples, Trust Stack integration
- [docs.symbiont.dev](https://docs.symbiont.dev) — runtime documentation

## License

Apache 2.0. See [LICENSE](../../LICENSE).
