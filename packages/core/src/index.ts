/**
 * @symbiont/core - Core Symbiont SDK functionality and SymbiontClient
 */

// Re-export types from @symbiont/types for convenience
export * from '@symbiont/types';

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

// Default export is the main client
export { SymbiontClient as default } from './client';