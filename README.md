<img src="https://raw.githubusercontent.com/ThirdKeyAI/Symbiont/main/logo-hz.png" alt="Symbiont">

[![npm](https://img.shields.io/npm/v/symbi-core.svg)](https://www.npmjs.com/package/symbi-core)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![Docs](https://img.shields.io/badge/docs-online-brightgreen)](https://docs.symbiont.dev)

---

**Official JavaScript/TypeScript SDK for Symbiont, the policy-governed agent runtime.**
*Same agent. Secure runtime.*

This SDK is the integration surface for the [Symbiont runtime](https://github.com/thirdkeyai/symbiont). Use it from Node.js, edge runtimes, or the browser to manage agents, drive scheduled and channel-bound execution, run the ORGA reasoning loop, register ToolClad-governed tools, evaluate the Communication Policy Gate, verify webhooks, and integrate AgentPin identity — all against a runtime that enforces Cedar policy, SchemaPin tool verification, and tamper-evident audit logging.

The runtime decides what an agent may do. The SDK decides how your application talks to the runtime.

---

## Why Symbiont

AI agents are easy to demo and hard to trust. Once an agent can call tools, access files, send messages, or invoke external services, you need more than prompts and glue code. You need:

- **Policy enforcement** for what an agent may do — built-in DSL and [Cedar](https://www.cedarpolicy.com/) authorization
- **Tool verification** so execution is not blind trust — [SchemaPin](https://github.com/ThirdKeyAI/SchemaPin) cryptographic verification of MCP tools
- **Tool contracts** for how tools execute — [ToolClad](https://github.com/ThirdKeyAI/ToolClad) declarative input validation, scope enforcement, and injection prevention
- **Agent identity** so you know who is acting — [AgentPin](https://github.com/ThirdKeyAI/AgentPin) domain-anchored ES256 identity
- **Audit trails** for what happened and why — cryptographically tamper-evident logs
- **Approval gates** for sensitive actions — human review before execution when policy requires it

Symbiont is the runtime that enforces all of this. This SDK is the typed, ergonomic way to drive it from JavaScript and TypeScript.

---

## Quick start

### Prerequisites

A running Symbiont runtime is required. The fastest way:

```bash
# Start the runtime (API on :8080, HTTP input on :8081)
docker run --rm -p 8080:8080 -p 8081:8081 ghcr.io/thirdkeyai/symbi:latest up
```

For Homebrew, install scripts, building from source, or production deployment, see the [getting-started guide](https://docs.symbiont.dev/getting-started).

### Install

```bash
npm install symbi-core
```

### Hello, runtime

```typescript
import { SymbiontClient } from 'symbi-core';

const client = new SymbiontClient({
  apiKey: process.env.SYMBIONT_API_KEY,
  apiUrl: 'http://localhost:8080/api/v1',
});

await client.connect();

// Create an agent
const agent = await client.agents.createAgent({
  name: 'textProcessor',
  description: 'Processes and analyzes text input',
  parameters: [{ name: 'text', type: { name: 'string' }, required: true }],
  returnType: { name: 'string' },
  capabilities: ['text_processing'],
});

// Execute it
const result = await client.agents.executeAgent(agent.id, { text: 'Hello, Symbiont!' });
console.log(result.result);
```

---

## Capabilities

The SDK exposes one client (`SymbiontClient`) with namespaced sub-clients for each runtime feature.

| Sub-client | Surface |
|------------|---------|
| `client.agents` | Agent lifecycle (create, update, execute, re-execute, delete, history, heartbeat, push events) |
| `client.schedules` | Cron schedules with pause/resume/trigger and run history |
| `client.channels` | Slack/Teams/Mattermost adapters, mappings, audit |
| `client.workflows` | Multi-agent workflow execution |
| `client.reasoning` | ORGA loop control, journal, Cedar policies, circuit breakers, knowledge bridge, tool profiles, loop diagnostics |
| `client.toolclad` | ToolClad manifests — list, validate, test, execute, schema, hot reload |
| `client.communication` | Communication Policy Gate rules and evaluation |
| `client.agentpin` | Client-side AgentPin keygen, credential issuance and verification, discovery, key pinning |
| `client.policies` / `client.policyBuilder` | Policy creation and management |
| `client.secrets` | Vault, encrypted-file, and OS-keychain secrets |
| `client.toolReview` | Tool review workflow |
| `client.mcp` | MCP server connection management |
| `client.system` | Health, metrics, runtime info |
| `client.metricsClient` | OTLP / file metrics export, snapshots, periodic collection |
| `client.http` | Dynamic HTTP endpoint management |

Standalone modules (no client required): `WebhookVerifier` (HMAC, JWT, provider presets), `MarkdownMemoryStore` (file-based agent context), `SkillScanner` / `SkillLoader` (ClawHavoc scanning + skill loading).

---

## Trust Stack integration

The SDK exposes the runtime features that enforce the Symbiont Trust Stack:

- **Cedar policies** via `client.reasoning.addCedarPolicy()` and the `policyBuilder` namespace — fine-grained authorization for every agent action
- **AgentPin** via `client.agentpin.*` — domain-anchored ES256 credential issuance and verification, runs entirely client-side (no runtime required)
- **ToolClad** via `client.toolclad.*` — declarative tool manifests with argument validation, scope enforcement, and Cedar policy generation; supports `oneshot`, `session`, `browser`, `http`, and `mcp-proxy` backends as of Symbiont v1.10.0
- **Communication Policy Gate** via `client.communication.*` — Cedar-evaluated allow/deny rules for inter-agent messages
- **SchemaPin** — enforced server-side; tool signatures are verified before tool execution

Model output is never treated as execution authority. The runtime controls what actually happens.

---

## Packages

The SDK is published as a set of focused packages. Most users only need `symbi-core` (which re-exports types from `symbi-types` and re-exports the agent client).

| Package | Purpose |
|---------|---------|
| [`symbi-core`](https://www.npmjs.com/package/symbi-core) | Main client, configuration, auth, webhook verification, skills, metrics, memory |
| [`symbi-types`](https://www.npmjs.com/package/symbi-types) | Shared TypeScript interfaces and Zod schemas |
| [`symbi-agent`](https://www.npmjs.com/package/symbi-agent) | Agent, schedule, channel, workflow, AgentPin clients |
| [`symbi-policy`](https://www.npmjs.com/package/symbi-policy) | Policy builder and enforcement |
| [`symbi-secrets`](https://www.npmjs.com/package/symbi-secrets) | Vault / file / OS-keychain secrets backends |
| [`symbi-mcp`](https://www.npmjs.com/package/symbi-mcp) | MCP protocol client |
| [`symbi-tool-review`](https://www.npmjs.com/package/symbi-tool-review) | Tool review workflow |
| [`symbi-testing`](https://www.npmjs.com/package/symbi-testing) | Mocks and test helpers |
| [`symbi-cli`](https://www.npmjs.com/package/symbi-cli) | Command-line tooling |
| [`symbiont-sdk-js`](https://www.npmjs.com/package/symbiont-sdk-js) | Monorepo source distribution |

---

## Examples

### Reasoning loop

Run an autonomous Observe-Reason-Gate-Act cycle with policy gates, circuit breakers, and journal replay:

```typescript
const response = await client.reasoning.runLoop('agent-1', {
  config: { max_iterations: 10, timeout_ms: 60000 },
  initial_message: 'Analyze the latest sales data and create a report.',
});

console.log('Output:', response.result.output);
console.log('Iterations:', response.result.iterations);
console.log('Termination:', response.result.termination_reason.type);

// Read journal entries for replay/audit
const journal = await client.reasoning.getJournalEntries('agent-1', { limit: 50 });

// Add an action-level Cedar policy
await client.reasoning.addCedarPolicy('agent-1', {
  name: 'deny-file-write',
  source: 'forbid(principal, action == "tool_call", resource) when { resource.name == "write_file" };',
  active: true,
});

// Inspect circuit breaker state and adaptive parameters
const breakers = await client.reasoning.getCircuitBreakerStatus('agent-1');
const profiles = await client.reasoning.getToolProfiles('agent-1');
```

### ToolClad — governed tool execution

Tools are declared in `.clad.toml` manifests with argument validation, scope enforcement, and Cedar policy generation. Drive them from the SDK:

```typescript
const tools = await client.toolclad.listTools();
const schema = await client.toolclad.getSchema('nmap');

const result = await client.toolclad.executeTool('nmap', { target: '10.0.0.1' });
console.log(result.status, result.scanId, result.exitCode);

// Hot reload after editing a manifest on disk
await client.toolclad.reloadTools();
```

### Communication Policy Gate

```typescript
await client.communication.addRule({
  fromAgent: 'analyst',
  toAgent: 'reporter',
  action: 'send_message',
  effect: 'allow',
  priority: 10,
  maxDepth: 3,
});

const decision = await client.communication.evaluate('analyst', 'reporter', 'send_message');
console.log(decision.allowed, decision.rule, decision.reason);
```

### AgentPin — client-side identity

AgentPin operations run client-side; no Symbiont runtime is required.

```typescript
const { privateKeyPem, publicKeyPem } = client.agentpin.generateKeyPair();
const kid = client.agentpin.generateKeyId(publicKeyPem);

const jwt = client.agentpin.issueCredential({
  privateKeyPem,
  kid,
  issuer: 'example.com',
  agentId: 'data-analyzer',
  capabilities: ['read:data', 'write:reports'],
  ttlSecs: 3600,
});

// Verify (fetches discovery automatically)
const result = await client.agentpin.verifyCredential(jwt);
console.log(result.valid, result.agent_id, result.capabilities);
```

### HTTP Input invocation (Symbiont v1.10.0)

The runtime's HTTP Input handler dispatches webhooks to a running agent on the communication bus, or falls back to an on-demand LLM ORGA loop against ToolClad manifests when the agent is not running. The SDK ships typed responses for both shapes:

```typescript
import type {
  WebhookInvocationRequest,
  WebhookInvocationResponse,
  WebhookCompletedResponse,
  WebhookExecutionStartedResponse,
} from 'symbi-types';

// Send to your runtime's HTTP Input endpoint, then parse:
function handle(resp: WebhookInvocationResponse) {
  if (resp.status === 'execution_started') {
    console.log('dispatched message', resp.message_id, 'in', resp.latency_ms, 'ms');
  } else {
    console.log('LLM completed via', resp.provider, resp.model);
    for (const run of resp.tool_runs) {
      console.log(' -', run.tool, run.output_preview);
    }
  }
}
```

### Webhook signature verification

```typescript
import { HmacVerifier, JwtVerifier, createProviderVerifier } from 'symbi-core';

// Provider preset (GitHub, Stripe, Slack, custom)
const verifier = createProviderVerifier('GITHUB', Buffer.from(secret));
verifier.verify(request.headers, Buffer.from(request.body));

// Manual HMAC with prefix stripping
const hmac = new HmacVerifier(Buffer.from(secret), 'X-Hub-Signature-256', 'sha256=');
hmac.verify(headers, body);
```

### Markdown memory persistence

```typescript
import { MarkdownMemoryStore } from 'symbi-core';

const store = new MarkdownMemoryStore('/data/memory', 30);
await store.saveContext('agent-1', {
  agentId: 'agent-1',
  facts: ['User prefers dark mode'],
  procedures: ['Always greet by name'],
  learnedPatterns: ['Responds better to bullet points'],
  metadata: { lastSession: '2026-02-15' },
});
const context = await store.loadContext('agent-1');
```

### Agent skills — ClawHavoc scanning

```typescript
import { SkillScanner, SkillLoader } from 'symbi-core';

// 10 built-in ClawHavoc rules (pipe-to-shell, eval+fetch, base64-decode-exec, etc.)
const scanner = new SkillScanner();
const findings = scanner.scanContent(content, 'SKILL.md');

const loader = new SkillLoader({
  loadPaths: ['/skills/verified', '/skills/community'],
  requireSigned: false,
  scanEnabled: true,
});
const skills = await loader.loadAll();
```

---

## Configuration

### Environment

```bash
SYMBIONT_API_KEY=...                       # required
SYMBIONT_API_URL=http://localhost:8080/api/v1
SYMBIONT_ENVIRONMENT=production
```

### Programmatic

```typescript
const client = new SymbiontClient({
  apiKey: process.env.SYMBIONT_API_KEY,
  apiUrl: process.env.SYMBIONT_API_URL,
  environment: 'production',
  validationMode: 'strict',
  timeout: 30000,
});
```

See the [API reference](https://docs.symbiont.dev/api-reference) for the full configuration surface.

---

## Documentation

- [Getting started](https://docs.symbiont.dev/getting-started)
- [Security model](https://docs.symbiont.dev/security-model)
- [Runtime architecture](https://docs.symbiont.dev/runtime-architecture)
- [Reasoning loop guide](https://docs.symbiont.dev/reasoning-loop)
- [DSL guide](https://docs.symbiont.dev/dsl-guide)
- [API reference](https://docs.symbiont.dev/api-reference)

The Symbiont runtime itself lives at [thirdkeyai/symbiont](https://github.com/thirdkeyai/symbiont).

---

## What's new

### v1.10.1 — packaging
Workspace packages renamed from the previously-unpublished `@symbi/*` scope to unscoped `symbi-*` names so they can actually be installed from npm. Packaging-only release; no API changes.

### v1.10.0 — HTTP Input LLM invocation
- `WebhookInvocationResponse` discriminated union covering both `execution_started` (runtime communication-bus dispatch) and `completed` (on-demand LLM ORGA loop) shapes from the Symbiont v1.10.0 HTTP Input handler
- `WebhookToolRun`, `WebhookInvocationRequest`, `WebhookInvocationStatus` with Zod schemas
- ToolClad v0.4.0 backend strings (`http`, `mcp`, `session`, `browser`) accepted on `ToolManifestInfo.backend`
- All packages aligned to Symbiont runtime v1.10.0

See [`CHANGELOG.md`](./CHANGELOG.md) for the full history.

---

## License

Apache 2.0. See [`LICENSE`](./LICENSE).

The SDK is part of the Symbiont project's Community Edition. For Enterprise licensing of the Symbiont runtime (advanced sandbox backends, compliance audit exports, AI-powered tool review, encrypted multi-agent collaboration, monitoring dashboards, dedicated support), contact [ThirdKey](https://thirdkey.ai).

---

<div align="right">
  <img src="https://raw.githubusercontent.com/ThirdKeyAI/Symbiont/main/symbi-trans.png" alt="Symbi" width="120">
</div>
