/**
 * Memory system exports
 */

// Core classes
export { MemoryStore } from './MemoryStore';
export { InMemoryStore } from './InMemoryStore';
export { HierarchicalMemory } from './HierarchicalMemory';
export { MemoryManager, type MemoryManagerConfig } from './MemoryManager';

// Re-export types from @symbiont/types for convenience
export {
  MemoryLevel,
  MemoryNode,
  MemorySearchQuery,
  MemorySearchResult,
  MemoryStats,
  MemoryStoreConfig,
  MemoryStore as IMemoryStore,
  MemoryManager as IMemoryManager,
  MemoryEvents
} from '@symbiont/types';