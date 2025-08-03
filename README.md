# Symbiont JavaScript/TypeScript SDK

[![npm version](https://badge.fury.io/js/%40symbiont%2Fcore.svg)](https://badge.fury.io/js/%40symbiont%2Fcore)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A comprehensive, type-safe JavaScript/TypeScript SDK for interacting with the Symbiont platform. Build, deploy, and manage AI agents with full type safety and modern development practices.

## Quick Start

### Installation

```bash
npm install @symbiont/core
# or
yarn add @symbiont/core
# or
pnpm add @symbiont/core
```

### Basic Usage

```typescript
import { SymbiontClient } from '@symbiont/core';

const client = new SymbiontClient({
  apiUrl: 'https://api.symbiont.dev',
  apiKey: process.env.SYMBIONT_API_KEY,
  environment: 'production'
});

// Connect to Symbiont
await client.connect();

// Check system health
const health = await client.health();
console.log('Status:', health.status);

// Create and execute an agent
const agent = await client.agents.create({
  name: 'dataProcessor',
  // ... agent definition
});

const result = await agent.execute({ input: 'sample data' });
console.log('Result:', result.result);
```

## Core Features

- **🔐 Dual API Support**: Seamlessly work with both Runtime HTTP API and Tool Review API
- **🛡️ Type Safety**: Full TypeScript support with runtime validation options
- **⚡ Performance**: Configurable validation modes and intelligent caching
- **🔄 Auto-Authentication**: Automatic token management and refresh
- **📦 Modular Design**: Import only what you need
- **🌍 Cross-Platform**: Works in Node.js, browsers, and edge environments

## Package Structure

The SDK is organized as a monorepo with specialized packages:

| Package | Description | Installation |
|---------|-------------|--------------|
| **[@symbiont/core](./packages/core)** | Core client and base functionality | `npm install @symbiont/core` |
| **[@symbiont/agent](./packages/agent)** | Agent management and execution | `npm install @symbiont/agent` |
| **[@symbiont/policy](./packages/policy)** | Policy management and validation | `npm install @symbiont/policy` |
| **[@symbiont/secrets](./packages/secrets)** | Secrets management and encryption | `npm install @symbiont/secrets` |
| **[@symbiont/tool-review](./packages/tool-review)** | Tool Review API client | `npm install @symbiont/tool-review` |
| **[@symbiont/mcp](./packages/mcp)** | MCP client integration | `npm install @symbiont/mcp` |
| **[@symbiont/cli](./packages/cli)** | Command-line interface | `npm install -g @symbiont/cli` |

## Key Examples

### Agent Management

```typescript
import { SymbiontClient, DSLBuilder } from '@symbiont/core';

const client = new SymbiontClient({ /* config */ });

// Create agent using DSL builder
const agent = await new DSLBuilder()
  .metadata({
    version: '1.0.0',
    author: 'developer',
    description: 'Data processing agent'
  })
  .agent('processData', [
    { name: 'input', type: { name: 'DataSet' }, required: true }
  ], { name: 'Result' })
  .capabilities('data_processing', 'file_access')
  .execution({ memory: 'ephemeral', privacy: 'high' })
  .create(client.agents);

// Execute agent
const result = await agent.execute({ input: dataset });
```

### Policy Management

```typescript
import { PolicyBuilder } from '@symbiont/policy';

const policy = await new PolicyBuilder()
  .name('dataProcessingPolicy')
  .allow(['read', 'process'], ['data/*'])
    .when('user.role', 'equals', 'analyst')
    .audit('detailed')
    .end()
  .deny(['export'], ['sensitive/*'])
    .end()
  .create(client.policies);
```

### Tool Review Integration

```typescript
// Submit tools for review
const session = await client.toolReview.createSession({
  tools: [myTool],
  reviewLevel: 'standard'
});

const submission = await client.toolReview.submitTool(session.id, {
  toolId: 'my-tool',
  metadata: { version: '1.0.0' }
});
```

## Configuration

### Environment Variables

```bash
# Required
SYMBIONT_API_KEY=your_api_key_here

# Optional
SYMBIONT_API_URL=https://api.symbiont.dev
SYMBIONT_TOOL_REVIEW_URL=https://tool-review.symbiont.dev
SYMBIONT_ENVIRONMENT=production
```

### Advanced Configuration

```typescript
const client = new SymbiontClient({
  // API Configuration
  runtimeApiUrl: 'https://api.symbiont.dev',
  toolReviewApiUrl: 'https://tool-review.symbiont.dev',
  
  // Authentication
  apiKey: process.env.SYMBIONT_API_KEY,
  jwt: process.env.SYMBIONT_JWT,
  
  // Validation Mode
  validationMode: 'development', // 'strict' | 'performance' | 'development'
  
  // Performance
  timeout: 30000,
  cacheConfig: {
    ttl: 300000, // 5 minutes
    maxSize: 100
  },
  
  // Retry Strategy
  retryConfig: {
    attempts: 3,
    backoff: 'exponential',
    maxDelay: 10000
  }
});
```

## CLI Usage

```bash
# Install CLI globally
npm install -g @symbiont/cli

# Authenticate
symbiont auth login

# Agent management
symbiont agent create ./my-agent.dsl
symbiont agent list
symbiont agent execute <agent-id> --params '{"input": "data"}'

# Policy management
symbiont policy create ./policy.yaml
symbiont policy test <policy-id> --context '{"user": "admin"}'

# Secrets management
symbiont secrets set myapp/db/password "secret123"
symbiont secrets get myapp/db/password
```

## Browser Support

### CDN Usage

```html
<script type="module">
  import { SymbiontClient } from 'https://cdn.jsdelivr.net/npm/@symbiont/core/dist/browser.esm.js';
  
  const client = new SymbiontClient({
    apiUrl: 'https://api.symbiont.dev',
    apiKey: 'your-api-key'
  });
  
  await client.connect();
</script>
```

### React Integration

```typescript
import { useSymbiont, useAgent } from '@symbiont/react';

function AgentDashboard() {
  const { client, connected } = useSymbiont({
    apiKey: process.env.REACT_APP_SYMBIONT_API_KEY
  });
  
  const { agent, execute, loading } = useAgent('data-processor');
  
  if (!connected) return <div>Connecting...</div>;
  
  return (
    <div>
      <h1>Agent: {agent?.definition.name}</h1>
      <button onClick={() => execute({ input: 'new data' })}>
        Execute Agent
      </button>
      {loading && <div>Processing...</div>}
    </div>
  );
}
```

## Error Handling

The SDK provides comprehensive error handling with specific error types:

```typescript
import { 
  AuthenticationError, 
  ValidationError, 
  AgentNotFoundError 
} from '@symbiont/core';

try {
  const result = await client.agents.execute('agent-id', params);
} catch (error) {
  if (error instanceof AuthenticationError) {
    // Handle auth issues
    console.error('Authentication failed:', error.message);
  } else if (error instanceof ValidationError) {
    // Handle validation issues
    console.error('Validation error:', error.field, error.message);
  } else if (error instanceof AgentNotFoundError) {
    // Handle missing agent
    console.error('Agent not found:', error.agentId);
  }
}
```

## Documentation

- **[Architecture Guide](./ARCHITECTURE.md)** - Technical architecture and design decisions
- **[API Reference](https://docs.symbiont.dev/sdk/js/api)** - Complete API documentation
- **[Examples](./examples)** - Working code examples
- **[Migration Guide](https://docs.symbiont.dev/sdk/js/migration)** - Upgrading between versions

## Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details.

### Development Setup

```bash
git clone https://github.com/thirdkeyai/symbiont-sdk-js
cd symbiont-sdk-js
npm install
npm run build
npm test
```

## Support

- **Documentation**: [docs.symbiont.dev/sdk/js](https://docs.symbiont.dev/sdk/js)
- **GitHub Issues**: [github.com/thirdkeyai/symbiont-sdk-js/issues](https://github.com/thirdkeyai/symbiont-sdk-js/issues)
- **Community**: [discord.gg/symbiont](https://discord.gg/symbiont)

## License

MIT License - see [LICENSE](LICENSE) file for details.

---

**Symbiont SDK** - Build the future of AI agents with confidence.
