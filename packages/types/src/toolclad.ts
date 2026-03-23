import { z } from 'zod';

// ---------------------------------------------------------------------------
// ToolClad types
// ---------------------------------------------------------------------------

export const ToolManifestInfoSchema = z.object({
  name: z.string(),
  version: z.string(),
  description: z.string(),
  riskTier: z.string(),
  humanApproval: z.boolean(),
  argCount: z.number(),
  backend: z.string(),
  sourcePath: z.string(),
});

export type ToolManifestInfo = z.infer<typeof ToolManifestInfoSchema>;

export const ToolValidationResultSchema = z.object({
  valid: z.boolean(),
  errors: z.array(z.string()),
  warnings: z.array(z.string()),
});

export type ToolValidationResult = z.infer<typeof ToolValidationResultSchema>;

export const ToolTestResultSchema = z.object({
  command: z.string(),
  validations: z.array(z.string()),
  cedar: z.string().optional(),
  timeout: z.number(),
});

export type ToolTestResult = z.infer<typeof ToolTestResultSchema>;

export const ToolExecutionResultSchema = z.object({
  status: z.string(),
  scanId: z.string(),
  tool: z.string(),
  command: z.string(),
  durationMs: z.number(),
  timestamp: z.string(),
  outputHash: z.string().optional(),
  exitCode: z.number(),
  stderr: z.string(),
  results: z.record(z.unknown()),
});

export type ToolExecutionResult = z.infer<typeof ToolExecutionResultSchema>;
