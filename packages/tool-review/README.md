# symbi-tool-review

[![npm](https://img.shields.io/npm/v/symbi-tool-review.svg)](https://www.npmjs.com/package/symbi-tool-review)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](../../LICENSE)

Tool-review workflow client for the [Symbiont JavaScript/TypeScript SDK](https://github.com/ThirdKeyAI/symbiont-sdk-js). Submit tools for security analysis, track review sessions, and act on reviewer decisions before a tool is allowed to execute under the Symbiont runtime.

Most users install [`symbi-core`](https://www.npmjs.com/package/symbi-core), which exposes this as `client.toolReview`. Pull `symbi-tool-review` directly when you want a narrow dependency for a dashboard or review UI.

## Install

```bash
npm install symbi-tool-review
```

## Usage

```typescript
import { ToolReviewClient } from 'symbi-tool-review';

const review = new ToolReviewClient(transport);

// Submit a tool for review
const submission = await review.submitTool({
  name: 'nmap-scan',
  manifestPath: '/tools/nmap.clad.toml',
  requester: 'team-security',
});

// Poll the session
const session = await review.getSession(submission.sessionId);
console.log(session.state, session.analysis?.findings);

// Record a human reviewer decision
await review.recordDecision(session.id, {
  decision: 'approved',
  reviewer: 'alice@example.com',
  notes: 'Read-only; no external network writes.',
});
```

## Exports

| Export | Purpose |
|--------|---------|
| `ToolReviewClient` | Submit / get / list review sessions, record decisions, retrieve security analysis results |

Types re-exported from [`symbi-types`](https://www.npmjs.com/package/symbi-types): `ToolSubmission`, `ReviewSession`, `SecurityAnalysis`, `ReviewDecision`, and related enums.

## See also

- [`symbi-core`](https://www.npmjs.com/package/symbi-core) — exposes `client.toolReview`
- [SDK README](https://github.com/ThirdKeyAI/symbiont-sdk-js#readme)
- [docs.symbiont.dev/security-model](https://docs.symbiont.dev/security-model) — where tool review fits in the Trust Stack

## License

Apache 2.0. See [LICENSE](../../LICENSE).
