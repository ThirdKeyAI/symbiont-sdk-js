# symbi-core

[![npm](https://img.shields.io/npm/v/symbi-core.svg)](https://www.npmjs.com/package/symbi-core)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](../../LICENSE)

Main client for the [Symbiont JavaScript/TypeScript SDK](https://github.com/ThirdKeyAI/symbiont-sdk-js) — the official client for Symbiont, the policy-governed agent runtime.

`symbi-core` exposes `SymbiontClient` plus standalone modules (webhook verification, markdown memory, skill scanning, metrics). Types are re-exported from [`symbi-types`](https://www.npmjs.com/package/symbi-types), so most projects only need this one install.

## Install

```bash
npm install symbi-core
```

A running Symbiont runtime is required for client calls. The fastest way:

```bash
docker run --rm -p 8080:8080 -p 8081:8081 ghcr.io/thirdkeyai/symbi:latest up
```

## Quick start

```typescript
import { SymbiontClient } from 'symbi-core';

const client = new SymbiontClient({
  apiKey: process.env.SYMBIONT_API_KEY,
  apiUrl: 'http://localhost:8080/api/v1',
});

await client.connect();

const agents = await client.agents.listAgents();
const result = await client.agents.executeAgent(agents[0].id, { text: 'Hello, Symbiont!' });
console.log(result.result);
```

## What's exported

| Export | Purpose |
|--------|---------|
| `SymbiontClient` | Unified client with namespaced sub-clients for every runtime surface (see SDK README) |
| `AuthenticationManager`, `MemoryTokenCache` | Auth / token refresh |
| `HmacVerifier`, `JwtVerifier`, `createProviderVerifier` | Inbound webhook signature verification (GitHub, Stripe, Slack, custom) |
| `MarkdownMemoryStore` | File-based agent context that survives restarts |
| `SkillScanner`, `SkillLoader` | ClawHavoc security scanning (10 built-in rules) + YAML frontmatter loading |
| `MetricsApiClient`, `FileMetricsExporter`, `CompositeExporter`, `MetricsCollector` | Runtime metrics snapshots + periodic export |
| `SystemClient`, `CommunicationClient`, `ToolCladClient`, `ReasoningClient` | Runtime sub-clients |
| `HttpEndpointManager` | Dynamic HTTP endpoint management |

All types and Zod schemas from `symbi-types` are re-exported for convenience.

## Companion packages

| Package | Purpose |
|---------|---------|
| [`symbi-types`](https://www.npmjs.com/package/symbi-types) | Types + Zod schemas |
| [`symbi-agent`](https://www.npmjs.com/package/symbi-agent) | `AgentClient`, `ScheduleClient`, `ChannelClient`, `WorkflowClient`, `AgentPinClient` |
| [`symbi-policy`](https://www.npmjs.com/package/symbi-policy) | Policy builder |
| [`symbi-secrets`](https://www.npmjs.com/package/symbi-secrets) | Vault / file / env secret backends |
| [`symbi-mcp`](https://www.npmjs.com/package/symbi-mcp) | MCP client |
| [`symbi-tool-review`](https://www.npmjs.com/package/symbi-tool-review) | Tool review workflow |
| [`symbi-testing`](https://www.npmjs.com/package/symbi-testing) | Mocks + test helpers |
| [`symbi-cli`](https://www.npmjs.com/package/symbi-cli) | Command-line tooling |

## See also

- [SDK README](https://github.com/ThirdKeyAI/symbiont-sdk-js#readme) — full capabilities, examples, Trust Stack integration
- [docs.symbiont.dev](https://docs.symbiont.dev) — runtime documentation
- [Symbiont runtime](https://github.com/thirdkeyai/symbiont) — the Rust-native runtime this SDK talks to

## License

Apache 2.0. See [LICENSE](../../LICENSE).
