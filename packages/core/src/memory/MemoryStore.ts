/**
 * Abstract base class for memory storage backends
 */

import {
  MemoryNode,
  MemoryLevel,
  MemorySearchQuery,
  MemorySearchResult,
  MemoryStats,
  MemoryStore as IMemoryStore,
  MemoryStoreConfig
} from '@symbiont/types';

/**
 * Abstract memory store implementation
 */
export abstract class MemoryStore implements IMemoryStore {
  protected config: MemoryStoreConfig = {};

  constructor(config?: MemoryStoreConfig) {
    this.config = config || {};
  }

  /**
   * Store a memory node
   */
  abstract store(memory: MemoryNode): Promise<void>;

  /**
   * Retrieve a memory by ID
   */
  abstract get(id: string): Promise<MemoryNode | null>;

  /**
   * Search for memories matching criteria
   */
  abstract search(query: MemorySearchQuery): Promise<MemorySearchResult>;

  /**
   * Update an existing memory
   */
  abstract update(id: string, updates: Partial<MemoryNode>): Promise<boolean>;

  /**
   * Delete a memory by ID
   */
  abstract delete(id: string): Promise<boolean>;

  /**
   * Get all memories for a specific level
   */
  abstract getByLevel(level: MemoryLevel): Promise<MemoryNode[]>;

  /**
   * Clear all memories (optionally for a specific level)
   */
  abstract clear(level?: MemoryLevel): Promise<void>;

  /**
   * Get memory statistics
   */
  abstract getStats(): Promise<MemoryStats>;

  /**
   * Clean up expired memories
   */
  abstract cleanup(): Promise<number>;

  /**
   * Helper method to check if a memory matches search criteria
   */
  protected matchesQuery(memory: MemoryNode, query: MemorySearchQuery): boolean {
    // Level filter
    if (query.level && memory.level !== query.level) {
      return false;
    }

    // Importance filter
    if (query.minImportance !== undefined && memory.importance < query.minImportance) {
      return false;
    }

    // Tags filter
    if (query.tags && query.tags.length > 0) {
      if (!memory.tags || !query.tags.some((tag: string) => memory.tags?.includes(tag))) {
        return false;
      }
    }

    // Time range filter
    if (query.timeRange) {
      const timestamp = memory.timestamp instanceof Date ? memory.timestamp : new Date(memory.timestamp);
      if (query.timeRange.start && timestamp < query.timeRange.start) {
        return false;
      }
      if (query.timeRange.end && timestamp > query.timeRange.end) {
        return false;
      }
    }

    // Metadata filter
    if (query.metadata) {
      for (const [key, value] of Object.entries(query.metadata)) {
        if (!memory.metadata || memory.metadata[key] !== value) {
          return false;
        }
      }
    }

    // Text query filter
    if (query.query) {
      const searchText = query.query.toLowerCase();
      const contentStr = JSON.stringify(memory.content).toLowerCase();
      const tagsStr = memory.tags ? memory.tags.join(' ').toLowerCase() : '';
      
      if (!contentStr.includes(searchText) && !tagsStr.includes(searchText)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Helper method to check if a memory is expired
   */
  protected isExpired(memory: MemoryNode): boolean {
    if (!memory.expiresAt) {
      return false;
    }
    const expiresAt = memory.expiresAt instanceof Date ? memory.expiresAt : new Date(memory.expiresAt);
    return expiresAt < new Date();
  }

  /**
   * Helper method to increment access count and update timestamp
   */
  protected recordAccess(memory: MemoryNode): MemoryNode {
    return {
      ...memory,
      accessCount: memory.accessCount + 1,
      timestamp: new Date()
    };
  }
}