# Agent Management Guide

This guide covers everything you need to know about creating, managing, and executing agents using the Symbiont SDK.

## Table of Contents

- [Overview](#overview)
- [Creating Agents](#creating-agents)
- [Managing Agents](#managing-agents)
- [Executing Agents](#executing-agents)
- [Agent Lifecycle](#agent-lifecycle)
- [Best Practices](#best-practices)
- [Advanced Patterns](#advanced-patterns)

## Overview

The [`AgentClient`](../api/classes/AgentClient.html) provides a comprehensive API for managing AI agents throughout their lifecycle. Agents are the core building blocks of the Symbiont platform, encapsulating specific AI capabilities and logic.

### Key Concepts

- **Agent Definition**: The blueprint that defines an agent's capabilities, parameters, and behavior
- **Agent Instance**: A running instance of an agent definition
- **Execution**: A single run of an agent with specific input parameters
- **Agent Status**: The current state of an agent (active, inactive, error, etc.)

## Creating Agents

### Basic Agent Creation

```typescript
import { SymbiontClient } from '@symbi/core';

const client = new SymbiontClient({
  apiKey: process.env.SYMBIONT_API_KEY
});

await client.connect();

// Create a simple text analysis agent
const agent = await client.agents.createAgent({
  name: 'textAnalyzer',
  description: 'Analyzes text sentiment and extracts key information',
  parameters: [
    {
      name: 'text',
      type: { name: 'string' },
      description: 'Text to analyze',
      required: true
    },
    {
      name: 'analysisType',
      type: { name: 'string' },
      description: 'Type of analysis to perform',
      required: false,
      defaultValue: 'sentiment'
    }
  ],
  returnType: { 
    name: 'object',
    properties: {
      sentiment: { name: 'string' },
      confidence: { name: 'number' },
      keywords: { name: 'array', items: { name: 'string' } }
    }
  },
  capabilities: ['text_processing', 'nlp'],
  executionConfig: {
    memory: 'ephemeral',
    privacy: 'standard',
    timeout: 30000
  }
});

console.log('Agent created with ID:', agent.id);
```

### Advanced Agent with Policies

```typescript
// Create an agent with custom policies
const dataProcessorAgent = await client.agents.createAgent({
  name: 'dataProcessor',
  description: 'Processes sensitive customer data with strict security controls',
  parameters: [
    {
      name: 'customerData',
      type: { name: 'object' },
      description: 'Customer data to process',
      required: true
    },
    {
      name: 'processingMode',
      type: { name: 'string' },
      description: 'Processing mode: anonymize, aggregate, or analyze',
      required: true
    }
  ],
  returnType: { name: 'object' },
  capabilities: ['data_processing', 'encryption'],
  policies: [
    {
      name: 'dataPrivacyPolicy',
      description: 'Ensures data privacy compliance',
      rules: [
        {
          id: 'pii-protection',
          effect: 'require',
          actions: ['anonymize'],
          conditions: [
            {
              fact: 'data.containsPII',
              operator: 'equals',
              value: true
            }
          ],
          priority: 100
        }
      ]
    }
  ],
  executionConfig: {
    memory: 'persistent',
    privacy: 'high',
    encryption: true,
    auditLevel: 'detailed'
  }
});
```

### Creating Agents with Complex Types

```typescript
// Agent that works with complex nested data structures
const reportGeneratorAgent = await client.agents.createAgent({
  name: 'reportGenerator',
  description: 'Generates comprehensive business reports',
  parameters: [
    {
      name: 'reportConfig',
      type: {
        name: 'object',
        properties: {
          type: { name: 'string' },
          dateRange: {
            name: 'object',
            properties: {
              start: { name: 'string' },
              end: { name: 'string' }
            }
          },
          metrics: {
            name: 'array',
            items: { name: 'string' }
          },
          includeCharts: { name: 'boolean' }
        }
      },
      required: true
    }
  ],
  returnType: {
    name: 'object',
    properties: {
      reportId: { name: 'string' },
      downloadUrl: { name: 'string' },
      metadata: {
        name: 'object',
        properties: {
          generatedAt: { name: 'string' },
          version: { name: 'string' },
          format: { name: 'string' }
        }
      }
    }
  },
  capabilities: ['report_generation', 'data_analysis', 'file_processing']
});
```

## Managing Agents

### Listing Agents

```typescript
// Get all agents
const agentsList = await client.agents.listAgents();

console.log(`Found ${agentsList.agents.length} agents:`);
agentsList.agents.forEach(agent => {
  console.log(`- ${agent.name} (${agent.id}) - Status: ${agent.status}`);
});

// Access pagination info
console.log(`Page ${agentsList.pagination.page} of ${agentsList.pagination.totalPages}`);
console.log(`Total agents: ${agentsList.pagination.total}`);
```

### Getting Agent Details

```typescript
// Get detailed agent information
const agentId = 'agent-123';
const agentStatus = await client.agents.getAgentStatus(agentId);

console.log('Agent Details:');
console.log(`- Name: ${agentStatus.name}`);
console.log(`- Status: ${agentStatus.status}`);
console.log(`- Created: ${agentStatus.createdAt}`);
console.log(`- Last Modified: ${agentStatus.updatedAt}`);
console.log(`- Total Executions: ${agentStatus.executionCount}`);
console.log(`- Success Rate: ${agentStatus.successRate}%`);
```

### Updating Agents

```typescript
// Update agent configuration
const updatedAgent = await client.agents.updateAgent(agentId, {
  description: 'Updated description with new capabilities',
  capabilities: ['text_processing', 'nlp', 'sentiment_analysis'],
  executionConfig: {
    memory: 'persistent',
    privacy: 'high',
    timeout: 45000 // Increased timeout
  }
});

console.log('Agent updated successfully');
```

### Deleting Agents

```typescript
try {
  await client.agents.deleteAgent(agentId);
  console.log('Agent deleted successfully');
} catch (error) {
  console.error('Failed to delete agent:', error.message);
}
```

## Executing Agents

### Basic Execution

```typescript
// Execute an agent with parameters
const executionResult = await client.agents.executeAgent(
  agentId,
  {
    text: 'This is a sample text for analysis',
    analysisType: 'sentiment'
  }
);

console.log('Execution Result:');
console.log(`- Result: ${JSON.stringify(executionResult.result, null, 2)}`);
console.log(`- Execution Time: ${executionResult.executionTime}ms`);
console.log(`- Status: ${executionResult.status}`);
```

### Execution with Options

```typescript
// Execute with custom options
const result = await client.agents.executeAgent(
  agentId,
  { text: 'Sample input text' },
  {
    timeout: 60000,      // 60 second timeout
    memory: 'persistent', // Use persistent memory
    priority: 'high',     // High priority execution
    traceId: 'trace-123', // Custom trace ID for debugging
    metadata: {
      source: 'api',
      version: '1.2.3'
    }
  }
);
```

### Handling Long-Running Executions

```typescript
// For long-running agents, you might want to poll for results
async function executeLongRunningAgent(agentId: string, params: any) {
  console.log('Starting long-running execution...');
  
  const execution = await client.agents.executeAgent(
    agentId,
    params,
    { timeout: 300000 } // 5 minute timeout
  );
  
  if (execution.status === 'completed') {
    return execution.result;
  } else if (execution.status === 'running') {
    // In a real implementation, you'd poll for status updates
    console.log('Execution still running, execution ID:', execution.executionId);
    return execution;
  } else {
    throw new Error(`Execution failed with status: ${execution.status}`);
  }
}
```

### Batch Execution

```typescript
// Execute multiple agents concurrently
async function executeBatch(agentConfigs: Array<{agentId: string, params: any}>) {
  const promises = agentConfigs.map(config => 
    client.agents.executeAgent(config.agentId, config.params)
      .catch(error => ({ error: error.message, agentId: config.agentId }))
  );
  
  const results = await Promise.allSettled(promises);
  
  const successful = results
    .filter(result => result.status === 'fulfilled')
    .map(result => result.value);
    
  const failed = results
    .filter(result => result.status === 'rejected')
    .map(result => result.reason);
  
  return { successful, failed };
}
```

## Agent Lifecycle

### Monitoring Agent History

```typescript
// Get execution history
const history = await client.agents.getAgentHistory(agentId, 1, 10);

console.log(`Recent executions (${history.executions.length}):`);
history.executions.forEach(execution => {
  console.log(`- ${execution.executionId}: ${execution.status} (${execution.executionTime}ms)`);
  if (execution.error) {
    console.log(`  Error: ${execution.error}`);
  }
});

// Pagination through history
let page = 1;
const pageSize = 20;
let hasMore = true;

while (hasMore) {
  const batch = await client.agents.getAgentHistory(agentId, page, pageSize);
  
  // Process batch
  console.log(`Processing page ${page}: ${batch.executions.length} executions`);
  
  // Check if there are more pages
  hasMore = batch.pagination.page < batch.pagination.totalPages;
  page++;
}
```

### Performance Monitoring

```typescript
// Monitor agent performance over time
async function analyzeAgentPerformance(agentId: string, days: number = 7) {
  const history = await client.agents.getAgentHistory(agentId, 1, 1000);
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  
  const recentExecutions = history.executions.filter(
    execution => new Date(execution.createdAt) > cutoff
  );
  
  const successful = recentExecutions.filter(ex => ex.status === 'completed');
  const failed = recentExecutions.filter(ex => ex.status === 'failed');
  
  const avgExecutionTime = successful.reduce((sum, ex) => sum + ex.executionTime, 0) / successful.length;
  const successRate = (successful.length / recentExecutions.length) * 100;
  
  return {
    totalExecutions: recentExecutions.length,
    successfulExecutions: successful.length,
    failedExecutions: failed.length,
    successRate: successRate.toFixed(2),
    averageExecutionTime: Math.round(avgExecutionTime),
    period: `${days} days`
  };
}

const performance = await analyzeAgentPerformance(agentId);
console.log('Performance Analysis:', performance);
```

## Best Practices

### 1. Agent Naming and Organization

```typescript
// ✅ Good: Descriptive, versioned names
const agent = await client.agents.createAgent({
  name: 'customerDataProcessor_v2',
  description: 'Processes customer data with GDPR compliance - Version 2.0',
  // ... rest of configuration
});

// ❌ Bad: Vague names
const agent = await client.agents.createAgent({
  name: 'processor',
  description: 'Does stuff',
  // ...
});
```

### 2. Error Handling

```typescript
// ✅ Good: Comprehensive error handling
async function safeAgentExecution(agentId: string, params: any) {
  try {
    const result = await client.agents.executeAgent(agentId, params, {
      timeout: 30000
    });
    
    return {
      success: true,
      data: result.result,
      executionTime: result.executionTime
    };
  } catch (error) {
    console.error(`Agent execution failed: ${error.message}`);
    
    return {
      success: false,
      error: error.message,
      retryable: error instanceof TimeoutError
    };
  }
}
```

### 3. Parameter Validation

```typescript
// ✅ Good: Validate parameters before execution
function validateParameters(params: any, schema: any): boolean {
  // Implement your validation logic
  if (!params.text || typeof params.text !== 'string') {
    throw new Error('Invalid text parameter');
  }
  
  if (params.text.length > 10000) {
    throw new Error('Text too long (max 10,000 characters)');
  }
  
  return true;
}

async function executeWithValidation(agentId: string, params: any) {
  validateParameters(params, agentSchema);
  return await client.agents.executeAgent(agentId, params);
}
```

### 4. Resource Management

```typescript
// ✅ Good: Clean up resources and monitor usage
class AgentManager {
  private executionCounts = new Map<string, number>();
  
  async executeAgent(agentId: string, params: any) {
    // Track usage
    const count = this.executionCounts.get(agentId) || 0;
    this.executionCounts.set(agentId, count + 1);
    
    // Implement rate limiting
    if (count > 100) {
      throw new Error('Rate limit exceeded for agent');
    }
    
    const result = await client.agents.executeAgent(agentId, params);
    
    // Log for monitoring
    console.log(`Agent ${agentId} executed successfully (${count + 1} total)`);
    
    return result;
  }
  
  getUsageStats() {
    return Object.fromEntries(this.executionCounts);
  }
}
```

## Advanced Patterns

### 1. Agent Chaining

```typescript
// Chain multiple agents together
async function chainAgents(input: string) {
  // Step 1: Analyze text
  const analysis = await client.agents.executeAgent(
    'textAnalyzer',
    { text: input }
  );
  
  // Step 2: Generate summary based on analysis
  const summary = await client.agents.executeAgent(
    'textSummarizer',
    { 
      text: input, 
      sentiment: analysis.result.sentiment,
      keywords: analysis.result.keywords
    }
  );
  
  // Step 3: Generate recommendations
  const recommendations = await client.agents.executeAgent(
    'recommendationEngine',
    {
      originalText: input,
      analysis: analysis.result,
      summary: summary.result
    }
  );
  
  return {
    analysis: analysis.result,
    summary: summary.result,
    recommendations: recommendations.result
  };
}
```

### 2. Conditional Execution

```typescript
// Execute different agents based on conditions
async function conditionalExecution(input: any) {
  // First, classify the input
  const classification = await client.agents.executeAgent(
    'inputClassifier',
    { data: input }
  );
  
  const type = classification.result.type;
  
  switch (type) {
    case 'text':
      return await client.agents.executeAgent('textProcessor', input);
    case 'image':
      return await client.agents.executeAgent('imageProcessor', input);
    case 'data':
      return await client.agents.executeAgent('dataProcessor', input);
    default:
      throw new Error(`Unknown input type: ${type}`);
  }
}
```

### 3. Agent Pool Management

```typescript
// Manage a pool of similar agents for load balancing
class AgentPool {
  private agents: string[] = [];
  private currentIndex = 0;
  
  constructor(agentIds: string[]) {
    this.agents = agentIds;
  }
  
  async executeOnAvailableAgent(params: any) {
    const maxRetries = this.agents.length;
    
    for (let i = 0; i < maxRetries; i++) {
      const agentId = this.getNextAgent();
      
      try {
        const result = await client.agents.executeAgent(agentId, params, {
          timeout: 10000 // Short timeout for quick failover
        });
        
        return result;
      } catch (error) {
        console.warn(`Agent ${agentId} failed, trying next agent:`, error.message);
        
        if (i === maxRetries - 1) {
          throw new Error('All agents in pool failed');
        }
      }
    }
  }
  
  private getNextAgent(): string {
    const agentId = this.agents[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.agents.length;
    return agentId;
  }
}

// Usage
const pool = new AgentPool(['agent1', 'agent2', 'agent3']);
const result = await pool.executeOnAvailableAgent({ text: 'Hello' });
```

## Troubleshooting

### Common Issues

#### 1. Agent Creation Fails
```typescript
// Check for common issues
try {
  const agent = await client.agents.createAgent(definition);
} catch (error) {
  if (error.message.includes('validation')) {
    console.error('Agent definition validation failed:', error.details);
  } else if (error.message.includes('quota')) {
    console.error('Agent quota exceeded');
  } else {
    console.error('Unexpected error:', error.message);
  }
}
```

#### 2. Execution Timeouts
```typescript
// Handle timeouts gracefully
try {
  const result = await client.agents.executeAgent(agentId, params, {
    timeout: 60000 // Increase timeout for complex operations
  });
} catch (error) {
  if (error.name === 'TimeoutError') {
    console.log('Execution timed out, consider increasing timeout or optimizing agent');
  }
}
```

#### 3. Memory Issues
```typescript
// For agents that process large amounts of data
const result = await client.agents.executeAgent(agentId, params, {
  memory: 'persistent', // Use persistent memory for large operations
  executionConfig: {
    maxMemory: '2GB' // Set memory limits
  }
});
```

## Next Steps

- **[Policy Creation Guide](./policy-creation.md)** - Learn how to create sophisticated access control policies
- **[Tool Review Workflow](./tool-review-workflow.md)** - Submit agents for security review
- **[Secrets Management](./secrets-management.md)** - Securely handle sensitive data in agents
- **[API Reference](../api/classes/AgentClient.html)** - Complete AgentClient API documentation

For more advanced use cases and examples, check out the [examples directory](../../examples/).