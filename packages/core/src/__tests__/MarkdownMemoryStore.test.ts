import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  MarkdownMemoryStore,
  AgentMemoryContext,
} from '../MarkdownMemoryStore';

describe('MarkdownMemoryStore', () => {
  let tmpDir: string;
  let store: MarkdownMemoryStore;

  const sampleContext: AgentMemoryContext = {
    agent_id: 'agent-1',
    facts: ['The sky is blue', 'Water is wet'],
    procedures: ['Greet the user first', 'Check permissions before acting'],
    learned_patterns: ['Users prefer short answers'],
    metadata: {},
  };

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdmem-'));
    store = new MarkdownMemoryStore(tmpDir, 30);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should roundtrip save and load a context', () => {
    store.saveContext('agent-1', sampleContext);
    const loaded = store.loadContext('agent-1');

    expect(loaded).not.toBeNull();
    expect(loaded!.agent_id).toBe('agent-1');
    expect(loaded!.facts).toEqual(sampleContext.facts);
    expect(loaded!.procedures).toEqual(sampleContext.procedures);
    expect(loaded!.learned_patterns).toEqual(sampleContext.learned_patterns);
  });

  it('should return null for a missing agent', () => {
    expect(store.loadContext('no-such-agent')).toBeNull();
  });

  it('should delete context', () => {
    store.saveContext('agent-1', sampleContext);
    store.deleteContext('agent-1');
    expect(store.loadContext('agent-1')).toBeNull();
  });

  it('should list agent contexts sorted', () => {
    store.saveContext('beta', sampleContext);
    store.saveContext('alpha', sampleContext);
    expect(store.listAgentContexts()).toEqual(['alpha', 'beta']);
  });

  it('should create a daily log file', () => {
    store.saveContext('agent-1', sampleContext);
    const logsDir = path.join(tmpDir, 'agent-1', 'logs');
    const logFiles = fs.readdirSync(logsDir);
    expect(logFiles.length).toBe(1);
    expect(logFiles[0]).toMatch(/\.md$/);
  });

  it('should return storage stats', () => {
    store.saveContext('a1', sampleContext);
    store.saveContext('a2', sampleContext);
    const stats = store.getStorageStats();

    expect(stats.total_contexts).toBe(2);
    expect(stats.total_size_bytes).toBeGreaterThan(0);
    expect(stats.storage_path).toBe(tmpDir);
  });

  it('should write valid markdown format', () => {
    store.saveContext('agent-1', sampleContext);
    const memPath = path.join(tmpDir, 'agent-1', 'memory.md');
    const text = fs.readFileSync(memPath, 'utf-8');

    expect(text).toContain('## Facts');
    expect(text).toContain('## Procedures');
    expect(text).toContain('## Learned Patterns');
    expect(text).toContain('- The sky is blue');
  });

  it('should compact old log files', () => {
    store.saveContext('agent-1', sampleContext);
    const logsDir = path.join(tmpDir, 'agent-1', 'logs');

    // Create an artificially old log
    const oldLog = path.join(logsDir, '2020-01-01.md');
    fs.writeFileSync(oldLog, 'old log');
    // Set mtime far in the past
    const oldTime = new Date('2020-01-01');
    fs.utimesSync(oldLog, oldTime, oldTime);

    store.compact('agent-1');

    const remaining = fs.readdirSync(logsDir);
    expect(remaining).not.toContain('2020-01-01.md');
    expect(remaining.length).toBe(1); // today's log
  });
});
