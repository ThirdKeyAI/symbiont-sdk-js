/**
 * In-memory storage implementation for development and testing
 */

import { 
  MemoryNode, 
  MemoryLevel, 
  MemorySearchQuery, 
  MemorySearchResult, 
  MemoryStats,
  MemoryStoreConfig
} from '@symbi/types';
import { MemoryStore } from './MemoryStore';

/**
 * In-memory storage implementation
 */
export class InMemoryStore extends MemoryStore {
  private memories: Map<string, MemoryNode> = new Map();
  private cleanupInterval?: ReturnType<typeof setInterval>;

  constructor(config?: MemoryStoreConfig) {
    super(config);
    
    // Start automatic cleanup if enabled
    if (config?.autoCleanup !== false) {
      const interval = config?.cleanupInterval || 300; // 5 minutes default
      this.cleanupInterval = setInterval(() => {
        this.cleanup().catch(console.error);
      }, interval * 1000);
    }
  }

  /**
   * Store a memory node
   */
  async store(memory: MemoryNode): Promise<void> {
    // Check capacity limits if configured
    if (this.config.maxMemories?.[memory.level]) {
      const currentCount = Array.from(this.memories.values())
        .filter(m => m.level === memory.level).length;
      
      if (currentCount >= this.config.maxMemories[memory.level]) {
        // Remove oldest memory of this level
        const oldestMemory = this.getOldestMemoryByLevel(memory.level);
        if (oldestMemory) {
          this.memories.delete(oldestMemory.id);
        }
      }
    }

    this.memories.set(memory.id, { ...memory });
  }

  /**
   * Retrieve a memory by ID
   */
  async get(id: string): Promise<MemoryNode | null> {
    const memory = this.memories.get(id);
    if (!memory) {
      return null;
    }

    // Check if memory is expired
    if (this.isExpired(memory)) {
      this.memories.delete(id);
      return null;
    }

    // Record access and update the stored memory
    const updatedMemory = this.recordAccess(memory);
    this.memories.set(id, updatedMemory);
    
    return { ...updatedMemory };
  }

  /**
   * Search for memories matching criteria
   */
  async search(query: MemorySearchQuery): Promise<MemorySearchResult> {
    const startTime = Date.now();
    const allMemories = Array.from(this.memories.values());
    
    // Filter memories based on query criteria
    const filteredMemories = allMemories.filter(memory => {
      // Skip expired memories
      if (this.isExpired(memory)) {
        this.memories.delete(memory.id);
        return false;
      }
      
      return this.matchesQuery(memory, query);
    });

    // Sort by relevance (importance + recency + access count)
    const sortedMemories = filteredMemories.sort((a, b) => {
      const scoreA = this.calculateRelevanceScore(a, query);
      const scoreB = this.calculateRelevanceScore(b, query);
      return scoreB - scoreA;
    });

    // Apply limit
    const limit = query.limit || 10;
    const resultMemories = sortedMemories.slice(0, limit);

    // Update access counts for retrieved memories
    resultMemories.forEach(memory => {
      const updated = this.recordAccess(memory);
      this.memories.set(memory.id, updated);
    });

    const executionTime = Date.now() - startTime;

    return {
      memories: resultMemories.map(m => ({ ...m })),
      total: filteredMemories.length,
      executionTime
    };
  }

  /**
   * Update an existing memory
   */
  async update(id: string, updates: Partial<MemoryNode>): Promise<boolean> {
    const existing = this.memories.get(id);
    if (!existing || this.isExpired(existing)) {
      return false;
    }

    const updated = {
      ...existing,
      ...updates,
      id: existing.id, // Don't allow ID changes
      timestamp: new Date() // Update timestamp
    };

    this.memories.set(id, updated);
    return true;
  }

  /**
   * Delete a memory by ID
   */
  async delete(id: string): Promise<boolean> {
    return this.memories.delete(id);
  }

  /**
   * Get all memories for a specific level
   */
  async getByLevel(level: MemoryLevel): Promise<MemoryNode[]> {
    const memories = Array.from(this.memories.values())
      .filter(memory => {
        if (memory.level !== level) {
          return false;
        }
        
        // Remove expired memories
        if (this.isExpired(memory)) {
          this.memories.delete(memory.id);
          return false;
        }
        
        return true;
      })
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return memories.map(m => ({ ...m }));
  }

  /**
   * Clear all memories (optionally for a specific level)
   */
  async clear(level?: MemoryLevel): Promise<void> {
    if (level) {
      // Clear only memories of specified level
      for (const [id, memory] of this.memories.entries()) {
        if (memory.level === level) {
          this.memories.delete(id);
        }
      }
    } else {
      // Clear all memories
      this.memories.clear();
    }
  }

  /**
   * Get memory statistics
   */
  async getStats(): Promise<MemoryStats> {
    const allMemories = Array.from(this.memories.values());
    
    // Remove expired memories during stats calculation
    const validMemories = allMemories.filter(memory => {
      if (this.isExpired(memory)) {
        this.memories.delete(memory.id);
        return false;
      }
      return true;
    });

    const memoryCount: Record<MemoryLevel, number> = {
      [MemoryLevel.SHORT_TERM]: 0,
      [MemoryLevel.LONG_TERM]: 0,
      [MemoryLevel.EPISODIC]: 0,
      [MemoryLevel.SEMANTIC]: 0
    };

    const importanceSum: Record<MemoryLevel, number> = {
      [MemoryLevel.SHORT_TERM]: 0,
      [MemoryLevel.LONG_TERM]: 0,
      [MemoryLevel.EPISODIC]: 0,
      [MemoryLevel.SEMANTIC]: 0
    };

    validMemories.forEach(memory => {
      memoryCount[memory.level]++;
      importanceSum[memory.level] += memory.importance;
    });

    const averageImportance: Record<MemoryLevel, number> = {
      [MemoryLevel.SHORT_TERM]: memoryCount[MemoryLevel.SHORT_TERM] > 0 ? importanceSum[MemoryLevel.SHORT_TERM] / memoryCount[MemoryLevel.SHORT_TERM] : 0,
      [MemoryLevel.LONG_TERM]: memoryCount[MemoryLevel.LONG_TERM] > 0 ? importanceSum[MemoryLevel.LONG_TERM] / memoryCount[MemoryLevel.LONG_TERM] : 0,
      [MemoryLevel.EPISODIC]: memoryCount[MemoryLevel.EPISODIC] > 0 ? importanceSum[MemoryLevel.EPISODIC] / memoryCount[MemoryLevel.EPISODIC] : 0,
      [MemoryLevel.SEMANTIC]: memoryCount[MemoryLevel.SEMANTIC] > 0 ? importanceSum[MemoryLevel.SEMANTIC] / memoryCount[MemoryLevel.SEMANTIC] : 0
    };

    const mostAccessed = validMemories
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, 10)
      .map(m => ({ ...m }));

    const recentActivity = validMemories
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 10)
      .map(m => ({ ...m }));

    return {
      memoryCount,
      totalMemories: validMemories.length,
      averageImportance,
      mostAccessed,
      recentActivity
    };
  }

  /**
   * Clean up expired memories
   */
  async cleanup(): Promise<number> {
    let deletedCount = 0;
    
    for (const [id, memory] of this.memories.entries()) {
      if (this.isExpired(memory)) {
        this.memories.delete(id);
        deletedCount++;
      }
    }
    
    return deletedCount;
  }

  /**
   * Calculate relevance score for search ranking
   */
  private calculateRelevanceScore(memory: MemoryNode, query: MemorySearchQuery): number {
    let score = memory.importance * 100; // Base importance score
    
    // Recency bonus (more recent = higher score)
    const hoursSinceCreation = (Date.now() - memory.timestamp.getTime()) / (1000 * 60 * 60);
    score += Math.max(0, 50 - hoursSinceCreation); // Up to 50 points for very recent memories
    
    // Access frequency bonus
    score += Math.min(memory.accessCount * 5, 25); // Up to 25 points for frequently accessed
    
    // Text relevance bonus
    if (query.query) {
      const searchText = query.query.toLowerCase();
      const contentStr = JSON.stringify(memory.content).toLowerCase();
      const tagsStr = memory.tags ? memory.tags.join(' ').toLowerCase() : '';
      
      if (contentStr.includes(searchText)) {
        score += 20;
      }
      if (tagsStr.includes(searchText)) {
        score += 15;
      }
    }
    
    return score;
  }

  /**
   * Get the oldest memory for a specific level
   */
  private getOldestMemoryByLevel(level: MemoryLevel): MemoryNode | null {
    const memories = Array.from(this.memories.values())
      .filter(m => m.level === level)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    return memories.length > 0 ? memories[0] : null;
  }

  /**
   * Cleanup on destruction
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}