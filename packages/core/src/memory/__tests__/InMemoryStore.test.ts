import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { InMemoryStore } from '../InMemoryStore';
import { MemoryLevel } from '@symbiont/types';

describe('InMemoryStore', () => {
  let store: InMemoryStore;

  beforeEach(() => {
    store = new InMemoryStore({
      autoCleanup: false, // Disable auto cleanup for testing
    });
  });

  afterEach(() => {
    store.destroy();
  });

  describe('constructor', () => {
    it('should initialize with default configuration', () => {
      const defaultStore = new InMemoryStore();
      expect(defaultStore).toBeDefined();
      defaultStore.destroy();
    });

    it('should initialize with custom configuration', () => {
      const customStore = new InMemoryStore({
        maxMemories: {
          [MemoryLevel.SHORT_TERM]: 50,
          [MemoryLevel.LONG_TERM]: 200,
          [MemoryLevel.EPISODIC]: 100,
          [MemoryLevel.SEMANTIC]: 500,
        },
        autoCleanup: true,
        cleanupInterval: 60,
      });
      expect(customStore).toBeDefined();
      customStore.destroy();
    });

    it('should start auto cleanup when enabled', () => {
      const autoCleanupStore = new InMemoryStore({
        autoCleanup: true,
        cleanupInterval: 0.1, // Very short for testing
      });
      expect(autoCleanupStore).toBeDefined();
      autoCleanupStore.destroy();
    });
  });

  describe('store', () => {
    it('should store memory node', async () => {
      const memory = {
        id: 'test-1',
        content: { text: 'Test memory' },
        level: MemoryLevel.SHORT_TERM,
        timestamp: new Date(),
        accessCount: 0,
        importance: 0.5,
      };

      await store.store(memory);
      const retrieved = await store.get('test-1');
      
      expect(retrieved).toEqual({
        ...memory,
        accessCount: 1, // Access count should be incremented on retrieval
      });
    });

    it('should create copy of stored memory', async () => {
      const memory = {
        id: 'test-1',
        content: { text: 'Test memory' },
        level: MemoryLevel.SHORT_TERM,
        timestamp: new Date(),
        accessCount: 0,
        importance: 0.5,
      };

      await store.store(memory);
      
      // Modify original object
      memory.content = { text: 'Modified' };
      
      const retrieved = await store.get('test-1');
      expect(retrieved?.content).toEqual({ text: 'Test memory' });
    });

    it('should enforce capacity limits when configured', async () => {
      const limitedStore = new InMemoryStore({
        maxMemories: {
          [MemoryLevel.SHORT_TERM]: 2,
          [MemoryLevel.LONG_TERM]: 100,
          [MemoryLevel.EPISODIC]: 100,
          [MemoryLevel.SEMANTIC]: 100,
        },
        autoCleanup: false,
      });

      const memory1 = {
        id: 'test-1',
        content: { text: 'Memory 1' },
        level: MemoryLevel.SHORT_TERM,
        timestamp: new Date(Date.now() - 3000),
        accessCount: 0,
        importance: 0.5,
      };

      const memory2 = {
        id: 'test-2',
        content: { text: 'Memory 2' },
        level: MemoryLevel.SHORT_TERM,
        timestamp: new Date(Date.now() - 2000),
        accessCount: 0,
        importance: 0.5,
      };

      const memory3 = {
        id: 'test-3',
        content: { text: 'Memory 3' },
        level: MemoryLevel.SHORT_TERM,
        timestamp: new Date(Date.now() - 1000),
        accessCount: 0,
        importance: 0.5,
      };

      await limitedStore.store(memory1);
      await limitedStore.store(memory2);
      await limitedStore.store(memory3); // Should remove oldest memory

      const retrieved1 = await limitedStore.get('test-1');
      const retrieved3 = await limitedStore.get('test-3');

      expect(retrieved1).toBeNull(); // Oldest should be removed
      expect(retrieved3).toBeDefined(); // Newest should remain

      limitedStore.destroy();
    });
  });

  describe('get', () => {
    beforeEach(async () => {
      const memory = {
        id: 'test-1',
        content: { text: 'Test memory' },
        level: MemoryLevel.SHORT_TERM,
        timestamp: new Date(),
        accessCount: 0,
        importance: 0.5,
      };
      await store.store(memory);
    });

    it('should retrieve stored memory', async () => {
      const retrieved = await store.get('test-1');
      
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe('test-1');
      expect(retrieved?.content).toEqual({ text: 'Test memory' });
    });

    it('should return null for non-existent memory', async () => {
      const retrieved = await store.get('non-existent');
      expect(retrieved).toBeNull();
    });

    it('should increment access count on retrieval', async () => {
      await store.get('test-1');
      const retrieved = await store.get('test-1');
      
      expect(retrieved?.accessCount).toBe(2);
    });

    it('should return copy of memory', async () => {
      const retrieved1 = await store.get('test-1');
      const retrieved2 = await store.get('test-1');
      
      expect(retrieved1).not.toBe(retrieved2); // Different object instances
      expect(retrieved1?.accessCount).toBe(1); // First retrieval increments to 1
      expect(retrieved2?.accessCount).toBe(2); // Second retrieval increments to 2
    });

    it('should remove expired memory', async () => {
      const expiredMemory = {
        id: 'expired-1',
        content: { text: 'Expired memory' },
        level: MemoryLevel.SHORT_TERM,
        timestamp: new Date(),
        accessCount: 0,
        importance: 0.5,
        expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
      };

      await store.store(expiredMemory);
      const retrieved = await store.get('expired-1');
      
      expect(retrieved).toBeNull();
    });
  });

  describe('search', () => {
    beforeEach(async () => {
      const memories = [
        {
          id: 'memory-1',
          content: { text: 'JavaScript programming tutorial' },
          level: MemoryLevel.SHORT_TERM,
          timestamp: new Date(Date.now() - 3000),
          accessCount: 5,
          importance: 0.8,
          tags: ['programming', 'javascript', 'tutorial'],
        },
        {
          id: 'memory-2',
          content: { text: 'Python data science guide' },
          level: MemoryLevel.LONG_TERM,
          timestamp: new Date(Date.now() - 2000),
          accessCount: 3,
          importance: 0.6,
          tags: ['programming', 'python', 'data-science'],
        },
        {
          id: 'memory-3',
          content: { text: 'Cooking pasta recipe' },
          level: MemoryLevel.EPISODIC,
          timestamp: new Date(Date.now() - 1000),
          accessCount: 1,
          importance: 0.4,
          tags: ['cooking', 'recipe', 'pasta'],
        },
      ];

      for (const memory of memories) {
        await store.store(memory);
      }
    });

    it('should search by query text', async () => {
      const result = await store.search({ query: 'programming' });
      
      expect(result.memories).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.executionTime).toBeGreaterThanOrEqual(0); // May be 0 for fast operations
    });

    it('should search by level', async () => {
      const result = await store.search({ level: MemoryLevel.SHORT_TERM });
      
      expect(result.memories).toHaveLength(1);
      expect(result.memories[0].level).toBe(MemoryLevel.SHORT_TERM);
    });

    it('should search by tags', async () => {
      const result = await store.search({ tags: ['cooking'] });
      
      expect(result.memories).toHaveLength(1);
      expect(result.memories[0].tags).toContain('cooking');
    });

    it('should search by minimum importance', async () => {
      const result = await store.search({ minImportance: 0.7 });
      
      expect(result.memories).toHaveLength(1);
      expect(result.memories[0].importance).toBeGreaterThanOrEqual(0.7);
    });

    it('should search by time range', async () => {
      const result = await store.search({
        timeRange: {
          start: new Date(Date.now() - 2500),
          end: new Date(Date.now() - 500),
        },
      });
      
      expect(result.memories).toHaveLength(2);
    });

    it('should apply search limit', async () => {
      const result = await store.search({ limit: 2 });
      
      expect(result.memories).toHaveLength(2);
      expect(result.total).toBe(3); // Total matches
    });

    it('should sort by relevance score', async () => {
      const result = await store.search({ query: 'programming' });
      
      // Should be sorted by relevance (importance + recency + access count)
      expect(result.memories[0].importance).toBeGreaterThanOrEqual(
        result.memories[1].importance
      );
    });

    it('should update access counts for retrieved memories', async () => {
      await store.search({ query: 'programming' });
      
      const memory1 = await store.get('memory-1');
      const memory2 = await store.get('memory-2');
      
      expect(memory1?.accessCount).toBeGreaterThan(5);
      expect(memory2?.accessCount).toBeGreaterThan(3);
    });

    it('should filter expired memories during search', async () => {
      const expiredMemory = {
        id: 'expired-1',
        content: { text: 'Expired programming content' },
        level: MemoryLevel.SHORT_TERM,
        timestamp: new Date(),
        accessCount: 0,
        importance: 0.9,
        expiresAt: new Date(Date.now() - 1000),
        tags: ['programming'],
      };

      await store.store(expiredMemory);
      const result = await store.search({ tags: ['programming'] });
      
      // Should not include expired memory
      expect(result.memories.find(m => m.id === 'expired-1')).toBeUndefined();
    });
  });

  describe('update', () => {
    let memoryId: string;

    beforeEach(async () => {
      const memory = {
        id: 'update-test',
        content: { text: 'Original content' },
        level: MemoryLevel.SHORT_TERM,
        timestamp: new Date(),
        accessCount: 0,
        importance: 0.5,
      };
      
      await store.store(memory);
      memoryId = 'update-test';
    });

    it('should update existing memory', async () => {
      const updated = await store.update(memoryId, {
        importance: 0.9,
        tags: ['updated'],
      });
      
      expect(updated).toBe(true);
      
      const retrieved = await store.get(memoryId);
      expect(retrieved?.importance).toBe(0.9);
      expect(retrieved?.tags).toEqual(['updated']);
    });

    it('should update timestamp on update', async () => {
      const originalTimestamp = (await store.get(memoryId))?.timestamp;
      
      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 1));
      
      await store.update(memoryId, { importance: 0.8 });
      
      const updatedMemory = await store.get(memoryId);
      expect(updatedMemory?.timestamp.getTime()).toBeGreaterThan(
        originalTimestamp?.getTime() || 0
      );
    });

    it('should not allow ID changes', async () => {
      await store.update(memoryId, { id: 'new-id' } as any);
      
      const retrieved = await store.get(memoryId);
      expect(retrieved?.id).toBe(memoryId);
    });

    it('should return false for non-existent memory', async () => {
      const updated = await store.update('non-existent', { importance: 0.9 });
      expect(updated).toBe(false);
    });

    it('should return false for expired memory', async () => {
      const expiredMemory = {
        id: 'expired-update',
        content: { text: 'Expired memory' },
        level: MemoryLevel.SHORT_TERM,
        timestamp: new Date(),
        accessCount: 0,
        importance: 0.5,
        expiresAt: new Date(Date.now() - 1000),
      };

      await store.store(expiredMemory);
      const updated = await store.update('expired-update', { importance: 0.9 });
      
      expect(updated).toBe(false);
    });
  });

  describe('delete', () => {
    beforeEach(async () => {
      const memory = {
        id: 'delete-test',
        content: { text: 'To be deleted' },
        level: MemoryLevel.SHORT_TERM,
        timestamp: new Date(),
        accessCount: 0,
        importance: 0.5,
      };
      
      await store.store(memory);
    });

    it('should delete existing memory', async () => {
      const deleted = await store.delete('delete-test');
      expect(deleted).toBe(true);
      
      const retrieved = await store.get('delete-test');
      expect(retrieved).toBeNull();
    });

    it('should return false for non-existent memory', async () => {
      const deleted = await store.delete('non-existent');
      expect(deleted).toBe(false);
    });
  });

  describe('getByLevel', () => {
    beforeEach(async () => {
      const memories = [
        {
          id: 'short-1',
          content: { text: 'Short term 1' },
          level: MemoryLevel.SHORT_TERM,
          timestamp: new Date(Date.now() - 2000),
          accessCount: 0,
          importance: 0.5,
        },
        {
          id: 'short-2',
          content: { text: 'Short term 2' },
          level: MemoryLevel.SHORT_TERM,
          timestamp: new Date(Date.now() - 1000),
          accessCount: 0,
          importance: 0.5,
        },
        {
          id: 'long-1',
          content: { text: 'Long term 1' },
          level: MemoryLevel.LONG_TERM,
          timestamp: new Date(),
          accessCount: 0,
          importance: 0.5,
        },
      ];

      for (const memory of memories) {
        await store.store(memory);
      }
    });

    it('should return memories for specific level', async () => {
      const shortTermMemories = await store.getByLevel(MemoryLevel.SHORT_TERM);
      const longTermMemories = await store.getByLevel(MemoryLevel.LONG_TERM);
      
      expect(shortTermMemories).toHaveLength(2);
      expect(longTermMemories).toHaveLength(1);
      
      shortTermMemories.forEach(memory => {
        expect(memory.level).toBe(MemoryLevel.SHORT_TERM);
      });
    });

    it('should sort by timestamp descending', async () => {
      const memories = await store.getByLevel(MemoryLevel.SHORT_TERM);
      
      expect(memories[0].id).toBe('short-2'); // More recent
      expect(memories[1].id).toBe('short-1'); // Older
    });

    it('should filter expired memories', async () => {
      const expiredMemory = {
        id: 'expired-short',
        content: { text: 'Expired short term' },
        level: MemoryLevel.SHORT_TERM,
        timestamp: new Date(),
        accessCount: 0,
        importance: 0.5,
        expiresAt: new Date(Date.now() - 1000),
      };

      await store.store(expiredMemory);
      const memories = await store.getByLevel(MemoryLevel.SHORT_TERM);
      
      expect(memories.find(m => m.id === 'expired-short')).toBeUndefined();
    });

    it('should return copies of memories', async () => {
      const memories1 = await store.getByLevel(MemoryLevel.SHORT_TERM);
      const memories2 = await store.getByLevel(MemoryLevel.SHORT_TERM);
      
      expect(memories1[0]).not.toBe(memories2[0]); // Different instances
      expect(memories1[0]).toEqual(memories2[0]); // But equal content
    });
  });

  describe('clear', () => {
    beforeEach(async () => {
      const memories = [
        {
          id: 'clear-1',
          content: { text: 'Clear test 1' },
          level: MemoryLevel.SHORT_TERM,
          timestamp: new Date(),
          accessCount: 0,
          importance: 0.5,
        },
        {
          id: 'clear-2',
          content: { text: 'Clear test 2' },
          level: MemoryLevel.LONG_TERM,
          timestamp: new Date(),
          accessCount: 0,
          importance: 0.5,
        },
      ];

      for (const memory of memories) {
        await store.store(memory);
      }
    });

    it('should clear all memories when no level specified', async () => {
      await store.clear();
      
      const retrieved1 = await store.get('clear-1');
      const retrieved2 = await store.get('clear-2');
      
      expect(retrieved1).toBeNull();
      expect(retrieved2).toBeNull();
    });

    it('should clear only specified level', async () => {
      await store.clear(MemoryLevel.SHORT_TERM);
      
      const retrieved1 = await store.get('clear-1');
      const retrieved2 = await store.get('clear-2');
      
      expect(retrieved1).toBeNull();
      expect(retrieved2).toBeDefined();
    });
  });

  describe('getStats', () => {
    beforeEach(async () => {
      const memories = [
        {
          id: 'stats-1',
          content: { text: 'Stats test 1' },
          level: MemoryLevel.SHORT_TERM,
          timestamp: new Date(Date.now() - 2000),
          accessCount: 5,
          importance: 0.8,
        },
        {
          id: 'stats-2',
          content: { text: 'Stats test 2' },
          level: MemoryLevel.SHORT_TERM,
          timestamp: new Date(Date.now() - 1000),
          accessCount: 3,
          importance: 0.6,
        },
        {
          id: 'stats-3',
          content: { text: 'Stats test 3' },
          level: MemoryLevel.LONG_TERM,
          timestamp: new Date(),
          accessCount: 1,
          importance: 0.4,
        },
      ];

      for (const memory of memories) {
        await store.store(memory);
      }
    });

    it('should return memory statistics', async () => {
      const stats = await store.getStats();
      
      expect(stats.totalMemories).toBe(3);
      expect(stats.memoryCount[MemoryLevel.SHORT_TERM]).toBe(2);
      expect(stats.memoryCount[MemoryLevel.LONG_TERM]).toBe(1);
      expect(stats.memoryCount[MemoryLevel.EPISODIC]).toBe(0);
      expect(stats.memoryCount[MemoryLevel.SEMANTIC]).toBe(0);
    });

    it('should calculate average importance by level', async () => {
      const stats = await store.getStats();
      
      expect(stats.averageImportance[MemoryLevel.SHORT_TERM]).toBe(0.7); // (0.8 + 0.6) / 2
      expect(stats.averageImportance[MemoryLevel.LONG_TERM]).toBe(0.4);
    });

    it('should include most accessed memories', async () => {
      const stats = await store.getStats();
      
      expect(stats.mostAccessed).toHaveLength(3);
      expect(stats.mostAccessed[0].accessCount).toBe(5); // Highest access count first
    });

    it('should include recent activity', async () => {
      const stats = await store.getStats();
      
      expect(stats.recentActivity).toHaveLength(3);
      expect(stats.recentActivity[0].id).toBe('stats-3'); // Most recent first
    });

    it('should filter expired memories from stats', async () => {
      const expiredMemory = {
        id: 'expired-stats',
        content: { text: 'Expired stats memory' },
        level: MemoryLevel.SHORT_TERM,
        timestamp: new Date(),
        accessCount: 10,
        importance: 0.9,
        expiresAt: new Date(Date.now() - 1000),
      };

      await store.store(expiredMemory);
      const stats = await store.getStats();
      
      expect(stats.totalMemories).toBe(3); // Should not include expired
      expect(stats.mostAccessed.find(m => m.id === 'expired-stats')).toBeUndefined();
    });
  });

  describe('cleanup', () => {
    it('should remove expired memories', async () => {
      const memories = [
        {
          id: 'valid-1',
          content: { text: 'Valid memory' },
          level: MemoryLevel.SHORT_TERM,
          timestamp: new Date(),
          accessCount: 0,
          importance: 0.5,
          expiresAt: new Date(Date.now() + 10000), // Future
        },
        {
          id: 'expired-1',
          content: { text: 'Expired memory 1' },
          level: MemoryLevel.SHORT_TERM,
          timestamp: new Date(),
          accessCount: 0,
          importance: 0.5,
          expiresAt: new Date(Date.now() - 1000), // Past
        },
        {
          id: 'expired-2',
          content: { text: 'Expired memory 2' },
          level: MemoryLevel.SHORT_TERM,
          timestamp: new Date(),
          accessCount: 0,
          importance: 0.5,
          expiresAt: new Date(Date.now() - 2000), // Past
        },
      ];

      for (const memory of memories) {
        await store.store(memory);
      }

      const deletedCount = await store.cleanup();
      
      expect(deletedCount).toBe(2);
      
      const validMemory = await store.get('valid-1');
      const expiredMemory1 = await store.get('expired-1');
      const expiredMemory2 = await store.get('expired-2');
      
      expect(validMemory).toBeDefined();
      expect(expiredMemory1).toBeNull();
      expect(expiredMemory2).toBeNull();
    });

    it('should return zero when no expired memories', async () => {
      const memory = {
        id: 'valid-1',
        content: { text: 'Valid memory' },
        level: MemoryLevel.SHORT_TERM,
        timestamp: new Date(),
        accessCount: 0,
        importance: 0.5,
        expiresAt: new Date(Date.now() + 10000),
      };

      await store.store(memory);
      const deletedCount = await store.cleanup();
      
      expect(deletedCount).toBe(0);
    });
  });

  describe('auto cleanup', () => {
    it('should automatically clean expired memories', async () => {
      const autoStore = new InMemoryStore({
        autoCleanup: true,
        cleanupInterval: 0.1, // Very short interval
      });

      const expiredMemory = {
        id: 'auto-expired',
        content: { text: 'Auto expired memory' },
        level: MemoryLevel.SHORT_TERM,
        timestamp: new Date(),
        accessCount: 0,
        importance: 0.5,
        expiresAt: new Date(Date.now() - 1000),
      };

      await autoStore.store(expiredMemory);
      
      // Wait for auto cleanup
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const retrieved = await autoStore.get('auto-expired');
      expect(retrieved).toBeNull();
      
      autoStore.destroy();
    });
  });

  describe('destroy', () => {
    it('should stop auto cleanup interval', () => {
      const autoStore = new InMemoryStore({
        autoCleanup: true,
        cleanupInterval: 1,
      });

      expect(() => autoStore.destroy()).not.toThrow();
    });
  });
});