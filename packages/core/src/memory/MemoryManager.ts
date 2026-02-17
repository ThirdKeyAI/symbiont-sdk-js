/**
 * Main memory management interface implementation
 */

import { EventEmitter } from 'events';
import { 
  MemoryNode, 
  MemoryLevel, 
  MemorySearchQuery, 
  MemorySearchResult, 
  MemoryStats,
  MemoryManager as IMemoryManager,
  MemoryStore as IMemoryStore,
  MemoryStoreConfig
} from '@symbi/types';
import { HierarchicalMemory } from './HierarchicalMemory';
import { InMemoryStore } from './InMemoryStore';

/**
 * Configuration for the Memory Manager
 */
export interface MemoryManagerConfig {
  store?: IMemoryStore;
  storeConfig?: MemoryStoreConfig;
  hierarchicalConfig?: {
    levelConfigs?: Record<string, unknown>;
    autoConsolidation?: boolean;
    consolidationInterval?: number;
  };
}

/**
 * Main memory manager implementation
 */
export class MemoryManager extends EventEmitter implements IMemoryManager {
  private hierarchicalMemory: HierarchicalMemory;
  private memoryStore: IMemoryStore;

  constructor(config?: MemoryManagerConfig) {
    super();
    
    // Initialize store
    this.memoryStore = config?.store || new InMemoryStore(config?.storeConfig);
    
    // Initialize hierarchical memory
    this.hierarchicalMemory = new HierarchicalMemory(
      this.memoryStore,
      config?.hierarchicalConfig
    );

    // Forward events from hierarchical memory
    this.hierarchicalMemory.on('memory:stored', (data) => this.emit('memory:stored', data));
    this.hierarchicalMemory.on('memory:retrieved', (data) => this.emit('memory:retrieved', data));
    this.hierarchicalMemory.on('memory:updated', (data) => this.emit('memory:updated', data));
    this.hierarchicalMemory.on('memory:deleted', (data) => this.emit('memory:deleted', data));
    this.hierarchicalMemory.on('memory:consolidated', (data) => this.emit('memory:consolidated', data));
    this.hierarchicalMemory.on('memory:cleaned', (data) => this.emit('memory:cleaned', data));
  }

  /**
   * Store a new memory
   */
  async store(
    content: unknown,
    level: MemoryLevel,
    options?: {
      importance?: number;
      tags?: string[];
      metadata?: Record<string, unknown>;
      expiresAt?: Date;
    }
  ): Promise<string> {
    return await this.hierarchicalMemory.store(content, level, options);
  }

  /**
   * Retrieve a memory by ID
   */
  async get(id: string): Promise<MemoryNode | null> {
    return await this.hierarchicalMemory.get(id);
  }

  /**
   * Search memories
   */
  async search(query: MemorySearchQuery): Promise<MemorySearchResult> {
    return await this.hierarchicalMemory.search(query);
  }

  /**
   * Update memory importance
   */
  async updateImportance(id: string, importance: number): Promise<boolean> {
    return await this.hierarchicalMemory.updateImportance(id, importance);
  }

  /**
   * Add tags to a memory
   */
  async addTags(id: string, tags: string[]): Promise<boolean> {
    return await this.hierarchicalMemory.addTags(id, tags);
  }

  /**
   * Remove tags from a memory
   */
  async removeTags(id: string, tags: string[]): Promise<boolean> {
    return await this.hierarchicalMemory.removeTags(id, tags);
  }

  /**
   * Delete a memory
   */
  async delete(id: string): Promise<boolean> {
    return await this.hierarchicalMemory.delete(id);
  }

  /**
   * Get memories by level
   */
  async getByLevel(level: MemoryLevel): Promise<MemoryNode[]> {
    return await this.hierarchicalMemory.getByLevel(level);
  }

  /**
   * Clear memories (optionally by level)
   */
  async clear(level?: MemoryLevel): Promise<void> {
    return await this.hierarchicalMemory.clear(level);
  }

  /**
   * Get memory statistics
   */
  async getStats(): Promise<MemoryStats> {
    return await this.hierarchicalMemory.getStats();
  }

  /**
   * Perform memory consolidation
   */
  async consolidate(): Promise<number> {
    return await this.hierarchicalMemory.consolidate();
  }

  /**
   * Clean up expired memories
   */
  async cleanup(): Promise<number> {
    return await this.hierarchicalMemory.cleanup();
  }

  /**
   * Store a short-term memory (convenience method)
   */
  async storeShortTerm(
    content: unknown,
    options?: {
      importance?: number;
      tags?: string[];
      metadata?: Record<string, unknown>;
    }
  ): Promise<string> {
    return await this.store(content, MemoryLevel.SHORT_TERM, options);
  }

  /**
   * Store a long-term memory (convenience method)
   */
  async storeLongTerm(
    content: unknown,
    options?: {
      importance?: number;
      tags?: string[];
      metadata?: Record<string, unknown>;
    }
  ): Promise<string> {
    return await this.store(content, MemoryLevel.LONG_TERM, options);
  }

  /**
   * Store an episodic memory (convenience method)
   */
  async storeEpisodic(
    content: unknown,
    options?: {
      importance?: number;
      tags?: string[];
      metadata?: Record<string, unknown>;
    }
  ): Promise<string> {
    return await this.store(content, MemoryLevel.EPISODIC, options);
  }

  /**
   * Store a semantic memory (convenience method)
   */
  async storeSemantic(
    content: unknown,
    options?: {
      importance?: number;
      tags?: string[];
      metadata?: Record<string, unknown>;
    }
  ): Promise<string> {
    return await this.store(content, MemoryLevel.SEMANTIC, options);
  }

  /**
   * Search within a specific memory level (convenience method)
   */
  async searchLevel(
    level: MemoryLevel,
    query?: string,
    options?: {
      tags?: string[];
      minImportance?: number;
      limit?: number;
      timeRange?: {
        start?: Date;
        end?: Date;
      };
      metadata?: Record<string, unknown>;
    }
  ): Promise<MemorySearchResult> {
    return await this.search({
      query,
      level,
      ...options
    });
  }

  /**
   * Find similar memories based on content (convenience method)
   */
  async findSimilar(
    content: any,
    options?: {
      level?: MemoryLevel;
      limit?: number;
      minImportance?: number;
    }
  ): Promise<MemorySearchResult> {
    // Simple similarity search based on content serialization
    const searchQuery = typeof content === 'string' ? content : JSON.stringify(content);
    
    return await this.search({
      query: searchQuery,
      level: options?.level,
      limit: options?.limit || 5,
      minImportance: options?.minImportance
    });
  }

  /**
   * Get recent memories (convenience method)
   */
  async getRecent(
    level?: MemoryLevel,
    limit: number = 10
  ): Promise<MemoryNode[]> {
    const result = await this.search({
      level,
      limit,
      timeRange: {
        start: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
      }
    });
    
    return result.memories.sort((a, b) => 
      b.timestamp.getTime() - a.timestamp.getTime()
    );
  }

  /**
   * Get important memories (convenience method)
   */
  async getImportant(
    level?: MemoryLevel,
    minImportance: number = 0.7,
    limit: number = 10
  ): Promise<MemoryNode[]> {
    const result = await this.search({
      level,
      minImportance,
      limit
    });
    
    return result.memories.sort((a, b) => b.importance - a.importance);
  }

  /**
   * Perform maintenance operations
   */
  async performMaintenance(): Promise<{
    consolidated: number;
    cleaned: number;
    stats: MemoryStats;
  }> {
    const consolidated = await this.consolidate();
    const cleaned = await this.cleanup();
    const stats = await this.getStats();
    
    return {
      consolidated,
      cleaned,
      stats
    };
  }

  /**
   * Export memories for backup
   */
  async exportMemories(level?: MemoryLevel): Promise<MemoryNode[]> {
    if (level) {
      return await this.getByLevel(level);
    }
    
    const allMemories: MemoryNode[] = [];
    for (const memLevel of Object.values(MemoryLevel)) {
      const memories = await this.getByLevel(memLevel);
      allMemories.push(...memories);
    }
    
    return allMemories;
  }

  /**
   * Import memories from backup
   */
  async importMemories(memories: MemoryNode[]): Promise<number> {
    let imported = 0;
    
    for (const memory of memories) {
      try {
        await this.memoryStore.store(memory);
        imported++;
      } catch (error) {
        console.error(`Failed to import memory ${memory.id}:`, error);
      }
    }
    
    return imported;
  }

  /**
   * Destroy the memory manager and cleanup resources
   */
  destroy(): void {
    this.hierarchicalMemory.destroy();
    
    // Cleanup store if it has a destroy method
    if ('destroy' in this.memoryStore && typeof this.memoryStore.destroy === 'function') {
      (this.memoryStore as { destroy(): void }).destroy();
    }
    
    this.removeAllListeners();
  }
}