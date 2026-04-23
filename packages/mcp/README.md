# symbi-mcp

[![npm](https://img.shields.io/npm/v/symbi-mcp.svg)](https://www.npmjs.com/package/symbi-mcp)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](../../LICENSE)

MCP (Model Context Protocol) client for the [Symbiont JavaScript/TypeScript SDK](https://github.com/ThirdKeyAI/symbiont-sdk-js). Drives the Symbiont runtime's governed MCP integration — listing connected servers, invoking tools, and surfacing resources under runtime policy.

Most users install [`symbi-core`](https://www.npmjs.com/package/symbi-core), which exposes this as `client.mcp`. Pull `symbi-mcp` directly when you want a narrow dependency.

## Install

```bash
npm install symbi-mcp
```

## Usage

```typescript
import { McpClient } from 'symbi-mcp';

const mcp = new McpClient(transport);

const servers = await mcp.listServers();
const tools = await mcp.listTools(servers[0].id);
const resources = await mcp.listResources(servers[0].id);

const result = await mcp.invokeTool(servers[0].id, 'search', { query: 'symbiont' });
```

Tool calls flow through the runtime's SchemaPin verification and Cedar policy gates — unverified or denied tools never execute.

## See also

- [`symbi-core`](https://www.npmjs.com/package/symbi-core) — exposes `client.mcp`
- [SDK README](https://github.com/ThirdKeyAI/symbiont-sdk-js#readme)
- [docs.symbiont.dev](https://docs.symbiont.dev) — runtime documentation
- [SchemaPin](https://github.com/ThirdKeyAI/SchemaPin) — the tool-signature verification layer

## License

Apache 2.0. See [LICENSE](../../LICENSE).
