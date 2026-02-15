import * as fs from 'fs';
import * as path from 'path';
import type { ScanFinding, ScanResult, ScanRule, SkillMetadata, LoadedSkill, SkillLoaderConfig } from '@symbiont/types';
import { ScanSeverityType, SignatureStatusType } from '@symbiont/types';

// Re-export types for convenience
export type { ScanFinding, ScanResult, ScanRule, SkillMetadata, LoadedSkill, SkillLoaderConfig };

/**
 * Default ClawHavoc security scanning rules.
 */
const DEFAULT_RULES: ScanRule[] = [
  {
    name: 'pipe-to-shell',
    pattern: 'curl\\s.*\\|\\s*(sh|bash|zsh)',
    severity: ScanSeverityType.CRITICAL,
    message: 'Pipe to shell detected: remote code execution risk',
  },
  {
    name: 'wget-pipe-to-shell',
    pattern: 'wget\\s.*\\|\\s*(sh|bash|zsh)',
    severity: ScanSeverityType.CRITICAL,
    message: 'Wget pipe to shell detected: remote code execution risk',
  },
  {
    name: 'env-file-reference',
    pattern: '\\.(env|ENV)\\b',
    severity: ScanSeverityType.WARNING,
    message: 'Environment file reference detected: potential secret exposure',
  },
  {
    name: 'soul-md-modification',
    pattern: '(write|modify|overwrite|replace).*SOUL\\.md',
    severity: ScanSeverityType.CRITICAL,
    message: 'SOUL.md modification detected: agent identity tampering',
  },
  {
    name: 'memory-md-modification',
    pattern: '(write|modify|overwrite|replace).*memory\\.md',
    severity: ScanSeverityType.WARNING,
    message: 'memory.md modification detected: memory tampering risk',
  },
  {
    name: 'eval-with-fetch',
    pattern: 'eval\\s*\\(.*fetch',
    severity: ScanSeverityType.CRITICAL,
    message: 'Eval with fetch detected: remote code execution risk',
  },
  {
    name: 'fetch-with-eval',
    pattern: 'fetch\\s*\\(.*\\.then.*eval',
    severity: ScanSeverityType.CRITICAL,
    message: 'Fetch-then-eval pattern detected: remote code execution risk',
  },
  {
    name: 'base64-decode-exec',
    pattern: '(base64.*decode|atob)\\s*\\(.*\\)\\s*.*exec',
    severity: ScanSeverityType.CRITICAL,
    message: 'Base64 decode with exec detected: obfuscated code execution',
  },
  {
    name: 'rm-rf-pattern',
    pattern: 'rm\\s+-rf\\s+/',
    severity: ScanSeverityType.CRITICAL,
    message: 'Recursive force delete from root detected: destructive operation',
  },
  {
    name: 'chmod-777',
    pattern: 'chmod\\s+777',
    severity: ScanSeverityType.WARNING,
    message: 'chmod 777 detected: overly permissive file permissions',
  },
];

/**
 * Scans skill content for security issues using ClawHavoc rules.
 */
export class SkillScanner {
  private rules: ScanRule[];

  constructor(customRules?: ScanRule[]) {
    this.rules = [...DEFAULT_RULES];
    if (customRules) {
      this.rules.push(...customRules);
    }
  }

  /**
   * Scan text content line-by-line against all rules.
   */
  scanContent(content: string, fileName?: string): ScanFinding[] {
    const findings: ScanFinding[] = [];
    const lines = content.split('\n');

    for (let lineNum = 0; lineNum < lines.length; lineNum++) {
      const line = lines[lineNum];
      for (const rule of this.rules) {
        const regex = new RegExp(rule.pattern);
        if (regex.test(line)) {
          findings.push({
            rule: rule.name,
            severity: rule.severity,
            message: rule.message,
            line: lineNum + 1,
            file: fileName,
          });
        }
      }
    }

    return findings;
  }

  /**
   * Walk a skill directory and scan all text files.
   */
  scanSkill(skillDir: string): ScanResult {
    const allFindings: ScanFinding[] = [];
    const textExtensions = new Set([
      '.md', '.txt', '.py', '.js', '.ts', '.sh',
      '.yaml', '.yml', '.json', '.toml',
    ]);

    const walkDir = (dir: string): void => {
      if (!fs.existsSync(dir)) return;
      for (const entry of fs.readdirSync(dir)) {
        const entryPath = path.join(dir, entry);
        const stat = fs.statSync(entryPath);
        if (stat.isDirectory()) {
          walkDir(entryPath);
        } else {
          const ext = path.extname(entry).toLowerCase();
          if (textExtensions.has(ext)) {
            try {
              const content = fs.readFileSync(entryPath, 'utf-8');
              const findings = this.scanContent(content, entry);
              allFindings.push(...findings);
            } catch {
              // Skip unreadable files
            }
          }
        }
      }
    };

    walkDir(skillDir);

    const hasCritical = allFindings.some(
      (f) => f.severity === ScanSeverityType.CRITICAL
    );

    return { passed: !hasCritical, findings: allFindings };
  }
}

/**
 * Parse YAML frontmatter between --- delimiters.
 * Uses simple key: value parsing (no full YAML dependency).
 */
function parseFrontmatter(content: string): Record<string, unknown> | null {
  if (!content.startsWith('---')) {
    return null;
  }

  const endIdx = content.indexOf('---', 3);
  if (endIdx === -1) {
    return null;
  }

  const fmText = content.slice(3, endIdx).trim();
  if (!fmText) {
    return null;
  }

  // Simple YAML-like parsing for key: value pairs
  const result: Record<string, unknown> = {};
  for (const line of fmText.split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx > 0) {
      const key = line.slice(0, colonIdx).trim();
      let value: string | unknown = line.slice(colonIdx + 1).trim();
      // Strip quotes
      if (
        typeof value === 'string' &&
        value.length >= 2 &&
        ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'")))
      ) {
        value = value.slice(1, -1);
      }
      result[key] = value;
    }
  }

  return result;
}

/**
 * Loads skills from configured paths with optional scanning and verification.
 */
export class SkillLoader {
  private config: SkillLoaderConfig;
  private scanner: SkillScanner;

  constructor(config: SkillLoaderConfig) {
    this.config = config;
    const customRules: ScanRule[] = (config.custom_deny_patterns || []).map(
      (pattern, i) => ({
        name: `custom-deny-${i}`,
        pattern,
        severity: ScanSeverityType.CRITICAL as const,
        message: `Custom deny pattern matched: ${pattern}`,
      })
    );
    this.scanner = new SkillScanner(customRules.length > 0 ? customRules : undefined);
  }

  /**
   * Discover and load all skills from configured paths.
   */
  loadAll(): LoadedSkill[] {
    const skills: LoadedSkill[] = [];

    for (const basePath of this.config.load_paths) {
      if (!fs.existsSync(basePath) || !fs.statSync(basePath).isDirectory()) {
        continue;
      }

      for (const entry of fs.readdirSync(basePath).sort()) {
        const skillDir = path.join(basePath, entry);
        const skillMd = path.join(skillDir, 'SKILL.md');
        if (fs.statSync(skillDir).isDirectory() && fs.existsSync(skillMd)) {
          try {
            skills.push(this.loadSkill(skillDir));
          } catch {
            // Skip skills that fail to load
          }
        }
      }
    }

    return skills;
  }

  /**
   * Load a single skill from a directory containing SKILL.md.
   */
  loadSkill(skillPath: string): LoadedSkill {
    const skillMd = path.join(skillPath, 'SKILL.md');
    if (!fs.existsSync(skillMd)) {
      throw new Error(`SKILL.md not found in ${skillPath}`);
    }

    const content = fs.readFileSync(skillMd, 'utf-8');

    // Parse frontmatter for metadata
    let metadata: SkillMetadata | undefined;
    const fm = parseFrontmatter(content);
    if (fm) {
      metadata = {
        name: (fm.name as string) || path.basename(skillPath),
        description: fm.description as string | undefined,
        raw_frontmatter: fm,
      };
    }

    const name = metadata?.name || path.basename(skillPath);

    // Determine signature status
    const sigPath = path.join(skillPath, '.schemapin.sig');
    const signatureStatus = fs.existsSync(sigPath)
      ? SignatureStatusType.PINNED
      : SignatureStatusType.UNSIGNED;

    // Scan if enabled
    let scanResult: ScanResult | undefined;
    if (this.config.scan_enabled !== false) {
      scanResult = this.scanner.scanSkill(skillPath);
    }

    return {
      name,
      path: skillPath,
      signature_status: signatureStatus,
      content,
      metadata,
      scan_result: scanResult,
    };
  }
}
