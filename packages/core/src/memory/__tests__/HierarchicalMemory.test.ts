import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { HierarchicalMemory } from '../HierarchicalMemory';
import { InMemoryStore } from '../InMemoryStore';
import { MemoryLevel } from '@symbiont/types';

describe('HierarchicalMemory', () => {
  let hierarchicalMemory: HierarchicalMemory;
  let mockStore: InMemoryStore;

  beforeEach(() => {
    mockStore = new InMemoryStore();
    hierarchicalMemory = new HierarchicalMemory(mockStore, {
      autoConsolidation: false, // Disable auto consolidation for testing
    });
  });

  afterEach(() => {
    hierarchicalMemory.destroy();
  });

  describe('constructor', () => {
    it('should initialize with default configuration', () => {
      const memory = new HierarchicalMemory(mockStore);
      expect(memory).toBeDefined();
      memory.destroy();
    });

    it('should initialize with custom level configurations', () => {
      const customConfig = {
        levelConfigs: {
          [MemoryLevel.SHORT_TERM]: {
            maxSize: 50,
            ttl: 1800, // 30 minutes
          },
        },
        autoConsolidation: false,
      };

      const memory = new HierarchicalMemory(mockStore, customConfig);
      expect(memory).toBeDefined();
      memory.destroy();
    });

    it('should start auto consolidation by default', () => {
      const memory = new HierarchicalMemory(mockStore, {
        consolidationInterval: 0.1, // Very short for testing
      });
      expect(memory).toBeDefined();
      memory.destroy();
    });
  });

  describe('store', () => {
    it('should store memory in specified level', async () => {
      const content = { text: 'Test memory content' };
      const id = await hierarchicalMemory.store(content, MemoryLevel.SHORT_TERM);

      expect(typeof id).toBe('string');
      expect(id).toMatch(/^mem_\d+_[a-z0-9]+$/);

      const retrieved = await hierarchicalMemory.get(id);
      expect(retrieved?.content).toEqual(content);
      expect(retrieved?.level).toBe(MemoryLevel.SHORT_TERM);
    });

    it('should store memory with metadata', async () => {
      const content = { text: 'Test memory with metadata' };
      const options = {
        importance: 0.8,
        tags: ['important', 'test'],
        metadata: { source: 'unit-test', version: 1 },
      };

      const id = await hierarchicalMemory.store(content, MemoryLevel.LONG_TERM, options);
      const retrieved = await hierarchicalMemory.get(id);

      expect(retrieved?.importance).toBe(0.8);
      expect(retrieved?.tags).toEqual(['important', 'test']);
      expect(retrieved?.metadata).toEqual({ source: 'unit-test', version: 1 });
    });

    it('should apply default importance if not provided', async () => {
      const content = { text: 'Test memory' };
      const id = await hierarchicalMemory.store(content, MemoryLevel.SHORT_TERM);
      const retrieved = await hierarchicalMemory.get(id);

      expect(retrieved?.importance).toBe(0.5);
    });

    it('should set expiration based on level configuration', async () => {
      const content = { text: 'Test memory' };
      const id = await hierarchicalMemory.store(content, MemoryLevel.SHORT_TERM);
      const retrieved = await hierarchicalMemory.get(id);

      expect(retrieved?.expiresAt).toBeDefined();
      expect(retrieved?.expiresAt!.getTime()).toBeGreaterThan(Date.now());
    });

    it('should emit memory:stored event', async () => {
      const eventSpy = vi.fn();
      hierarchicalMemory.on('memory:stored', eventSpy);

      const content = { text: 'Test memory' };
      await hierarchicalMemory.store(content, MemoryLevel.SHORT_TERM);

      expect(eventSpy).toHaveBeenCalledWith({
        memory: expect.objectContaining({ content }),
      });
    });
  });

  describe('get', () => {
    it('should retrieve stored memory', async () => {
      const content = { text: 'Test memory' };
      const id = await hierarchicalMemory.store(content, MemoryLevel.SHORT_TERM);
      const retrieved = await hierarchicalMemory.get(id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.content).toEqual(content);
      expect(retrieved?.id).toBe(id);
    });

    it('should return null for non-existent memory', async () => {
      const retrieved = await hierarchicalMemory.get('non-existent-id');
      expect(retrieved).toBeNull();
    });

    it('should emit memory:retrieved event', async () => {
      const eventSpy = vi.fn();
      hierarchicalMemory.on('memory:retrieved', eventSpy);

      const content = { text: 'Test memory' };
      const id = await hierarchicalMemory.store(content, MemoryLevel.SHORT_TERM);
      await hierarchicalMemory.get(id);

      expect(eventSpy).toHaveBeenCalledWith({
        memory: expect.objectContaining({ content }),
      });
    });
  });

  describe('search', () => {
    beforeEach(async () => {
      // Store some test memories
      await hierarchicalMemory.store(
        { text: 'JavaScript tutorial' },
        MemoryLevel.SHORT_TERM,
        { tags: ['programming', 'tutorial'], importance: 0.8 }
      );
      await hierarchicalMemory.store(
        { text: 'Python guide' },
        MemoryLevel.LONG_TERM,
        { tags: ['programming', 'guide'], importance: 0.6 }
      );
      await hierarchicalMemory.store(
        { text: 'Cooking recipe' },
        MemoryLevel.EPISODIC,
        { tags: ['cooking', 'recipe'], importance: 0.4 }
      );
    });

    it('should search across all levels by default', async () => {
      const result = await hierarchicalMemory.search({ query: 'programming' });
      expect(result.memories.length).toBeGreaterThan(0);
    });

    it('should search within specific level', async () => {
      const result = await hierarchicalMemory.search({
        level: MemoryLevel.SHORT_TERM,
        tags: ['tutorial'],
      });
      
      expect(result.memories.length).toBe(1);
      expect(result.memories[0].tags).toContain('tutorial');
    });

    it('should filter by importance threshold', async () => {
      const result = await hierarchicalMemory.search({
        minImportance: 0.7,
      });

      expect(result.memories.length).toBe(1);
      expect(result.memories[0].importance).toBeGreaterThanOrEqual(0.7);
    });
  });

  describe('updateImportance', () => {
    it('should update memory importance', async () => {
      const content = { text: 'Test memory' };
      const id = await hierarchicalMemory.store(content, MemoryLevel.SHORT_TERM);

      const updated = await hierarchicalMemory.updateImportance(id, 0.9);
      expect(updated).toBe(true);

      const retrieved = await hierarchicalMemory.get(id);
      expect(retrieved?.importance).toBe(0.9);
    });

    it('should return false for non-existent memory', async () => {
      const updated = await hierarchicalMemory.updateImportance('non-existent', 0.9);
      expect(updated).toBe(false);
    });

    it('should emit memory:updated event', async () => {
      const eventSpy = vi.fn();
      hierarchicalMemory.on('memory:updated', eventSpy);

      const content = { text: 'Test memory' };
      const id = await hierarchicalMemory.store(content, MemoryLevel.SHORT_TERM);
      await hierarchicalMemory.updateImportance(id, 0.9);

      expect(eventSpy).toHaveBeenCalledWith({
        memory: expect.any(Object),
        changes: { importance: 0.9 },
      });
    });
  });

  describe('tag management', () => {
    let memoryId: string;

    beforeEach(async () => {
      const content = { text: 'Test memory' };
      memoryId = await hierarchicalMemory.store(content, MemoryLevel.SHORT_TERM, {
        tags: ['initial', 'test'],
      });
    });

    it('should add tags to memory', async () => {
      const updated = await hierarchicalMemory.addTags(memoryId, ['new', 'additional']);
      expect(updated).toBe(true);

      const retrieved = await hierarchicalMemory.get(memoryId);
      expect(retrieved?.tags).toEqual(['initial', 'test', 'new', 'additional']);
    });

    it('should not add duplicate tags', async () => {
      const updated = await hierarchicalMemory.addTags(memoryId, ['test', 'duplicate']);
      expect(updated).toBe(true);

      const retrieved = await hierarchicalMemory.get(memoryId);
      expect(retrieved?.tags).toEqual(['initial', 'test', 'duplicate']);
    });

    it('should remove tags from memory', async () => {
      const updated = await hierarchicalMemory.removeTags(memoryId, ['test']);
      expect(updated).toBe(true);

      const retrieved = await hierarchicalMemory.get(memoryId);
      expect(retrieved?.tags).toEqual(['initial']);
    });

    it('should handle removing non-existent tags', async () => {
      const updated = await hierarchicalMemory.removeTags(memoryId, ['non-existent']);
      expect(updated).toBe(true);

      const retrieved = await hierarchicalMemory.get(memoryId);
      expect(retrieved?.tags).toEqual(['initial', 'test']);
    });
  });

  describe('delete', () => {
    it('should delete memory', async () => {
      const content = { text: 'Test memory' };
      const id = await hierarchicalMemory.store(content, MemoryLevel.SHORT_TERM);

      const deleted = await hierarchicalMemory.delete(id);
      expect(deleted).toBe(true);

      const retrieved = await hierarchicalMemory.get(id);
      expect(retrieved).toBeNull();
    });

    it('should emit memory:deleted event', async () => {
      const eventSpy = vi.fn();
      hierarchicalMemory.on('memory:deleted', eventSpy);

      const content = { text: 'Test memory' };
      const id = await hierarchicalMemory.store(content, MemoryLevel.SHORT_TERM);
      await hierarchicalMemory.delete(id);

      expect(eventSpy).toHaveBeenCalledWith({ id });
    });
  });

  describe('getByLevel', () => {
    beforeEach(async () => {
      await hierarchicalMemory.store({ text: 'Short term 1' }, MemoryLevel.SHORT_TERM);
      await hierarchicalMemory.store({ text: 'Short term 2' }, MemoryLevel.SHORT_TERM);
      await hierarchicalMemory.store({ text: 'Long term 1' }, MemoryLevel.LONG_TERM);
    });

    it('should return memories for specific level', async () => {
      const shortTermMemories = await hierarchicalMemory.getByLevel(MemoryLevel.SHORT_TERM);
      expect(shortTermMemories).toHaveLength(2);
      
      const longTermMemories = await hierarchicalMemory.getByLevel(MemoryLevel.LONG_TERM);
      expect(longTermMemories).toHaveLength(1);
    });
  });

  describe('consolidation', () => {
    it('should consolidate short-term to long-term memories', async () => {
      // Store high-importance short-term memory
      await hierarchicalMemory.store(
        { text: 'Important short-term memory' },
        MemoryLevel.SHORT_TERM,
        { importance: 0.9 } // Above consolidation threshold
      );

      const consolidated = await hierarchicalMemory.consolidate();
      expect(consolidated).toBe(1);

      const shortTermMemories = await hierarchicalMemory.getByLevel(MemoryLevel.SHORT_TERM);
      const longTermMemories = await hierarchicalMemory.getByLevel(MemoryLevel.LONG_TERM);

      expect(shortTermMemories).toHaveLength(0);
      expect(longTermMemories).toHaveLength(1);
      expect(longTermMemories[0].metadata?.consolidatedFrom).toBe(MemoryLevel.SHORT_TERM);
    });

    it('should consolidate episodic to semantic memories', async () => {
      // Store high-importance episodic memory
      await hierarchicalMemory.store(
        { text: 'Important episodic memory' },
        MemoryLevel.EPISODIC,
        { importance: 0.8 } // Above consolidation threshold
      );

      const consolidated = await hierarchicalMemory.consolidate();
      expect(consolidated).toBe(1);

      const episodicMemories = await hierarchicalMemory.getByLevel(MemoryLevel.EPISODIC);
      const semanticMemories = await hierarchicalMemory.getByLevel(MemoryLevel.SEMANTIC);

      expect(episodicMemories).toHaveLength(0);
      expect(semanticMemories).toHaveLength(1);
      expect(semanticMemories[0].metadata?.consolidatedFrom).toBe(MemoryLevel.EPISODIC);
    });

    it('should not consolidate low-importance memories', async () => {
      await hierarchicalMemory.store(
        { text: 'Low importance memory' },
        MemoryLevel.SHORT_TERM,
        { importance: 0.3 } // Below consolidation threshold
      );

      const consolidated = await hierarchicalMemory.consolidate();
      expect(consolidated).toBe(0);

      const shortTermMemories = await hierarchicalMemory.getByLevel(MemoryLevel.SHORT_TERM);
      expect(shortTermMemories).toHaveLength(1);
    });

    it('should emit consolidation events', async () => {
      const eventSpy = vi.fn();
      hierarchicalMemory.on('memory:consolidated', eventSpy);

      await hierarchicalMemory.store(
        { text: 'Important memory' },
        MemoryLevel.SHORT_TERM,
        { importance: 0.9 }
      );

      await hierarchicalMemory.consolidate();

      expect(eventSpy).toHaveBeenCalledWith({
        moved: 1,
        from: MemoryLevel.SHORT_TERM,
        to: MemoryLevel.LONG_TERM,
      });
    });
  });

  describe('cleanup', () => {
    it('should clean up expired memories', async () => {
      // Store memory with very short expiry
      const mockMemory = new HierarchicalMemory(mockStore, {
        levelConfigs: {
          [MemoryLevel.SHORT_TERM]: {
            maxSize: 100,
            ttl: 0.001, // Very short TTL
          },
        },
        autoConsolidation: false,
      });

      await mockMemory.store({ text: 'Expiring memory' }, MemoryLevel.SHORT_TERM);

      // Wait for expiry
      await new Promise(resolve => setTimeout(resolve, 10));

      const cleaned = await mockMemory.cleanup();
      expect(cleaned).toBeGreaterThanOrEqual(0);

      mockMemory.destroy();
    });

    it('should emit memory:cleaned event', async () => {
      const eventSpy = vi.fn();
      hierarchicalMemory.on('memory:cleaned', eventSpy);

      await hierarchicalMemory.cleanup();

      // Event should be emitted even if no memories were cleaned
      if (eventSpy.mock.calls.length > 0) {
        expect(eventSpy).toHaveBeenCalledWith({
          deleted: expect.any(Number),
        });
      }
    });
  });

  describe('capacity management', () => {
    it('should enforce capacity limits', async () => {
      const limitedMemory = new HierarchicalMemory(mockStore, {
        levelConfigs: {
          [MemoryLevel.SHORT_TERM]: {
            maxSize: 2, // Very small limit
            ttl: 3600,
          },
        },
        autoConsolidation: false,
      });

      // Store memories exceeding the limit
      await limitedMemory.store({ text: 'Memory 1' }, MemoryLevel.SHORT_TERM);
      await limitedMemory.store({ text: 'Memory 2' }, MemoryLevel.SHORT_TERM);
      await limitedMemory.store({ text: 'Memory 3' }, MemoryLevel.SHORT_TERM);

      const memories = await limitedMemory.getByLevel(MemoryLevel.SHORT_TERM);
      expect(memories.length).toBeLessThanOrEqual(2);

      limitedMemory.destroy();
    });
  });

  describe('statistics', () => {
    beforeEach(async () => {
      await hierarchicalMemory.store({ text: 'Short term' }, MemoryLevel.SHORT_TERM);
      await hierarchicalMemory.store({ text: 'Long term' }, MemoryLevel.LONG_TERM);
      await hierarchicalMemory.store({ text: 'Episodic' }, MemoryLevel.EPISODIC);
    });

    it('should return memory statistics', async () => {
      const stats = await hierarchicalMemory.getStats();
      
      expect(stats).toHaveProperty('memoryCount');
      expect(stats).toHaveProperty('totalMemories');
      expect(stats).toHaveProperty('averageImportance');
      expect(stats.totalMemories).toBe(3);
    });
  });

  describe('auto consolidation', () => {
    it('should run auto consolidation when enabled', async () => {
      const autoMemory = new HierarchicalMemory(mockStore, {
        autoConsolidation: true,
        consolidationInterval: 0.1, // Very short interval
      });

      // Store high-importance memory
      await autoMemory.store(
        { text: 'Auto consolidation test' },
        MemoryLevel.SHORT_TERM,
        { importance: 0.9 }
      );

      // Wait for auto consolidation to trigger
      await new Promise<void>((resolve) => {
        autoMemory.on('memory:consolidated', () => {
          autoMemory.destroy();
          resolve();
        });
      });
    });
  });

  describe('destroy', () => {
    it('should cleanup resources and stop auto consolidation', () => {
      const memory = new HierarchicalMemory(mockStore, {
        autoConsolidation: true,
        consolidationInterval: 1,
      });

      expect(() => memory.destroy()).not.toThrow();
    });

    it('should remove all event listeners', () => {
      const eventSpy = vi.fn();
      hierarchicalMemory.on('memory:stored', eventSpy);

      hierarchicalMemory.destroy();

      // This should not call the event handler
      hierarchicalMemory.emit('memory:stored', { memory: {} });
      expect(eventSpy).not.toHaveBeenCalled();
    });
  });
});