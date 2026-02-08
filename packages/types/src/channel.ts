import { z } from 'zod';

/**
 * Channel types for the Symbiont SDK
 * Matches Symbiont Runtime API v1.0.0 channel endpoints
 */

// --- Request / Response interfaces ---

/** Request to register a new channel adapter. */
export interface RegisterChannelRequest {
  name: string;
  platform: string;
  config: Record<string, unknown>;
}

/** Response after registering a channel. */
export interface RegisterChannelResponse {
  id: string;
  name: string;
  platform: string;
  status: string;
}

/** Request to update an existing channel. */
export interface UpdateChannelRequest {
  config?: Record<string, unknown>;
}

/** Summary of a channel adapter (list view). */
export interface ChannelSummary {
  id: string;
  name: string;
  platform: string;
  status: string;
}

/** Detailed channel adapter information. */
export interface ChannelDetail {
  id: string;
  name: string;
  platform: string;
  status: string;
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/** Generic action response for start/stop. */
export interface ChannelActionResponse {
  id: string;
  action: string;
  status: string;
}

/** Response for deleting a channel. */
export interface DeleteChannelResponse {
  id: string;
  deleted: boolean;
}

/** Channel health and connectivity info. */
export interface ChannelHealthResponse {
  id: string;
  connected: boolean;
  platform: string;
  workspace_name: string | null;
  channels_active: number;
  last_message_at: string | null;
  uptime_secs: number;
}

// --- Enterprise types ---

/** Identity mapping between a platform user and a Symbiont user. */
export interface IdentityMappingEntry {
  platform_user_id: string;
  platform: string;
  symbiont_user_id: string;
  email: string | null;
  display_name: string;
  roles: string[];
  verified: boolean;
  created_at: string;
}

/** Request to add an identity mapping. */
export interface AddIdentityMappingRequest {
  platform_user_id: string;
  symbiont_user_id: string;
  email?: string;
  display_name: string;
  roles: string[];
}

/** A single channel audit log entry. */
export interface ChannelAuditEntry {
  timestamp: string;
  event_type: string;
  user_id: string | null;
  channel_id: string | null;
  agent: string | null;
  details: Record<string, unknown>;
}

/** Response for channel audit log queries. */
export interface ChannelAuditResponse {
  channel_id: string;
  entries: ChannelAuditEntry[];
}

// --- Zod schemas ---

export const RegisterChannelRequestSchema = z.object({
  name: z.string(),
  platform: z.string(),
  config: z.record(z.unknown()),
});

export const RegisterChannelResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  platform: z.string(),
  status: z.string(),
});

export const UpdateChannelRequestSchema = z.object({
  config: z.record(z.unknown()).optional(),
});

export const ChannelSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  platform: z.string(),
  status: z.string(),
});

export const ChannelDetailSchema = z.object({
  id: z.string(),
  name: z.string(),
  platform: z.string(),
  status: z.string(),
  config: z.record(z.unknown()),
  created_at: z.string(),
  updated_at: z.string(),
});

export const ChannelActionResponseSchema = z.object({
  id: z.string(),
  action: z.string(),
  status: z.string(),
});

export const DeleteChannelResponseSchema = z.object({
  id: z.string(),
  deleted: z.boolean(),
});

export const ChannelHealthResponseSchema = z.object({
  id: z.string(),
  connected: z.boolean(),
  platform: z.string(),
  workspace_name: z.string().nullable(),
  channels_active: z.number(),
  last_message_at: z.string().nullable(),
  uptime_secs: z.number(),
});

export const IdentityMappingEntrySchema = z.object({
  platform_user_id: z.string(),
  platform: z.string(),
  symbiont_user_id: z.string(),
  email: z.string().nullable(),
  display_name: z.string(),
  roles: z.array(z.string()),
  verified: z.boolean(),
  created_at: z.string(),
});

export const AddIdentityMappingRequestSchema = z.object({
  platform_user_id: z.string(),
  symbiont_user_id: z.string(),
  email: z.string().optional(),
  display_name: z.string(),
  roles: z.array(z.string()),
});

export const ChannelAuditEntrySchema = z.object({
  timestamp: z.string(),
  event_type: z.string(),
  user_id: z.string().nullable(),
  channel_id: z.string().nullable(),
  agent: z.string().nullable(),
  details: z.record(z.unknown()),
});

export const ChannelAuditResponseSchema = z.object({
  channel_id: z.string(),
  entries: z.array(ChannelAuditEntrySchema),
});
