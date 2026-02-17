# Symbiont JavaScript/TypeScript SDK

[![npm version](https://badge.fury.io/js/%40symbiont%2Fcore.svg)](https://badge.fury.io/js/%40symbiont%2Fcore)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A comprehensive, type-safe JavaScript/TypeScript SDK for building and managing AI agents on the Symbiont platform. Get started quickly with full TypeScript support, intelligent caching, and enterprise-grade security.

## 🚀 Quick Start

### Prerequisites

The Symbiont SDK requires a running Symbiont runtime. Choose one of these options:

#### Option 1: Docker (Recommended)
```bash
# Start Symbiont runtime with Docker
docker run --rm -p 8080:8080 ghcr.io/thirdkeyai/symbi:latest mcp
```

#### Option 2: Build from Source
```bash
# Clone and build the runtime
git clone https://github.com/thirdkeyai/symbiont
cd symbiont
cargo build --release
cargo run -- mcp --port 8080
```

### Installation

```bash
npm install @symbi/core
```

### Hello World

```typescript
import { SymbiontClient } from '@symbi/core';

const client = new SymbiontClient({
  apiKey: process.env.SYMBIONT_API_KEY,
  environment: 'production'
});

await client.connect();

// Create and execute your first agent
const agent = await client.agents.createAgent({
  name: 'textProcessor',
  description: 'Processes and analyzes text input',
  parameters: [{ name: 'text', type: { name: 'string' }, required: true }],
  returnType: { name: 'string' },
  capabilities: ['text_processing']
});

const result = await client.agents.executeAgent(
  agent.id,
  { text: 'Hello, Symbiont!' }
);

console.log('Result:', result.result);
```

## ✨ Core Features

- **🤖 AI Agent Management** - Create, deploy, and execute intelligent agents
- **🔐 Security-First** - Built-in policy management and secrets handling
- **🔑 AgentPin Integration** - Client-side credential verification, discovery, and trust bundles
- **🛡️ Type Safety** - Full TypeScript support with runtime validation
- **⚡ High Performance** - Intelligent caching and optimized networking
- **🔄 Auto-Authentication** - Seamless token management and refresh
- **📦 Modular Design** - Use only what you need
- **🌍 Cross-Platform** - Node.js, browser, and edge runtime support

## 📚 Documentation

### 🎯 **[Getting Started](./apps/docs/guides/getting-started.md)**
Complete installation guide, configuration options, and your first agent

### 📖 **User Guides**
- **[Agent Management](./apps/docs/guides/agent-management.md)** - Creating, managing, and executing agents
- **[Tool Review Workflow](./apps/docs/guides/tool-review-workflow.md)** - Security review process for tools and agents
- **[Policy Creation](./apps/docs/guides/policy-creation.md)** - Building access control and governance policies
- **[Secrets Management](./apps/docs/guides/secrets-management.md)** - Secure credential and configuration management

### 🔍 **[API Reference](./apps/docs/api/index.html)**
Complete API documentation with examples and type definitions

### 🏗️ **Architecture**
- **[Architecture Overview](./ARCHITECTURE.md)** - Technical design and system architecture
- **[Implementation Guide](./IMPLEMENTATION_GUIDE.md)** - Development roadmap and implementation details

## 📦 SDK Packages

| Package | Purpose | Installation |
|---------|---------|--------------|
| **[@symbi/core](./packages/core)** | Main client and authentication | `npm install @symbi/core` |
| **[@symbi/agent](./packages/agent)** | Agent lifecycle management | `npm install @symbi/agent` |
| **[@symbi/policy](./packages/policy)** | Policy creation and validation | `npm install @symbi/policy` |
| **[@symbi/secrets](./packages/secrets)** | Secure secrets management | `npm install @symbi/secrets` |
| **[@symbi/tool-review](./packages/tool-review)** | Security review workflow | `npm install @symbi/tool-review` |
| **[@symbi/mcp](./packages/mcp)** | MCP protocol integration | `npm install @symbi/mcp` |

## 🔑 AgentPin: Credential Verification

The SDK integrates with [AgentPin](https://github.com/ThirdKeyAI/agentpin) for domain-anchored cryptographic identity verification of AI agents. AgentPin operations run client-side — no Symbiont Runtime required.

### Key Generation & Credential Issuance

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
```

### Credential Verification

```typescript
// Online verification (fetches discovery document automatically)
const result = await client.agentpin.verifyCredential(jwt);
console.log(result.valid, result.agent_id, result.capabilities);

// Offline verification with pre-fetched documents
const discovery = await client.agentpin.fetchDiscoveryDocument('example.com');
const offlineResult = client.agentpin.verifyCredentialOffline(jwt, discovery);

// Trust bundle verification (fully offline, no network)
const bundle = client.agentpin.createTrustBundle();
const bundleResult = client.agentpin.verifyCredentialWithBundle(jwt, bundle);
```

### Discovery & Key Pinning

```typescript
// Fetch and validate discovery documents
const doc = await client.agentpin.fetchDiscoveryDocument('example.com');
client.agentpin.validateDiscoveryDocument(doc, 'example.com');

// TOFU key pinning
const pinStore = client.agentpin.createPinStore();

// JWK utilities
const jwk = client.agentpin.pemToJwk(publicKeyPem, kid);
const pem = client.agentpin.jwkToPem(jwk);
```

## 🛠️ Configuration

### Environment Variables
```bash
# Required
SYMBIONT_API_KEY=your_api_key_here

# Optional
SYMBIONT_API_URL=https://api.symbiont.dev
SYMBIONT_ENVIRONMENT=production
```

### Client Configuration
```typescript
const client = new SymbiontClient({
  apiKey: process.env.SYMBIONT_API_KEY,
  environment: 'production',
  validationMode: 'strict',
  timeout: 30000,
  debug: false
});
```

## 🎯 Common Use Cases

### Agent Creation and Execution
```typescript
// Create a data analysis agent
const agent = await client.agents.createAgent({
  name: 'dataAnalyzer',
  description: 'Analyzes datasets and generates insights',
  parameters: [
    { name: 'dataset', type: { name: 'object' }, required: true },
    { name: 'analysisType', type: { name: 'string' }, required: false }
  ],
  capabilities: ['data_processing', 'visualization'],
  policies: [dataAccessPolicy]
});

const insights = await client.agents.executeAgent(agent.id, {
  dataset: myData,
  analysisType: 'trend_analysis'
});
```

### Policy Management
```typescript
import { PolicyBuilder } from '@symbi/policy';

// Create access control policy
const policy = new PolicyBuilder('dataAccessPolicy')
  .allow('read', 'analyze')
    .where('user.department', 'equals', 'analytics')
    .where('data.classification', 'not-equals', 'restricted')
  .require('approval')
    .where('action', 'equals', 'export')
  .build();
```

### Secrets Management
```typescript
import { SecretManager } from '@symbi/secrets';

const secrets = new SecretManager({
  providers: [
    { name: 'environment', priority: 100 },
    { name: 'vault', priority: 200, endpoint: 'https://vault.company.com' }
  ]
});

const apiKey = await secrets.getSecret('EXTERNAL_API_KEY');
```

## Webhook Verification

Verify inbound webhook signatures from GitHub, Stripe, Slack, or custom providers:

```typescript
import {
    HmacVerifier, JwtVerifier, createProviderVerifier,
} from '@symbi/core';

// Use a provider preset
const verifier = createProviderVerifier('GITHUB', Buffer.from(secret));
verifier.verify(request.headers, Buffer.from(request.body));

// Manual HMAC with prefix stripping
const hmac = new HmacVerifier(
    Buffer.from(secret), 'X-Hub-Signature-256', 'sha256='
);
hmac.verify(headers, body);

// JWT-based verification
const jwtVerifier = new JwtVerifier(
    Buffer.from(secret), 'Authorization', 'expected-issuer'
);
jwtVerifier.verify(headers, body);
```

Provider presets: `GITHUB`, `STRIPE`, `SLACK`, `CUSTOM`.

## Markdown Memory Persistence

File-based agent context that survives restarts:

```typescript
import { MarkdownMemoryStore } from '@symbi/core';

const store = new MarkdownMemoryStore('/data/memory', 30);

await store.saveContext('agent-1', {
    agentId: 'agent-1',
    facts: ['User prefers dark mode', 'Timezone is UTC-5'],
    procedures: ['Always greet by name'],
    learnedPatterns: ['Responds better to bullet points'],
    metadata: { lastSession: '2026-02-15' },
});

const context = await store.loadContext('agent-1');
const agents = await store.listAgentContexts();
await store.compact('agent-1');
const stats = await store.getStorageStats();
```

## Agent Skills (ClawHavoc Scanning)

Scan and load agent skill definitions with security scanning:

```typescript
import { SkillScanner, SkillLoader } from '@symbi/core';

// Scan for security issues (10 built-in ClawHavoc rules)
const scanner = new SkillScanner();
const findings = scanner.scanContent(content, 'SKILL.md');

// Scan an entire skill directory
const result = scanner.scanSkill('/path/to/skill');

// Load skills from paths
const loader = new SkillLoader({
    loadPaths: ['/skills/verified', '/skills/community'],
    requireSigned: false,
    scanEnabled: true,
});

const skills = loader.loadAll();
const skill = loader.loadSkill('/path/to/skill');
```

Detects: pipe-to-shell, wget-pipe-to-shell, env file references, SOUL.md/memory.md tampering, eval+fetch, base64-decode-exec, rm-rf, chmod-777.

## Metrics Collection & Export

Runtime metrics retrieval and local export:

```typescript
import {
    FileMetricsExporter, CompositeExporter, MetricsCollector,
} from '@symbi/core';

// Fetch from runtime API
const snapshot = await client.metricsClient.getSnapshot();
const scheduler = await client.metricsClient.getSchedulerMetrics();
const system = await client.metricsClient.getSystemMetrics();

// Export to file (atomic JSON write)
const exporter = new FileMetricsExporter({ filePath: '/tmp/metrics.json' });
await exporter.export(snapshot);

// Fan-out to multiple backends
const composite = new CompositeExporter([exporter, otherExporter]);

// Background collection
const collector = new MetricsCollector(composite, 60000);
collector.start(fetchFn);
collector.stop();
```

## Scheduling

```typescript
const schedule = await client.schedules.create({
    agentId: 'my-agent',
    cron: '0 */6 * * *',
    parameters: { task: 'cleanup' },
});

const schedules = await client.schedules.list();
const health = await client.schedules.getSchedulerHealth();
```

## What's New in v0.6.0

- **Webhook Verification** — `HmacVerifier`, `JwtVerifier`, provider presets (GitHub, Stripe, Slack)
- **Markdown Memory** — `MarkdownMemoryStore` for file-based agent context persistence
- **Agent Skills** — `SkillScanner` with 10 ClawHavoc rules, `SkillLoader` with frontmatter parsing
- **Metrics** — `MetricsApiClient` sub-client, `FileMetricsExporter`, `CompositeExporter`, `MetricsCollector`
- **Type Definitions** — Zod schemas for webhooks, skills, and metrics in `@symbi/types`

## License

MIT License
