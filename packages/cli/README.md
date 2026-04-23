# symbi-cli

[![npm](https://img.shields.io/npm/v/symbi-cli.svg)](https://www.npmjs.com/package/symbi-cli)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](../../LICENSE)

Command-line tooling for the [Symbiont JavaScript/TypeScript SDK](https://github.com/ThirdKeyAI/symbiont-sdk-js). Drive the Symbiont runtime from your shell — manage agents, run development helpers, handle auth.

> Distinct from [`symbi`](https://crates.io/crates/symbi), the Rust-native runtime binary. `symbi-cli` is a thin Node-based helper that speaks to the runtime over its HTTP API; `symbi` is the runtime itself.

## Install

```bash
npm install -g symbi-cli
```

Or use `npx`:

```bash
npx symbi-cli agent list
```

## Configuration

```bash
export SYMBIONT_API_KEY=...
export SYMBIONT_API_URL=http://localhost:8080/api/v1
```

Or create `~/.symbiont/config.json`:

```json
{
  "apiKey": "...",
  "apiUrl": "http://localhost:8080/api/v1"
}
```

## Examples

```bash
# Authenticate and verify the runtime is reachable
symbi-cli auth login
symbi-cli auth whoami

# Agent lifecycle
symbi-cli agent list
symbi-cli agent create --file ./my-agent.json
symbi-cli agent exec <agent-id> --input '{"text":"hello"}'

# Development helpers
symbi-cli dev watch ./agents/
```

## Programmatic use

```typescript
import { program } from 'symbi-cli';
program.parse(['agent', 'list']);
```

Utilities from `symbi-cli/utils/*` — config loading, error handling, output formatting — are re-exportable for downstream tools.

## See also

- [`symbi`](https://crates.io/crates/symbi) — the Rust-native Symbiont runtime binary
- [`symbi-core`](https://www.npmjs.com/package/symbi-core) — the programmatic client `symbi-cli` wraps
- [SDK README](https://github.com/ThirdKeyAI/symbiont-sdk-js#readme)
- [docs.symbiont.dev/getting-started](https://docs.symbiont.dev/getting-started) — full installation options

## License

Apache 2.0. See [LICENSE](../../LICENSE).
