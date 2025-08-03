/**
 * @symbiont/core - Core Symbiont SDK functionality and SymbiontClient
 */

// Re-export types from @symbiont/types for convenience
export * from '@symbiont/types';

// Export main client
export { SymbiontClient } from './client';

// Export authentication utilities
export { AuthenticationManager, MemoryTokenCache } from './auth';

// Default export is the main client
export { SymbiontClient as default } from './client';