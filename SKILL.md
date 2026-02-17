---
name: symbiont-sdk-js
title: Symbiont SDK for JavaScript/TypeScript
description: TypeScript SDK for the Symbiont agent runtime — agent lifecycle, webhook verification, AgentPin identity, memory systems, skill scanning, metrics, scheduling, and MCP integration
version: 0.6.0
---

# Symbiont SDK for JavaScript/TypeScript — Skills Guide

**Purpose**: This guide helps AI assistants quickly build applications using the Symbiont JavaScript/TypeScript SDK.

**For Full Documentation**: See the [README](https://github.com/ThirdKeyAI/symbiont-sdk-js/blob/main/README.md).

## What This SDK Does

The Symbiont JS/TS SDK (`@symbi/core`) provides a client for interacting with the Symbiont agent runtime. It covers agent lifecycle management, policy enforcement, secrets management, MCP protocol integration, memory systems, AgentPin credential verification, webhook signature verification, agent skill scanning, and metrics collection/export.

**Part of the ThirdKey trust stack**: SchemaPin (tool integrity) → AgentPin (agent identity) → Symbiont (runtime)

---

## Quick Start

```bash
npm install @symbi/core
```

```typescript
import { SymbiontClient } from '@symbi/core';

const client = new SymbiontClient({
    apiKey: process.env.SYMBIONT_API_KEY,
    environment: 'production',
});
```

---

## Core APIs

### Agent Management (`client.agents`)

```typescript
// List agents
const agents = await client.agents.listAgents();

// Create an agent
const agent = await client.agents.createAgent({
    name: 'my-agent',
    description: 'A helpful agent',
    capabilities: ['read', 'write'],
});

// Execute an agent
const result = await client.agents.executeAgent(agent.id, {
    input: 'process this data',
});

// Check status
const status = await client.agents.getAgentStatus(agent.id);
```

### AgentPin Integration (`client.agentpin`)

Cryptographic agent identity verification:

```typescript
// Generate P-256 keypair
const { privateKeyPem, publicKeyPem, publicKeyJwk } = client.agentpin.generateKeyPair();

// Issue a JWT credential
const jwt = client.agentpin.issueCredential({
    privateKeyPem,
    kid: 'key-1',
    issuer: 'https://example.com',
    agentId: 'my-agent',
    capabilities: ['read', 'write'],
});

// Verify credential (online)
const result = await client.agentpin.verifyCredential(jwt);

// Verify credential (offline with local discovery)
const result = client.agentpin.verifyCredentialOffline(jwt, discoveryDoc);

// Verify with trust bundle
const result = client.agentpin.verifyCredentialWithBundle(jwt, bundle);

// Fetch discovery document
const doc = await client.agentpin.fetchDiscoveryDocument('example.com');

// Trust management
const bundle = client.agentpin.createTrustBundle();
const pinStore = client.agentpin.createPinStore();
```

### Webhook Verification

Verify inbound webhook signatures from GitHub, Stripe, Slack, or custom providers:

```typescript
import {
    HmacVerifier, JwtVerifier, createProviderVerifier, WebhookProviderPresets,
} from '@symbi/core';

// Use a provider preset (GitHub, Stripe, Slack, Custom)
const verifier = createProviderVerifier('GITHUB', Buffer.from(secret));
verifier.verify(request.headers, Buffer.from(request.body));

// Manual HMAC verifier with prefix stripping
const hmac = new HmacVerifier(
    Buffer.from(secret), 'X-Hub-Signature-256', 'sha256='
);
hmac.verify(headers, body);

// JWT-based webhook verification
const jwt = new JwtVerifier(
    Buffer.from(secret), 'Authorization', 'expected-issuer'
);
jwt.verify(headers, body);
```

### Markdown Memory Persistence

File-based agent context persistence using markdown format:

```typescript
import { MarkdownMemoryStore } from '@symbi/core';

const store = new MarkdownMemoryStore('/data/memory', 30); // 30-day retention

// Save agent context
await store.saveContext('agent-1', {
    agentId: 'agent-1',
    facts: ['User prefers dark mode', 'Timezone is UTC-5'],
    procedures: ['Always greet by name'],
    learnedPatterns: ['Responds better to bullet points'],
    metadata: { lastSession: '2026-02-15' },
});

// Load context
const context = await store.loadContext('agent-1');

// List all agents with stored contexts
const agents = await store.listAgentContexts();

// Compact old daily logs
await store.compact('agent-1');

// Storage statistics
const stats = await store.getStorageStats();
```

### Agent Skills (ClawHavoc Scanning + Loading)

Scan and load agent skill definitions with security scanning:

```typescript
import { SkillScanner, SkillLoader } from '@symbi/core';

// Scan content for security issues (10 built-in ClawHavoc rules)
const scanner = new SkillScanner();
const findings = scanner.scanContent(skillContent, 'SKILL.md');
// Detects: pipe-to-shell, wget-pipe-to-shell, env file references,
//   SOUL.md/memory.md tampering, eval+fetch, base64-decode-exec, rm-rf, chmod-777

// Scan an entire skill directory
const result = scanner.scanSkill('/path/to/skill');

// Load skills from configured paths
const loader = new SkillLoader({
    loadPaths: ['/skills/verified', '/skills/community'],
    requireSigned: false,
    scanEnabled: true,
});
const skills = loader.loadAll();

// Load a single skill (reads SKILL.md, parses frontmatter, scans)
const skill = loader.loadSkill('/path/to/skill');
console.log(skill.name, skill.signatureStatus, skill.scanResult);
```

### Metrics Collection & Export (`client.metricsClient`)

Runtime metrics retrieval and local export:

```typescript
import {
    MetricsApiClient, FileMetricsExporter, CompositeExporter, MetricsCollector,
} from '@symbi/core';

// Fetch metrics from runtime API (via client)
const snapshot = await client.metricsClient.getSnapshot();
const scheduler = await client.metricsClient.getSchedulerMetrics();
const system = await client.metricsClient.getSystemMetrics();
await client.metricsClient.exportMetrics({ format: 'json' });

// Export metrics to file (atomic JSON write)
const fileExporter = new FileMetricsExporter({ filePath: '/tmp/metrics.json' });
await fileExporter.export(snapshot);

// Fan-out to multiple backends
const composite = new CompositeExporter([fileExporter, otherExporter]);
await composite.export(snapshot);

// Periodic background collection
const collector = new MetricsCollector(composite, 60000); // every 60s
collector.start(fetchSnapshotFn);
collector.stop();
```

### Memory System

Hierarchical memory with short-term, long-term, episodic, and semantic levels:

```typescript
import { MemoryManager, InMemoryStore, HierarchicalMemory } from '@symbi/core';

const memory = new HierarchicalMemory();
await memory.store({ content: 'data', level: 'short-term' });
const results = await memory.search('query');
```

### Scheduling (`client.schedules`)

```typescript
const schedule = await client.schedules.create({
    agentId: 'my-agent',
    cron: '0 */6 * * *',
    parameters: { task: 'cleanup' },
});

const schedules = await client.schedules.list();
const health = await client.schedules.getSchedulerHealth();
```

### Policy Management (`client.policies`)

```typescript
import { PolicyBuilder } from '@symbi/core';

const policy = new PolicyBuilder()
    .allow(['read_data', 'write_output'])
    .deny(['execute_code', 'network_access'])
    .require({ inputValidation: true })
    .build();
```

### Secrets Management (`client.secrets`)

Supports Vault, file-based, and environment variable providers:

```typescript
const secret = await client.secrets.get('api-key');
await client.secrets.set('api-key', 'value');
```

### MCP Protocol (`client.mcp`)

```typescript
const tools = await client.mcp.listTools();
const result = await client.mcp.invokeTool('tool-name', { param: 'value' });
```

### Tool Review (`client.toolReview`)

```typescript
const review = await client.toolReview.submitForReview(toolInvocation);
const status = await client.toolReview.getReviewStatus(reviewId);
```

### HTTP Endpoints (`client.http`)

Manage HTTP input endpoints for agent invocation.

---

## Package Structure

| Package | Purpose |
|---------|---------|
| `@symbi/core` | Main client, configuration, types, webhook verification, skills, metrics, memory |
| `@symbi/agent` | Agent management, schedules, channels, workflows, AgentPin |
| `@symbi/types` | Shared TypeScript interfaces and Zod schemas |
| `@symbi/policy` | Policy builder and enforcement |
| `@symbi/secrets` | Secrets management providers |
| `@symbi/mcp` | MCP protocol client |
| `@symbi/tool-review` | Tool review workflow |

---

## Sub-Clients

| Client | Access | Purpose |
|--------|--------|---------|
| `client.agents` | Lazy-loaded | Agent lifecycle management |
| `client.agentpin` | Lazy-loaded | AgentPin credential verification |
| `client.schedules` | Lazy-loaded | Cron scheduling |
| `client.channels` | Lazy-loaded | Chat channel adapters |
| `client.workflows` | Lazy-loaded | Workflow execution |
| `client.metricsClient` | Lazy-loaded | Runtime metrics API |
| `client.system` | Lazy-loaded | Health and system info |
| `client.secrets` | Lazy-loaded | Secrets management |
| `client.mcp` | Lazy-loaded | MCP protocol |
| `client.toolReview` | Lazy-loaded | Tool review workflow |
| `client.http` | Lazy-loaded | HTTP endpoint management |

**Standalone modules** (not sub-clients — import directly):
- `MarkdownMemoryStore` — file-based context persistence
- `HmacVerifier` / `JwtVerifier` / `createProviderVerifier` — webhook verification
- `SkillScanner` / `SkillLoader` — skill scanning and loading
- `FileMetricsExporter` / `CompositeExporter` / `MetricsCollector` — local metrics export

---

## Configuration

```typescript
// Direct configuration
const client = new SymbiontClient({
    apiKey: 'your-api-key',
    environment: 'production',
    timeout: 30000,
    validationMode: 'strict',
});

// From environment variables
// SYMBIONT_API_KEY, SYMBIONT_ENVIRONMENT, SYMBIONT_BASE_URL
const client = new SymbiontClient();
```

---

## Pro Tips for AI Assistants

1. **Lazy-loaded sub-clients** — `client.agentpin`, `client.metricsClient`, `client.schedules`, etc. are initialized on first access
2. **AgentPin is ES256 only** — credentials use ECDSA P-256, no other algorithms accepted
3. **Short-lived credentials** — prefer TTLs of hours, not days
4. **Trust bundles** for offline/air-gapped environments — bundle discovery + revocation docs
5. **Memory hierarchy** — use short-term for conversation context, long-term for persistent knowledge
6. **Markdown memory** — use `MarkdownMemoryStore` for file-based agent context that survives restarts
7. **Webhook verification** — always use `createProviderVerifier()` for known providers; HMAC uses constant-time comparison
8. **Skill scanning** — always scan untrusted skills before loading; 10 built-in ClawHavoc rules catch common attacks
9. **Metrics export** — `FileMetricsExporter` uses atomic writes; `CompositeExporter` tolerates partial backend failures
10. **Policy-first design** — define policies before agent implementation
11. **Secrets via Vault** — never hardcode secrets, use the secrets management API
