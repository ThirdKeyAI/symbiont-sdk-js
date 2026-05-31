import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AgentClient } from '../AgentClient';
import { buildRuntimeUrl } from '../urlUtils';
import type { SymbiontConfig } from 'symbi-types';

function makeClient(runtimeApiUrl: string) {
  const config: SymbiontConfig = {
    apiKey: 'test-api-key',
    runtimeApiUrl,
    validationMode: 'development',
    environment: 'development',
  };
  return {
    getAuthHeaders: async () => ({ Authorization: 'Bearer test' }),
    configuration: Object.freeze({ ...config }),
  };
}

describe('buildRuntimeUrl', () => {
  it('adds a single /api/v1 for a bare base URL and bare path', () => {
    expect(buildRuntimeUrl('http://localhost:8080', '/agents')).toBe(
      'http://localhost:8080/api/v1/agents'
    );
  });

  it('does not double the prefix when the base URL already ends with /api/v1', () => {
    expect(buildRuntimeUrl('http://localhost:8080/api/v1', '/agents')).toBe(
      'http://localhost:8080/api/v1/agents'
    );
  });

  it('does not double the prefix when the endpoint already starts with /api/v1', () => {
    expect(buildRuntimeUrl('http://localhost:8080', '/api/v1/agents')).toBe(
      'http://localhost:8080/api/v1/agents'
    );
  });

  it('handles trailing slash on base URL', () => {
    expect(buildRuntimeUrl('http://localhost:8080/', '/agents')).toBe(
      'http://localhost:8080/api/v1/agents'
    );
  });

  it('always yields exactly one /api/v1', () => {
    const cases: Array<[string, string]> = [
      ['http://localhost:8080', '/agents'],
      ['http://localhost:8080/api/v1', '/agents'],
      ['http://localhost:8080', '/api/v1/agents'],
      ['http://localhost:8080/api/v1/', '/api/v1/agents'],
    ];
    for (const [base, endpoint] of cases) {
      const url = buildRuntimeUrl(base, endpoint);
      expect(url.match(/\/api\/v1/g)).toHaveLength(1);
    }
  });
});

describe('AgentClient request URL normalization', () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchSpy = vi.fn(async () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: async () => JSON.stringify([]),
      json: async () => [],
    }));
    vi.stubGlobal('fetch', fetchSpy);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('listAgents hits /api/v1/agents exactly once', async () => {
    const client = new AgentClient(makeClient('http://localhost:8080'));
    await client.listAgents();

    const url = fetchSpy.mock.calls[0][0] as string;
    expect(url).toBe('http://localhost:8080/api/v1/agents');
    expect(url.match(/\/api\/v1/g)).toHaveLength(1);
  });

  it('executeAgent hits /api/v1/agents/{id}/execute', async () => {
    const client = new AgentClient(makeClient('http://localhost:8080'));
    await client.executeAgent('a-1', { foo: 'bar' });

    const url = fetchSpy.mock.calls[0][0] as string;
    expect(url).toBe('http://localhost:8080/api/v1/agents/a-1/execute');
  });

  it('does not double-prefix when base URL already includes /api/v1', async () => {
    const client = new AgentClient(makeClient('http://localhost:8080/api/v1'));
    await client.listAgents();

    const url = fetchSpy.mock.calls[0][0] as string;
    expect(url).toBe('http://localhost:8080/api/v1/agents');
    expect(url.match(/\/api\/v1/g)).toHaveLength(1);
  });
});
