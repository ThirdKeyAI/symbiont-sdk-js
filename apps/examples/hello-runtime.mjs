// Hello, runtime — the smallest end-to-end Symbiont JS SDK example.
//
// Connects to a running Symbiont runtime, creates an agent, and executes it.
//
// Prerequisites:
//   - A Symbiont runtime reachable at SYMBIONT_API_URL (default
//     http://localhost:8080/api/v1). Start one with `symbi up` or the Docker
//     quick-start (see the main Symbiont README).
//   - Optionally SYMBIONT_API_KEY if your runtime requires authentication.
//
// Run (from the repo root, after `npm install && npm run build`):
//   node apps/examples/hello-runtime.mjs

import { SymbiontClient } from 'symbi-core';

const client = new SymbiontClient({
  apiKey: process.env.SYMBIONT_API_KEY,
  apiUrl: process.env.SYMBIONT_API_URL ?? 'http://localhost:8080/api/v1',
});

await client.connect();
console.log('health:', await client.health());

const agent = await client.agents.createAgent({
  name: 'textProcessor',
  description: 'Processes and analyzes text input',
  parameters: [{ name: 'text', type: { name: 'string' }, required: true }],
  returnType: { name: 'string' },
  capabilities: ['text_processing'],
});
console.log('created agent:', agent.id);

const result = await client.agents.executeAgent(agent.id, { text: 'Hello, Symbiont!' });
console.log('result:', result.result);
