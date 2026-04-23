# symbi-testing

[![npm](https://img.shields.io/npm/v/symbi-testing.svg)](https://www.npmjs.com/package/symbi-testing)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](../../LICENSE)

Mocks and test helpers for applications built on the [Symbiont JavaScript/TypeScript SDK](https://github.com/ThirdKeyAI/symbiont-sdk-js). Lets you test code that talks to Symbiont without standing up the runtime.

## Install

```bash
npm install --save-dev symbi-testing
```

## Usage

```typescript
import {
  MockFetch,
  MockAuthManager,
  MockSecretManager,
  TestEnvironment,
} from 'symbi-testing';

// Full test harness with mocked auth, secrets, and HTTP
const env = new TestEnvironment({
  apiKey: 'test-key',
  baseUrl: 'http://mock.symbiont',
});

env.fetch.mockResponse('/api/v1/agents', {
  status: 200,
  body: [{ id: 'agent-1', name: 'Test Agent' }],
});

const client = env.createClient();
const agents = await client.agents.listAgents();
expect(agents[0].id).toBe('agent-1');

env.fetch.expectCalled('/api/v1/agents', { method: 'GET' });
```

## Exports

| Export | Purpose |
|--------|---------|
| `MockFetch` | Programmable response matcher for HTTP calls |
| `MockAuthManager` | Bypasses real auth; returns pre-seeded tokens |
| `MockSecretManager` | In-memory secret store for tests |
| `TestEnvironment` | Wraps the three above plus a pre-wired `SymbiontClient` |
| `mockData` | Realistic fixtures for agents, executions, policies, schedules |
| `testHelpers` | Assertion + retry + waiting utilities |

## See also

- [`symbi-core`](https://www.npmjs.com/package/symbi-core) — main client
- [SDK README](https://github.com/ThirdKeyAI/symbiont-sdk-js#readme)

## License

Apache 2.0. See [LICENSE](../../LICENSE).
