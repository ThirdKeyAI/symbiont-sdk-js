import { z } from 'zod';

/**
 * Skills scanning and loading types for the Symbiont SDK
 * Matches Symbiont Runtime v1.4.0 skills module
 */

// --- Enums ---

export const SignatureStatusType = {
  VERIFIED: 'verified',
  PINNED: 'pinned',
  UNSIGNED: 'unsigned',
  INVALID: 'invalid',
  REVOKED: 'revoked',
} as const;

export type SignatureStatusType = typeof SignatureStatusType[keyof typeof SignatureStatusType];

export const ScanSeverityType = {
  CRITICAL: 'critical',
  WARNING: 'warning',
  INFO: 'info',
} as const;

export type ScanSeverityType = typeof ScanSeverityType[keyof typeof ScanSeverityType];

// --- Interfaces ---

/** Individual scan finding from skill scanning. */
export interface ScanFinding {
  rule: string;
  severity: ScanSeverityType;
  message: string;
  line?: number;
  file?: string;
}

/** Result of scanning a skill. */
export interface ScanResult {
  passed: boolean;
  findings: ScanFinding[];
}

/** Skill metadata from YAML frontmatter. */
export interface SkillMetadata {
  name: string;
  description?: string;
  raw_frontmatter: Record<string, unknown>;
}

/** A loaded skill with content and scan results. */
export interface LoadedSkill {
  name: string;
  path: string;
  signature_status: SignatureStatusType;
  content: string;
  metadata?: SkillMetadata;
  scan_result?: ScanResult;
}

/** Scan rule definition. */
export interface ScanRule {
  name: string;
  pattern: string;
  severity: ScanSeverityType;
  message: string;
}

/** Skills loader configuration. */
export interface SkillLoaderConfig {
  load_paths: string[];
  require_signed?: boolean;
  allow_unsigned_from?: string[];
  auto_pin?: boolean;
  scan_enabled?: boolean;
  custom_deny_patterns?: string[];
}

/** Skills configuration for API serialization. */
export interface SkillsConfig {
  load_paths: string[];
  require_signed: boolean;
  allow_unsigned_from: string[];
  auto_pin: boolean;
  scan_enabled: boolean;
  custom_deny_patterns: string[];
}

// --- Zod schemas ---

export const SignatureStatusTypeSchema = z.enum(['verified', 'pinned', 'unsigned', 'invalid', 'revoked']);
export const ScanSeverityTypeSchema = z.enum(['critical', 'warning', 'info']);

export const ScanFindingSchema = z.object({
  rule: z.string(),
  severity: ScanSeverityTypeSchema,
  message: z.string(),
  line: z.number().optional(),
  file: z.string().optional(),
});

export const ScanResultSchema = z.object({
  passed: z.boolean(),
  findings: z.array(ScanFindingSchema),
});

export const SkillMetadataSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  raw_frontmatter: z.record(z.unknown()),
});

export const LoadedSkillSchema = z.object({
  name: z.string(),
  path: z.string(),
  signature_status: SignatureStatusTypeSchema,
  content: z.string(),
  metadata: SkillMetadataSchema.optional(),
  scan_result: ScanResultSchema.optional(),
});

export const ScanRuleSchema = z.object({
  name: z.string(),
  pattern: z.string(),
  severity: ScanSeverityTypeSchema,
  message: z.string(),
});

export const SkillLoaderConfigSchema = z.object({
  load_paths: z.array(z.string()),
  require_signed: z.boolean().optional(),
  allow_unsigned_from: z.array(z.string()).optional(),
  auto_pin: z.boolean().optional(),
  scan_enabled: z.boolean().optional(),
  custom_deny_patterns: z.array(z.string()).optional(),
});

export const SkillsConfigSchema = z.object({
  load_paths: z.array(z.string()),
  require_signed: z.boolean(),
  allow_unsigned_from: z.array(z.string()),
  auto_pin: z.boolean(),
  scan_enabled: z.boolean(),
  custom_deny_patterns: z.array(z.string()),
});
