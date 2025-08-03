# Getting Started with Symbiont SDK

Welcome to the Symbiont JavaScript SDK! This guide will help you get up and running quickly with building and deploying AI agents.

## 📦 Installation

### Basic Installation

Install the core SDK package:

```bash
npm install @symbiont/core
```

### Complete Installation (Recommended)

For full functionality, install the complete SDK:

```bash
# Core packages
npm install @symbiont/core @symbiont/agent @symbiont/policy

# Optional packages
npm install @symbiont/secrets @symbiont/tool-review @symbiont/mcp
```

### Package Manager Alternatives

```bash
# Using Yarn
yarn add @symbiont/core

# Using pnpm
pnpm add @symbiont/core
```

## 🔧 Configuration

### Environment Variables

Set up your environment with the required credentials:

```bash
# Required - Your Symbiont API key
export SYMBIONT_API_KEY="your_api_key_here"

# Optional - Custom API endpoints
export SYMBIONT_API_URL="https://api.symbiont.dev"
export SYMBIONT_TOOL_REVIEW_URL="https://tool-review.symbiont.dev"
export SYMBIONT_ENVIRONMENT="production"
```

### Basic Client Setup

Create a new Symbiont client:

```typescript
import { SymbiontClient } from '@symbiont/core';

const client = new SymbiontClient({
  apiKey: process.env.SYMBIONT_API_KEY,
  environment: 'production', // or 'development', 'staging'
  validationMode: 'development' // 'strict', 'performance', or 'development'
});

// Connect to the Symbiont platform
await client.connect();
```

### Advanced Configuration

For production applications, you may want more control:

```typescript
const client = new SymbiontClient({
  // API Configuration
  runtimeApiUrl: 'https://api.symbiont.dev',
  toolReviewApiUrl: 'https://tool-review.symbiont.dev',
  
  // Authentication
  apiKey: process.env.SYMBIONT_API_KEY,
  
  // Validation Mode
  validationMode: 'strict', // Enable strict validation for production
  
  // Performance Settings
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
  },
  
  // Debug mode
  debug: false
});
```

## 🤖 Your First Agent

Let's create and execute a simple agent:

### Step 1: Create an Agent

```typescript
import { SymbiontClient } from '@symbiont/core';

const client = new SymbiontClient({
  apiKey: process.env.SYMBIONT_API_KEY
});

await client.connect();

// Create a simple data processing agent
const agent = await client.agents.createAgent({
  name: 'textProcessor',
  description: 'Processes and analyzes text input',
  parameters: [
    {
      name: 'text',
      type: { name: 'string' },
      description: 'Text to process',
      required: true
    }
  ],
  returnType: { name: 'string' },
  capabilities: ['text_processing'],
  executionConfig: {
    memory: 'ephemeral',
    privacy: 'standard'
  }
});

console.log('Agent created:', agent.id);
```

### Step 2: Execute the Agent

```typescript
// Execute the agent with sample data
const result = await client.agents.executeAgent(
  agent.id,
  { text: 'Hello, Symbiont!' },
  {
    timeout: 30000,
    memory: 'ephemeral'
  }
);

console.log('Result:', result.result);
console.log('Execution time:', result.executionTime);
```

### Step 3: Monitor Agent Status

```typescript
// Check agent status
const status = await client.agents.getAgentStatus(agent.id);
console.log('Agent status:', status.status);

// Get execution history
const history = await client.agents.getAgentHistory(agent.id);
console.log('Recent executions:', history.executions.length);
```

## 🛡️ Error Handling

The SDK provides comprehensive error handling:

```typescript
import { 
  AuthenticationError, 
  ValidationError, 
  AgentNotFoundError 
} from '@symbiont/core';

try {
  const result = await client.agents.executeAgent(agentId, params);
  console.log('Success:', result);
} catch (error) {
  if (error instanceof AuthenticationError) {
    console.error('Authentication failed:', error.message);
    // Handle re-authentication
  } else if (error instanceof ValidationError) {
    console.error('Invalid parameters:', error.message);
    // Handle validation errors
  } else if (error instanceof AgentNotFoundError) {
    console.error('Agent not found:', error.agentId);
    // Handle missing agent
  } else {
    console.error('Unexpected error:', error.message);
  }
}
```

## 🌐 Browser Usage

### Using CDN

```html
<!DOCTYPE html>
<html>
<head>
  <title>Symbiont SDK in Browser</title>
</head>
<body>
  <script type="module">
    import { SymbiontClient } from 'https://cdn.jsdelivr.net/npm/@symbiont/core/dist/browser.esm.js';
    
    const client = new SymbiontClient({
      apiKey: 'your-api-key',
      environment: 'production'
    });
    
    await client.connect();
    console.log('Connected to Symbiont!');
  </script>
</body>
</html>
```

### Using Bundlers (Webpack, Vite, etc.)

```typescript
// Works with any modern bundler
import { SymbiontClient } from '@symbiont/core';

const client = new SymbiontClient({
  apiKey: process.env.VITE_SYMBIONT_API_KEY // or REACT_APP_SYMBIONT_API_KEY
});
```

## 🔍 Health Checks

Always verify your connection:

```typescript
// Check system health
const health = await client.health();
console.log('API Status:', health.status);
console.log('Version:', health.version);

// Check authentication
try {
  await client.refreshAuth();
  console.log('Authentication valid');
} catch (error) {
  console.error('Authentication invalid:', error.message);
}
```

## 📊 Validation Modes

The SDK supports three validation modes:

### Development Mode (Default)
- ✅ Runtime validation with warnings
- ✅ Helpful error messages
- ✅ Type checking in development

```typescript
const client = new SymbiontClient({
  validationMode: 'development' // Default
});
```

### Strict Mode (Production)
- ✅ Full runtime validation
- ✅ Throws errors on validation failures
- ✅ Maximum safety

```typescript
const client = new SymbiontClient({
  validationMode: 'strict'
});
```

### Performance Mode
- ✅ TypeScript-only validation
- ✅ No runtime overhead
- ✅ Maximum performance

```typescript
const client = new SymbiontClient({
  validationMode: 'performance'
});
```

## 🚀 Next Steps

Now that you have the basics, explore these advanced features:

1. **[Agent Management](./agent-management.md)** - Learn advanced agent creation and management
2. **[Policy Creation](./policy-creation.md)** - Build sophisticated access control policies  
3. **[Secrets Management](./secrets-management.md)** - Securely handle credentials and sensitive data
4. **[Tool Review Workflow](./tool-review-workflow.md)** - Submit tools for security review

## 💡 Tips and Best Practices

### 1. Always Use Environment Variables
```typescript
// ✅ Good
const client = new SymbiontClient({
  apiKey: process.env.SYMBIONT_API_KEY
});

// ❌ Bad - never hardcode API keys
const client = new SymbiontClient({
  apiKey: 'sk-1234567890abcdef'
});
```

### 2. Handle Errors Gracefully
```typescript
// ✅ Good
try {
  const result = await client.agents.executeAgent(id, params);
  return result;
} catch (error) {
  console.error('Agent execution failed:', error.message);
  return { error: 'Execution failed' };
}
```

### 3. Use Appropriate Validation Modes
- **Development**: Use `development` mode while building
- **Testing**: Use `strict` mode for comprehensive testing
- **Production**: Use `performance` mode for optimal speed

### 4. Monitor Agent Performance
```typescript
// Track execution times and success rates
const startTime = Date.now();
const result = await client.agents.executeAgent(id, params);
const executionTime = Date.now() - startTime;

console.log(`Agent executed in ${executionTime}ms`);
```

## 🆘 Getting Help

- **[API Reference](../api/index.html)** - Complete API documentation
- **[GitHub Issues](https://github.com/thirdkeyai/symbiont-sdk-js/issues)** - Report bugs or request features
- **[Examples](../../examples/)** - Working code examples
- **[Architecture Guide](../../../ARCHITECTURE.md)** - Technical implementation details

Welcome to the Symbiont ecosystem! 🎉