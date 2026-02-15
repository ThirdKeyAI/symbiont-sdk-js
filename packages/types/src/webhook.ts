import { z } from 'zod';

/**
 * Webhook verification types for the Symbiont SDK
 * Matches Symbiont Runtime v1.4.0 webhook_verify module
 */

// --- Enums ---

export const WebhookProviderType = {
  GITHUB: 'github',
  STRIPE: 'stripe',
  SLACK: 'slack',
  CUSTOM: 'custom',
} as const;

export type WebhookProviderType = typeof WebhookProviderType[keyof typeof WebhookProviderType];

// --- Interfaces ---

/** Webhook verification configuration. */
export interface WebhookVerificationConfig {
  provider: WebhookProviderType;
  secret: string;
  header_name?: string;
  required_issuer?: string;
}

/** Webhook provider preset with header name and optional prefix. */
export interface WebhookProviderPreset {
  header_name: string;
  prefix: string | null;
}

// --- Zod schemas ---

export const WebhookProviderTypeSchema = z.enum(['github', 'stripe', 'slack', 'custom']);

export const WebhookVerificationConfigSchema = z.object({
  provider: WebhookProviderTypeSchema,
  secret: z.string(),
  header_name: z.string().optional(),
  required_issuer: z.string().optional(),
});

export const WebhookProviderPresetSchema = z.object({
  header_name: z.string(),
  prefix: z.string().nullable(),
});
