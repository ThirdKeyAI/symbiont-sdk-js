/**
 * @symbi/core - Core Symbiont SDK functionality and SymbiontClient
 */

// Re-export types from @symbi/types for convenience
export * from '@symbi/types';

// Export main client
export { SymbiontClient } from './client';

// Export authentication utilities
export { AuthenticationManager, MemoryTokenCache } from './auth';

// Export memory system implementations
export {
  MemoryStore,
  InMemoryStore,
  HierarchicalMemory,
  MemoryManager,
  MemoryManagerConfig
} from './memory';

// Export vector system implementations
export * from './vector';

// Export HTTP endpoint management
export { HttpEndpointManager } from './http';
export { EndpointMetrics as EndpointMetricsClass } from './http';

// Export system client
export { SystemClient } from './SystemClient';

// Export markdown memory store
export { MarkdownMemoryStore } from './MarkdownMemoryStore';
export type { AgentMemoryContext, StorageStats } from './MarkdownMemoryStore';

// Export webhook verification
export {
  HmacVerifier,
  JwtVerifier,
  WebhookVerificationError,
  WebhookProviderPresets,
  createProviderVerifier,
} from './WebhookVerifier';
export type { SignatureVerifier, WebhookProviderName } from './WebhookVerifier';

// Export skill scanning and loading
export { SkillScanner, SkillLoader } from './SkillScanner';

// Export metrics
export {
  FileMetricsExporter,
  CompositeExporter,
  MetricsCollector,
  MetricsApiClient,
  MetricsExportError,
} from './MetricsClient';
export type { MetricsExporter, MetricsSnapshotData, FileExporterConfig } from './MetricsClient';

// Default export is the main client
export { SymbiontClient as default } from './client';