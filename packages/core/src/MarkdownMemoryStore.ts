import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

/**
 * Storage statistics for the markdown memory store.
 */
export interface StorageStats {
  total_contexts: number;
  total_size_bytes: number;
  last_cleanup: string | null;
  storage_path: string;
}

/**
 * Agent memory context with categorized information.
 */
export interface AgentMemoryContext {
  agent_id: string;
  facts: string[];
  procedures: string[];
  learned_patterns: string[];
  metadata: Record<string, string>;
}

/**
 * File-based memory store using markdown format.
 *
 * Layout:
 *   {rootDir}/{agentId}/memory.md       — current context
 *   {rootDir}/{agentId}/logs/YYYY-MM-DD.md — daily interaction logs
 */
export class MarkdownMemoryStore {
  private rootDir: string;
  private retentionDays: number;

  constructor(rootDir: string, retentionDays = 30) {
    this.rootDir = rootDir;
    this.retentionDays = retentionDays;
    fs.mkdirSync(rootDir, { recursive: true });
  }

  private agentDir(agentId: string): string {
    return path.join(this.rootDir, agentId);
  }

  private memoryPath(agentId: string): string {
    return path.join(this.agentDir(agentId), 'memory.md');
  }

  private logsDir(agentId: string): string {
    return path.join(this.agentDir(agentId), 'logs');
  }

  /**
   * Render a context to markdown format.
   */
  static renderMarkdown(context: AgentMemoryContext): string {
    const lines: string[] = [`# Agent Memory: ${context.agent_id}`, ''];

    lines.push('## Facts');
    for (const item of context.facts) {
      lines.push(`- ${item}`);
    }
    lines.push('');

    lines.push('## Procedures');
    for (const item of context.procedures) {
      lines.push(`- ${item}`);
    }
    lines.push('');

    lines.push('## Learned Patterns');
    for (const item of context.learned_patterns) {
      lines.push(`- ${item}`);
    }
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Parse markdown text into an AgentMemoryContext.
   */
  static parseMarkdown(text: string, agentId: string): AgentMemoryContext {
    const ctx: AgentMemoryContext = {
      agent_id: agentId,
      facts: [],
      procedures: [],
      learned_patterns: [],
      metadata: {},
    };

    const sectionMap: Record<string, keyof Pick<AgentMemoryContext, 'facts' | 'procedures' | 'learned_patterns'>> = {
      facts: 'facts',
      procedures: 'procedures',
      'learned patterns': 'learned_patterns',
    };

    let currentSection: string | null = null;

    for (const line of text.split('\n')) {
      const stripped = line.trim();
      if (stripped.startsWith('## ')) {
        const header = stripped.slice(3).trim().toLowerCase();
        currentSection = sectionMap[header] || null;
      } else if (stripped.startsWith('- ') && currentSection) {
        (ctx[currentSection] as string[]).push(stripped.slice(2));
      }
    }

    return ctx;
  }

  /**
   * Save agent context atomically and append a daily log entry.
   */
  saveContext(agentId: string, context: AgentMemoryContext): void {
    const agentDir = this.agentDir(agentId);
    fs.mkdirSync(agentDir, { recursive: true });

    const mdContent = MarkdownMemoryStore.renderMarkdown(context);

    // Atomic write via temp file + rename
    const tmpPath = path.join(agentDir, `.memory_${Date.now()}.md`);
    fs.writeFileSync(tmpPath, mdContent, 'utf-8');
    fs.renameSync(tmpPath, this.memoryPath(agentId));

    // Append daily log
    this.appendDailyLog(agentId, context);
  }

  private appendDailyLog(agentId: string, context: AgentMemoryContext): void {
    const logsDir = this.logsDir(agentId);
    fs.mkdirSync(logsDir, { recursive: true });

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const timeStr = now.toISOString().slice(11, 19);
    const logPath = path.join(logsDir, `${dateStr}.md`);

    const entry = [
      `### Update at ${timeStr}`,
      `- Facts: ${context.facts.length}`,
      `- Procedures: ${context.procedures.length}`,
      `- Learned Patterns: ${context.learned_patterns.length}`,
      '',
    ].join('\n');

    fs.appendFileSync(logPath, entry, 'utf-8');
  }

  /**
   * Load agent context from markdown file. Returns null if not found.
   */
  loadContext(agentId: string): AgentMemoryContext | null {
    const memPath = this.memoryPath(agentId);
    if (!fs.existsSync(memPath)) {
      return null;
    }

    const text = fs.readFileSync(memPath, 'utf-8');
    return MarkdownMemoryStore.parseMarkdown(text, agentId);
  }

  /**
   * Delete all stored data for an agent.
   */
  deleteContext(agentId: string): void {
    const agentDir = this.agentDir(agentId);
    if (fs.existsSync(agentDir)) {
      fs.rmSync(agentDir, { recursive: true, force: true });
    }
  }

  /**
   * List agent IDs that have stored contexts.
   */
  listAgentContexts(): string[] {
    if (!fs.existsSync(this.rootDir)) {
      return [];
    }

    return fs
      .readdirSync(this.rootDir)
      .filter((entry) => {
        const entryPath = path.join(this.rootDir, entry);
        return fs.statSync(entryPath).isDirectory();
      })
      .sort();
  }

  /**
   * Remove log files older than the retention period.
   */
  compact(agentId: string): void {
    const logsDir = this.logsDir(agentId);
    if (!fs.existsSync(logsDir)) {
      return;
    }

    const cutoff = Date.now() - this.retentionDays * 86400 * 1000;

    for (const filename of fs.readdirSync(logsDir)) {
      const filePath = path.join(logsDir, filename);
      const stat = fs.statSync(filePath);
      if (stat.isFile() && stat.mtimeMs < cutoff) {
        fs.unlinkSync(filePath);
      }
    }
  }

  /**
   * Get storage statistics across all agents.
   */
  getStorageStats(): StorageStats {
    const contexts = this.listAgentContexts();
    let totalSize = 0;

    const walkDir = (dir: string): void => {
      if (!fs.existsSync(dir)) return;
      for (const entry of fs.readdirSync(dir)) {
        const entryPath = path.join(dir, entry);
        const stat = fs.statSync(entryPath);
        if (stat.isDirectory()) {
          walkDir(entryPath);
        } else {
          totalSize += stat.size;
        }
      }
    };

    walkDir(this.rootDir);

    return {
      total_contexts: contexts.length,
      total_size_bytes: totalSize,
      last_cleanup: null,
      storage_path: this.rootDir,
    };
  }
}
