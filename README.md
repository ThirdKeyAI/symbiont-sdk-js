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
npm install @symbiont/core
```

### Hello World

```typescript
import { SymbiontClient } from '@symbiont/core';

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
| **[@symbiont/core](./packages/core)** | Main client and authentication | `npm install @symbiont/core` |
| **[@symbiont/agent](./packages/agent)** | Agent lifecycle management | `npm install @symbiont/agent` |
| **[@symbiont/policy](./packages/policy)** | Policy creation and validation | `npm install @symbiont/policy` |
| **[@symbiont/secrets](./packages/secrets)** | Secure secrets management | `npm install @symbiont/secrets` |
| **[@symbiont/tool-review](./packages/tool-review)** | Security review workflow | `npm install @symbiont/tool-review` |
| **[@symbiont/mcp](./packages/mcp)** | MCP protocol integration | `npm install @symbiont/mcp` |

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
import { PolicyBuilder } from '@symbiont/policy';

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
import { SecretManager } from '@symbiont/secrets';

const secrets = new SecretManager({
  providers: [
    { name: 'environment', priority: 100 },
    { name: 'vault', priority: 200, endpoint: 'https://vault.company.com' }
  ]
});

const apiKey = await secrets.getSecret('EXTERNAL_API_KEY');
```

## 🆘 Getting Help

- **[Complete Documentation](./apps/docs/README.md)** - Comprehensive guides and examples
- **[API Reference](./apps/docs/api/index.html)** - Full API documentation
- **[Examples](./apps/examples/)** - Working code examples
- **[GitHub Issues](https://github.com/thirdkeyai/symbiont-sdk-js/issues)** - Bug reports and feature requests

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for development setup and guidelines.

```bash
git clone https://github.com/thirdkeyai/symbiont-sdk-js
cd symbiont-sdk-js
npm install
npm run build
npm test
```

## 📄 License

MIT License 

---

**Ready to build the future of AI?** [Get started now →](./apps/docs/guides/getting-started.md)
