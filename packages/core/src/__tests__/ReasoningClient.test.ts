import { describe, it, expect } from 'vitest';
import {
  UsageSchema,
  ToolDefinitionSchema,
  ToolCallRequestSchema,
  FinishReasonSchema,
  ResponseFormatSchema,
  InferenceOptionsSchema,
  InferenceResponseSchema,
  ObservationSchema,
  ProposedActionSchema,
  LoopDecisionSchema,
  RecoveryStrategySchema,
  TerminationReasonSchema,
  LoopConfigSchema,
  LoopStateSchema,
  LoopResultSchema,
  LoopEventSchema,
  JournalEntrySchema,
  CedarPolicySchema,
  KnowledgeConfigSchema,
  CircuitStateSchema,
  CircuitBreakerConfigSchema,
  CircuitBreakerStatusSchema,
  RunReasoningLoopRequestSchema,
  RunReasoningLoopResponseSchema,
} from '@symbi/types';
import { ReasoningClient } from '../ReasoningClient';

// =============================================================================
// Schema Validation Tests
// =============================================================================

describe('Usage schema', () => {
  it('should parse valid usage', () => {
    const result = UsageSchema.parse({ prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 });
    expect(result.total_tokens).toBe(30);
  });

  it('should reject negative tokens', () => {
    expect(() => UsageSchema.parse({ prompt_tokens: -1, completion_tokens: 0, total_tokens: 0 })).toThrow();
  });
});

describe('ToolDefinition schema', () => {
  it('should parse valid tool definition', () => {
    const result = ToolDefinitionSchema.parse({
      name: 'search',
      description: 'Search the web',
      parameters: { type: 'object', properties: { query: { type: 'string' } } },
    });
    expect(result.name).toBe('search');
  });
});

describe('FinishReason schema', () => {
  it('should accept valid values', () => {
    expect(FinishReasonSchema.parse('stop')).toBe('stop');
    expect(FinishReasonSchema.parse('tool_calls')).toBe('tool_calls');
    expect(FinishReasonSchema.parse('max_tokens')).toBe('max_tokens');
    expect(FinishReasonSchema.parse('content_filter')).toBe('content_filter');
  });

  it('should reject invalid values', () => {
    expect(() => FinishReasonSchema.parse('invalid')).toThrow();
  });
});

describe('ResponseFormat schema', () => {
  it('should parse text format', () => {
    const result = ResponseFormatSchema.parse({ type: 'text' });
    expect(result.type).toBe('text');
  });

  it('should parse json_schema format with schema', () => {
    const result = ResponseFormatSchema.parse({
      type: 'json_schema',
      schema: { type: 'object' },
      name: 'my_schema',
    });
    expect(result.type).toBe('json_schema');
  });
});

describe('ProposedAction schema', () => {
  it('should parse tool_call action', () => {
    const result = ProposedActionSchema.parse({
      type: 'tool_call',
      call_id: 'call-1',
      name: 'search',
      arguments: '{"query":"test"}',
    });
    expect(result.type).toBe('tool_call');
    if (result.type === 'tool_call') {
      expect(result.name).toBe('search');
    }
  });

  it('should parse delegate action', () => {
    const result = ProposedActionSchema.parse({
      type: 'delegate',
      target: 'agent-2',
      message: 'please help',
    });
    expect(result.type).toBe('delegate');
  });

  it('should parse respond action', () => {
    const result = ProposedActionSchema.parse({
      type: 'respond',
      content: 'Here is the answer.',
    });
    expect(result.type).toBe('respond');
  });

  it('should parse terminate action', () => {
    const result = ProposedActionSchema.parse({
      type: 'terminate',
      reason: 'task complete',
      output: 'Done.',
    });
    expect(result.type).toBe('terminate');
  });

  it('should reject unknown action type', () => {
    expect(() => ProposedActionSchema.parse({ type: 'fly' })).toThrow();
  });
});

describe('LoopDecision schema', () => {
  it('should parse allow decision', () => {
    const result = LoopDecisionSchema.parse({ decision: 'allow' });
    expect(result.decision).toBe('allow');
  });

  it('should parse deny decision', () => {
    const result = LoopDecisionSchema.parse({ decision: 'deny', reason: 'not permitted' });
    expect(result.decision).toBe('deny');
  });

  it('should parse modify decision', () => {
    const result = LoopDecisionSchema.parse({
      decision: 'modify',
      modified_action: { type: 'respond', content: 'modified' },
      reason: 'sanitized',
    });
    expect(result.decision).toBe('modify');
  });
});

describe('RecoveryStrategy schema', () => {
  it('should parse retry strategy', () => {
    const result = RecoveryStrategySchema.parse({ type: 'retry', max_attempts: 3, base_delay_ms: 1000 });
    expect(result.type).toBe('retry');
  });

  it('should parse dead_letter strategy', () => {
    const result = RecoveryStrategySchema.parse({ type: 'dead_letter' });
    expect(result.type).toBe('dead_letter');
  });

  it('should parse escalate strategy', () => {
    const result = RecoveryStrategySchema.parse({ type: 'escalate', queue: 'ops', context_snapshot: true });
    expect(result.type).toBe('escalate');
  });
});

describe('TerminationReason schema', () => {
  it('should parse completed', () => {
    expect(TerminationReasonSchema.parse({ type: 'completed' }).type).toBe('completed');
  });

  it('should parse policy_denial with reason', () => {
    const result = TerminationReasonSchema.parse({ type: 'policy_denial', reason: 'blocked' });
    expect(result.type).toBe('policy_denial');
  });

  it('should parse error with message', () => {
    const result = TerminationReasonSchema.parse({ type: 'error', message: 'crash' });
    expect(result.type).toBe('error');
  });
});

describe('LoopConfig schema', () => {
  it('should parse with defaults', () => {
    const result = LoopConfigSchema.parse({});
    expect(result.max_iterations).toBe(10);
    expect(result.max_total_tokens).toBe(100000);
    expect(result.default_recovery.type).toBe('dead_letter');
  });

  it('should parse with overrides', () => {
    const result = LoopConfigSchema.parse({ max_iterations: 5, timeout_ms: 60000 });
    expect(result.max_iterations).toBe(5);
    expect(result.timeout_ms).toBe(60000);
  });
});

describe('LoopState schema', () => {
  it('should parse valid state', () => {
    const result = LoopStateSchema.parse({
      agent_id: 'agent-1',
      iteration: 3,
      total_usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
      started_at: '2026-01-01T00:00:00Z',
      current_phase: 'reasoning',
    });
    expect(result.iteration).toBe(3);
    expect(result.pending_observations).toEqual([]);
  });
});

describe('LoopResult schema', () => {
  it('should parse valid result', () => {
    const result = LoopResultSchema.parse({
      output: 'The answer is 42',
      iterations: 3,
      total_usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
      termination_reason: { type: 'completed' },
      duration_ms: 5000,
    });
    expect(result.output).toBe('The answer is 42');
    expect(result.termination_reason.type).toBe('completed');
  });
});

describe('LoopEvent schema', () => {
  it('should parse started event', () => {
    const result = LoopEventSchema.parse({
      type: 'started',
      agent_id: 'agent-1',
      config: {},
    });
    expect(result.type).toBe('started');
  });

  it('should parse reasoning_complete event', () => {
    const result = LoopEventSchema.parse({
      type: 'reasoning_complete',
      iteration: 1,
      actions: [{ type: 'respond', content: 'hello' }],
      usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
    });
    expect(result.type).toBe('reasoning_complete');
  });

  it('should parse terminated event', () => {
    const result = LoopEventSchema.parse({
      type: 'terminated',
      reason: { type: 'completed' },
      iterations: 5,
      total_usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
      duration_ms: 10000,
    });
    expect(result.type).toBe('terminated');
  });

  it('should parse recovery_triggered event', () => {
    const result = LoopEventSchema.parse({
      type: 'recovery_triggered',
      iteration: 2,
      tool_name: 'search',
      strategy: { type: 'retry', max_attempts: 3, base_delay_ms: 1000 },
      error: 'timeout',
    });
    expect(result.type).toBe('recovery_triggered');
  });
});

describe('JournalEntry schema', () => {
  it('should parse valid entry', () => {
    const result = JournalEntrySchema.parse({
      sequence: 0,
      timestamp: '2026-01-01T00:00:00Z',
      agent_id: 'agent-1',
      iteration: 0,
      event: { type: 'started', agent_id: 'agent-1', config: {} },
    });
    expect(result.sequence).toBe(0);
  });
});

describe('CedarPolicy schema', () => {
  it('should parse with defaults', () => {
    const result = CedarPolicySchema.parse({ name: 'deny-all', source: 'forbid(principal,action,resource);' });
    expect(result.active).toBe(true);
  });

  it('should parse with explicit active flag', () => {
    const result = CedarPolicySchema.parse({ name: 'p1', source: 'src', active: false });
    expect(result.active).toBe(false);
  });
});

describe('KnowledgeConfig schema', () => {
  it('should parse with defaults', () => {
    const result = KnowledgeConfigSchema.parse({});
    expect(result.max_context_items).toBe(5);
    expect(result.relevance_threshold).toBe(0.7);
    expect(result.auto_persist).toBe(false);
  });
});

describe('CircuitState schema', () => {
  it('should accept valid states', () => {
    expect(CircuitStateSchema.parse('closed')).toBe('closed');
    expect(CircuitStateSchema.parse('open')).toBe('open');
    expect(CircuitStateSchema.parse('half_open')).toBe('half_open');
  });

  it('should reject invalid state', () => {
    expect(() => CircuitStateSchema.parse('broken')).toThrow();
  });
});

describe('CircuitBreakerConfig schema', () => {
  it('should parse with defaults', () => {
    const result = CircuitBreakerConfigSchema.parse({});
    expect(result.failure_threshold).toBe(5);
    expect(result.recovery_timeout_ms).toBe(30000);
  });
});

describe('CircuitBreakerStatus schema', () => {
  it('should parse valid status', () => {
    const result = CircuitBreakerStatusSchema.parse({
      state: 'closed',
      failure_count: 0,
      success_count: 10,
      config: {},
    });
    expect(result.state).toBe('closed');
    expect(result.success_count).toBe(10);
  });
});

describe('RunReasoningLoopRequest schema', () => {
  it('should parse minimal request', () => {
    const result = RunReasoningLoopRequestSchema.parse({
      config: {},
      initial_message: 'Hello',
    });
    expect(result.initial_message).toBe('Hello');
    expect(result.config.max_iterations).toBe(10);
  });
});

describe('RunReasoningLoopResponse schema', () => {
  it('should parse valid response', () => {
    const result = RunReasoningLoopResponseSchema.parse({
      loop_id: 'loop-1',
      result: {
        output: 'Done',
        iterations: 2,
        total_usage: { prompt_tokens: 50, completion_tokens: 25, total_tokens: 75 },
        termination_reason: { type: 'completed' },
        duration_ms: 3000,
      },
    });
    expect(result.loop_id).toBe('loop-1');
    expect(result.journal_entries).toEqual([]);
  });
});

// =============================================================================
// ReasoningClient Method Tests
// =============================================================================

describe('ReasoningClient', () => {
  function makeMockClient(responseData: unknown = {}, status = 200) {
    const mockResponse = {
      ok: status >= 200 && status < 300,
      status,
      statusText: status === 200 ? 'OK' : 'Error',
      json: async () => responseData,
      text: async () => JSON.stringify(responseData),
    };

    const fetchCalls: { url: string; options: RequestInit }[] = [];

    const mockClient = {
      getAuthHeaders: async () => ({ Authorization: 'Bearer test' }),
      configuration: { runtimeApiUrl: 'http://localhost:8080' } as any,
    };

    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (url: string, opts: RequestInit) => {
      fetchCalls.push({ url, options: opts });
      return mockResponse;
    }) as any;

    const client = new ReasoningClient(mockClient);

    return {
      client,
      fetchCalls,
      restore: () => { globalThis.fetch = originalFetch; },
    };
  }

  it('runLoop should POST to correct endpoint', async () => {
    const responseData = {
      loop_id: 'loop-1',
      result: {
        output: 'Done',
        iterations: 1,
        total_usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
        termination_reason: { type: 'completed' },
        duration_ms: 1000,
      },
      journal_entries: [],
    };
    const { client, fetchCalls, restore } = makeMockClient(responseData);
    try {
      const result = await client.runLoop('agent-1', { config: {}, initial_message: 'hi' } as any);
      expect(result.loop_id).toBe('loop-1');
      expect(fetchCalls[0].url).toBe('http://localhost:8080/api/v1/agents/agent-1/reasoning/loop');
      expect(fetchCalls[0].options.method).toBe('POST');
    } finally {
      restore();
    }
  });

  it('getLoopStatus should GET correct endpoint', async () => {
    const { client, fetchCalls, restore } = makeMockClient({
      agent_id: 'agent-1',
      iteration: 2,
      total_usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      started_at: '2026-01-01T00:00:00Z',
      current_phase: 'tools',
    });
    try {
      await client.getLoopStatus('agent-1', 'loop-1');
      expect(fetchCalls[0].url).toBe('http://localhost:8080/api/v1/agents/agent-1/reasoning/loop/loop-1');
      expect(fetchCalls[0].options.method).toBe('GET');
    } finally {
      restore();
    }
  });

  it('listCedarPolicies should GET correct endpoint', async () => {
    const { client, fetchCalls, restore } = makeMockClient([]);
    try {
      await client.listCedarPolicies('agent-1');
      expect(fetchCalls[0].url).toBe('http://localhost:8080/api/v1/agents/agent-1/reasoning/cedar');
    } finally {
      restore();
    }
  });

  it('getCircuitBreakerStatus should GET correct endpoint', async () => {
    const { client, fetchCalls, restore } = makeMockClient({});
    try {
      await client.getCircuitBreakerStatus('agent-1');
      expect(fetchCalls[0].url).toBe('http://localhost:8080/api/v1/agents/agent-1/reasoning/circuit-breakers');
    } finally {
      restore();
    }
  });

  it('recallKnowledge should POST correct endpoint', async () => {
    const { client, fetchCalls, restore } = makeMockClient(['fact-1', 'fact-2']);
    try {
      const result = await client.recallKnowledge('agent-1', 'what is X?');
      expect(result).toEqual(['fact-1', 'fact-2']);
      expect(fetchCalls[0].url).toBe('http://localhost:8080/api/v1/agents/agent-1/reasoning/knowledge/recall');
    } finally {
      restore();
    }
  });

  it('storeKnowledge should POST correct endpoint', async () => {
    const { client, fetchCalls, restore } = makeMockClient({ id: 'k-1' });
    try {
      const result = await client.storeKnowledge('agent-1', 'X', 'is', 'Y');
      expect(result.id).toBe('k-1');
      expect(fetchCalls[0].url).toBe('http://localhost:8080/api/v1/agents/agent-1/reasoning/knowledge/store');
      const body = JSON.parse(fetchCalls[0].options.body as string);
      expect(body.subject).toBe('X');
      expect(body.confidence).toBe(0.8);
    } finally {
      restore();
    }
  });
});
