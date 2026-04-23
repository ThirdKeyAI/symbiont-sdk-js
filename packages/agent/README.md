# symbi-agent

[![npm](https://img.shields.io/npm/v/symbi-agent.svg)](https://www.npmjs.com/package/symbi-agent)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](../../LICENSE)

Agent, schedule, channel, workflow, and AgentPin clients for the [Symbiont JavaScript/TypeScript SDK](https://github.com/ThirdKeyAI/symbiont-sdk-js).

Most users don't install this directly — the unified `SymbiontClient` in [`symbi-core`](https://www.npmjs.com/package/symbi-core) already exposes these as `client.agents`, `client.schedules`, `client.channels`, `client.workflows`, and `client.agentpin`. Pull `symbi-agent` in explicitly when you want a narrow dependency or you're composing your own client.

## Install

```bash
npm install symbi-agent
```

## Usage

```typescript
import { AgentClient, ScheduleClient, ChannelClient, AgentPinClient } from 'symbi-agent';

// Given an authenticated Symbiont HTTP transport (see symbi-core for the full client):
const agents = new AgentClient(transport);
const agent = await agents.createAgent({
  name: 'textProcessor',
  description: 'Processes text input',
  parameters: [{ name: 'text', type: { name: 'string' }, required: true }],
  returnType: { name: 'string' },
  capabilities: ['text_processing'],
});

const result = await agents.executeAgent(agent.id, { text: 'Hello, Symbiont!' });
console.log(result.result);
```

## Exports

| Client | Purpose |
|--------|---------|
| `AgentClient` | Agent lifecycle: create, update, execute, re-execute, delete, list, status, history, heartbeat, push events |
| `ScheduleClient` | Cron schedules with pause/resume/trigger and run history |
| `ChannelClient` | Slack / Teams / Mattermost channel adapters, user mappings, audit |
| `WorkflowClient` | Multi-agent workflow execution |
| `AgentPinClient` | Client-side AgentPin — keygen, credential issuance, 12-step verification, discovery, key pinning, trust bundles (no runtime required) |

## See also

- [`symbi-core`](https://www.npmjs.com/package/symbi-core) — main client exposing all of these as sub-clients
- [SDK README](https://github.com/ThirdKeyAI/symbiont-sdk-js#readme) — full examples including AgentPin and reasoning loop
- [docs.symbiont.dev](https://docs.symbiont.dev) — runtime documentation

## License

Apache 2.0. See [LICENSE](../../LICENSE).
