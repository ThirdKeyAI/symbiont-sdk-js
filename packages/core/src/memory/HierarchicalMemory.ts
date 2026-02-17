/**
 * Hierarchical memory implementation with multiple memory levels
 */

import { EventEmitter } from 'events';
import {
  MemoryNode,
  MemoryLevel,
  MemorySearchQuery,
  MemorySearchResult,
  MemoryStats,
  MemoryStore as IMemoryStore
} from '@symbi/types';

/**
 * Memory level configuration
 */
interface MemoryLevelConfig {
  maxSize: number;
  ttl?: number; // Time to live in seconds
  consolidationThreshold?: number; // Importance threshold for consolidation
}

/**
 * Default configurations for each memory level
 */
const DEFAULT_LEVEL_CONFIGS: Record<MemoryLevel, MemoryLevelConfig> = {
  [MemoryLevel.SHORT_TERM]: {
    maxSize: 100,
    ttl: 3600, // 1 hour
    consolidationThreshold: 0.7
  },
  [MemoryLevel.LONG_TERM]: {
    maxSize: 1000,
    ttl: 86400 * 30, // 30 days
    consolidationThreshold: 0.8
  },
  [MemoryLevel.EPISODIC]: {
    maxSize: 500,
    ttl: 86400 * 7, // 7 days
    consolidationThreshold: 0.6
  },
  [MemoryLevel.SEMANTIC]: {
    maxSize: 2000,
    // No TTL for semantic memories (persistent facts)
    consolidationThreshold: 0.9
  }
};

/**
 * Hierarchical memory system implementation
 */
export class HierarchicalMemory extends EventEmitter {
  private memoryStore: IMemoryStore;
  private levelConfigs: Record<MemoryLevel, MemoryLevelConfig>;
  private consolidationInterval?: ReturnType<typeof setInterval>;

  constructor(
    store: IMemoryStore,
    config?: {
      levelConfigs?: Partial<Record<MemoryLevel, Partial<MemoryLevelConfig>>>;
      autoConsolidation?: boolean;
      consolidationInterval?: number; // in seconds
    }
  ) {
    super();
    this.memoryStore = store;
    
    // Merge custom configs with defaults
    this.levelConfigs = { ...DEFAULT_LEVEL_CONFIGS };
    if (config?.levelConfigs) {
      for (const [level, levelConfig] of Object.entries(config.levelConfigs)) {
        this.levelConfigs[level as MemoryLevel] = {
          ...this.levelConfigs[level as MemoryLevel],
          ...levelConfig
        };
      }
    }

    // Start automatic consolidation if enabled
    if (config?.autoConsolidation !== false) {
      const interval = config?.consolidationInterval || 3600; // 1 hour default
      this.consolidationInterval = setInterval(() => {
        this.consolidate().catch(console.error);
      }, interval * 1000);
    }
  }

  /**
   * Store a memory in the appropriate level
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
    const now = new Date();
    const id = this.generateId();
    
    // Calculate expiration if not provided
    let expiresAt = options?.expiresAt;
    if (!expiresAt && this.levelConfigs[level].ttl) {
      const ttl = this.levelConfigs[level].ttl;
      if (ttl) {
        expiresAt = new Date(now.getTime() + ttl * 1000);
      }
    }

    const memory: MemoryNode = {
      id,
      content,
      level,
      timestamp: now,
      accessCount: 0,
      importance: options?.importance || 0.5,
      tags: options?.tags,
      metadata: options?.metadata,
      expiresAt
    };

    // Check capacity limits and make room if necessary
    await this.enforceCapacityLimits(level);
    
    await this.memoryStore.store(memory);
    
    this.emit('memory:stored', { memory });
    
    return id;
  }

  /**
   * Retrieve a memory by ID
   */
  async get(id: string): Promise<MemoryNode | null> {
    const memory = await this.memoryStore.get(id);
    if (memory) {
      this.emit('memory:retrieved', { memory });
    }
    return memory;
  }

  /**
   * Search memories across all levels or specific level
   */
  async search(query: MemorySearchQuery): Promise<MemorySearchResult> {
    return await this.memoryStore.search(query);
  }

  /**
   * Update memory importance or other properties
   */
  async updateImportance(id: string, importance: number): Promise<boolean> {
    const memory = await this.memoryStore.get(id);
    if (!memory) {
      return false;
    }

    const updated = await this.memoryStore.update(id, { importance });
    if (updated) {
      this.emit('memory:updated', { memory, changes: { importance } });
    }
    return updated;
  }

  /**
   * Add tags to a memory
   */
  async addTags(id: string, tags: string[]): Promise<boolean> {
    const memory = await this.memoryStore.get(id);
    if (!memory) {
      return false;
    }

    const existingTags = memory.tags || [];
    const newTags = [...new Set([...existingTags, ...tags])];
    
    const updated = await this.memoryStore.update(id, { tags: newTags });
    if (updated) {
      this.emit('memory:updated', { memory, changes: { tags: newTags } });
    }
    return updated;
  }

  /**
   * Remove tags from a memory
   */
  async removeTags(id: string, tags: string[]): Promise<boolean> {
    const memory = await this.memoryStore.get(id);
    if (!memory) {
      return false;
    }

    const existingTags = memory.tags || [];
    const newTags = existingTags.filter(tag => !tags.includes(tag));
    
    const updated = await this.memoryStore.update(id, { tags: newTags });
    if (updated) {
      this.emit('memory:updated', { memory, changes: { tags: newTags } });
    }
    return updated;
  }

  /**
   * Delete a memory
   */
  async delete(id: string): Promise<boolean> {
    const deleted = await this.memoryStore.delete(id);
    if (deleted) {
      this.emit('memory:deleted', { id });
    }
    return deleted;
  }

  /**
   * Get memories by level
   */
  async getByLevel(level: MemoryLevel): Promise<MemoryNode[]> {
    return await this.memoryStore.getByLevel(level);
  }

  /**
   * Clear memories (optionally by level)
   */
  async clear(level?: MemoryLevel): Promise<void> {
    await this.memoryStore.clear(level);
  }

  /**
   * Get memory statistics
   */
  async getStats(): Promise<MemoryStats> {
    return await this.memoryStore.getStats();
  }

  /**
   * Perform memory consolidation
   * Move important short-term memories to long-term
   * Move important episodic memories to semantic
   */
  async consolidate(): Promise<number> {
    let totalMoved = 0;

    // Consolidate short-term to long-term
    const shortTermMemories = await this.getByLevel(MemoryLevel.SHORT_TERM);
    const shortTermThreshold = this.levelConfigs[MemoryLevel.SHORT_TERM].consolidationThreshold;
    const importantShortTerm = shortTermMemories.filter(
      memory => shortTermThreshold !== undefined && memory.importance >= shortTermThreshold
    );

    for (const memory of importantShortTerm) {
      // Move to long-term with updated metadata
      const newMemory: MemoryNode = {
        ...memory,
        id: this.generateId(),
        level: MemoryLevel.LONG_TERM,
        timestamp: new Date(),
        metadata: {
          ...memory.metadata,
          consolidatedFrom: MemoryLevel.SHORT_TERM,
          originalId: memory.id,
          consolidatedAt: new Date().toISOString()
        }
      };

      // Set expiration for long-term
      const longTermTtl = this.levelConfigs[MemoryLevel.LONG_TERM].ttl;
      if (longTermTtl) {
        newMemory.expiresAt = new Date(Date.now() + longTermTtl * 1000);
      }

      await this.memoryStore.store(newMemory);
      await this.memoryStore.delete(memory.id);
      totalMoved++;
      
      this.emit('memory:consolidated', { 
        moved: 1, 
        from: MemoryLevel.SHORT_TERM, 
        to: MemoryLevel.LONG_TERM 
      });
    }

    // Consolidate episodic to semantic
    const episodicMemories = await this.getByLevel(MemoryLevel.EPISODIC);
    const episodicThreshold = this.levelConfigs[MemoryLevel.EPISODIC].consolidationThreshold;
    const importantEpisodic = episodicMemories.filter(
      memory => episodicThreshold !== undefined && memory.importance >= episodicThreshold
    );

    for (const memory of importantEpisodic) {
      // Move to semantic with updated metadata
      const newMemory: MemoryNode = {
        ...memory,
        id: this.generateId(),
        level: MemoryLevel.SEMANTIC,
        timestamp: new Date(),
        metadata: {
          ...memory.metadata,
          consolidatedFrom: MemoryLevel.EPISODIC,
          originalId: memory.id,
          consolidatedAt: new Date().toISOString()
        },
        expiresAt: undefined // Semantic memories don't expire
      };

      await this.memoryStore.store(newMemory);
      await this.memoryStore.delete(memory.id);
      totalMoved++;
      
      this.emit('memory:consolidated', { 
        moved: 1, 
        from: MemoryLevel.EPISODIC, 
        to: MemoryLevel.SEMANTIC 
      });
    }

    return totalMoved;
  }

  /**
   * Clean up expired memories
   */
  async cleanup(): Promise<number> {
    const deletedCount = await this.memoryStore.cleanup();
    if (deletedCount > 0) {
      this.emit('memory:cleaned', { deleted: deletedCount });
    }
    return deletedCount;
  }

  /**
   * Enforce capacity limits for a memory level
   */
  private async enforceCapacityLimits(level: MemoryLevel): Promise<void> {
    const maxSize = this.levelConfigs[level].maxSize;
    const memories = await this.getByLevel(level);
    
    if (memories.length >= maxSize) {
      // Remove oldest, least important memories
      const toRemove = memories
        .sort((a, b) => {
          // Sort by importance (ascending) then by timestamp (ascending)
          if (a.importance !== b.importance) {
            return a.importance - b.importance;
          }
          return a.timestamp.getTime() - b.timestamp.getTime();
        })
        .slice(0, memories.length - maxSize + 1);

      for (const memory of toRemove) {
        await this.memoryStore.delete(memory.id);
      }
    }
  }

  /**
   * Generate a unique ID for memories
   */
  private generateId(): string {
    return `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Stop automatic consolidation and cleanup
   */
  destroy(): void {
    if (this.consolidationInterval) {
      clearInterval(this.consolidationInterval);
    }
    this.removeAllListeners();
  }
}