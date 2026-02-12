# Symbiont SDK for JavaScript/TypeScript — Skills Guide

**Purpose**: This guide helps AI assistants quickly build applications using the Symbiont JavaScript/TypeScript SDK.

**For Full Documentation**: See the [README](README.md).

## What This SDK Does

The Symbiont JS/TS SDK (`@symbiont/core`) provides a client for interacting with the Symbiont agent runtime. It covers agent lifecycle management, policy enforcement, secrets management, MCP protocol integration, memory systems, AgentPin credential verification, and more.

**Part of the ThirdKey trust stack**: SchemaPin (tool integrity) → AgentPin (agent identity) → Symbiont (runtime)

---

## Quick Start

```bash
npm install @symbiont/core
```

```typescript
import { SymbiontClient } from '@symbiont/core';

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

### Memory System

Hierarchical memory with short-term, long-term, episodic, and semantic levels:

```typescript
import { MemoryManager, InMemoryStore, HierarchicalMemory } from '@symbiont/core';

const memory = new HierarchicalMemory();
await memory.store({ content: 'data', level: 'short-term' });
const results = await memory.search('query');
```

### Policy Management (`client.policies`)

```typescript
import { PolicyBuilder } from '@symbiont/core';

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
| `@symbiont/core` | Main client, configuration, types |
| `@symbiont/agent` | Agent management |
| `@symbiont/policy` | Policy builder and enforcement |
| `@symbiont/secrets` | Secrets management providers |
| `@symbiont/mcp` | MCP protocol client |
| `@symbiont/tool-review` | Tool review workflow |

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

1. **Lazy-loaded sub-clients** — `client.agentpin`, `client.policies`, etc. are initialized on first access
2. **AgentPin is ES256 only** — credentials use ECDSA P-256, no other algorithms accepted
3. **Short-lived credentials** — prefer TTLs of hours, not days
4. **Trust bundles** for offline/air-gapped environments — bundle discovery + revocation docs
5. **Memory hierarchy** — use short-term for conversation context, long-term for persistent knowledge
6. **Policy-first design** — define policies before agent implementation
7. **Secrets via Vault** — never hardcode secrets, use the secrets management API
