import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  FileMetricsExporter,
  CompositeExporter,
  MetricsCollector,
  MetricsExportError,
  MetricsApiClient,
} from '../MetricsClient';
import type { FileExporterConfig, MetricsSnapshotData, MetricsExporter } from '../MetricsClient';

function makeSnapshot(overrides: Partial<MetricsSnapshotData> = {}): MetricsSnapshotData {
  return {
    timestamp: '2026-02-15T12:00:00Z',
    scheduler: { jobs_total: 5, jobs_active: 2, jobs_paused: 0, runs_total: 100, runs_succeeded: 95, runs_failed: 5 },
    system: { cpu_usage_percent: 42.5, memory_usage_bytes: 1024, memory_usage_percent: 50, disk_usage_bytes: 0, disk_usage_percent: 0 },
    ...overrides,
  };
}

describe('FileMetricsExporter', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'metrics-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should write and read back JSON', () => {
    const outPath = path.join(tmpDir, 'metrics.json');
    const exporter = new FileMetricsExporter({ path: outPath });
    exporter.export(makeSnapshot());

    const data = JSON.parse(fs.readFileSync(outPath, 'utf-8'));
    expect(data.timestamp).toBe('2026-02-15T12:00:00Z');
    expect(data.scheduler.jobs_total).toBe(5);
  });

  it('should create parent directories', () => {
    const outPath = path.join(tmpDir, 'sub', 'dir', 'metrics.json');
    const exporter = new FileMetricsExporter({ path: outPath });
    exporter.export(makeSnapshot());
    expect(fs.existsSync(outPath)).toBe(true);
  });

  it('should write compact JSON', () => {
    const outPath = path.join(tmpDir, 'compact.json');
    const exporter = new FileMetricsExporter({ path: outPath, compact: true });
    exporter.export(makeSnapshot());

    const text = fs.readFileSync(outPath, 'utf-8');
    expect(text).not.toContain('  '); // no indentation
  });

  it('should not throw on shutdown', () => {
    const exporter = new FileMetricsExporter({ path: path.join(tmpDir, 'x.json') });
    expect(() => exporter.shutdown()).not.toThrow();
  });

  it('should overwrite previous file', () => {
    const outPath = path.join(tmpDir, 'metrics.json');
    const exporter = new FileMetricsExporter({ path: outPath });

    exporter.export(makeSnapshot({ scheduler: { jobs_total: 1, jobs_active: 0, jobs_paused: 0, runs_total: 0, runs_succeeded: 0, runs_failed: 0 } }));
    exporter.export(makeSnapshot({ scheduler: { jobs_total: 99, jobs_active: 0, jobs_paused: 0, runs_total: 0, runs_succeeded: 0, runs_failed: 0 } }));

    const data = JSON.parse(fs.readFileSync(outPath, 'utf-8'));
    expect(data.scheduler.jobs_total).toBe(99);
  });
});

describe('CompositeExporter', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'metrics-comp-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should delegate to multiple exporters', () => {
    const p1 = path.join(tmpDir, 'a.json');
    const p2 = path.join(tmpDir, 'b.json');
    const composite = new CompositeExporter([
      new FileMetricsExporter({ path: p1 }),
      new FileMetricsExporter({ path: p2 }),
    ]);

    composite.export(makeSnapshot());
    composite.shutdown();

    expect(fs.existsSync(p1)).toBe(true);
    expect(fs.existsSync(p2)).toBe(true);
  });

  it('should throw when all exporters fail', () => {
    const failExporter: MetricsExporter = {
      export: () => {
        throw new MetricsExportError('boom', 'fail');
      },
      shutdown: () => {},
    };
    const composite = new CompositeExporter([failExporter, failExporter]);
    expect(() => composite.export(makeSnapshot())).toThrow('All exporters failed');
  });
});

describe('MetricsCollector', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'metrics-coll-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should start and stop, producing output', async () => {
    const outPath = path.join(tmpDir, 'collector.json');
    const exporter = new FileMetricsExporter({ path: outPath });
    const collector = new MetricsCollector(exporter, 1);

    collector.start();
    await new Promise((r) => setTimeout(r, 100));
    collector.stop();

    expect(fs.existsSync(outPath)).toBe(true);
  });
});

describe('MetricsApiClient', () => {
  it('should call the correct endpoint', async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({ timestamp: '2026-02-15T12:00:00Z' }),
      text: async () => '',
    };

    const mockClient = {
      getAuthHeaders: async () => ({ Authorization: 'Bearer test' }),
      configuration: { runtimeApiUrl: 'http://localhost:8080' } as any,
    };

    // We test through the class
    const client = new MetricsApiClient(mockClient);

    // Mock fetch globally
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => mockResponse) as any;
    try {
      const result = await client.getMetricsSnapshot();
      expect(result).toEqual({ timestamp: '2026-02-15T12:00:00Z' });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
