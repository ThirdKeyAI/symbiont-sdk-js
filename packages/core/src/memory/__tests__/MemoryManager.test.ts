import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MemoryManager } from '../MemoryManager';
import { InMemoryStore } from '../InMemoryStore';
import { HierarchicalMemory } from '../HierarchicalMemory';
import { MemoryLevel, MemoryNode, MemorySearchQuery } from '@symbiont/types';

// Mock HierarchicalMemory for controlled testing
vi.mock('../HierarchicalMemory');
vi.mock('../InMemoryStore');

describe('MemoryManager', () => {
  let memoryManager: MemoryManager;
  let mockStore: InMemoryStore;
  let mockHierarchicalMemory: HierarchicalMemory;

  const mockMemoryNode: MemoryNode = {
    id: 'test-memory-1',
    content: 'Test content',
    level: MemoryLevel.SHORT_TERM,
    importance: 0.5,
    timestamp: new Date(),
    accessCount: 1,
    tags: ['test'],
    metadata: { source: 'test' }
  };

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Create mock instances
    mockStore = new InMemoryStore();
    mockHierarchicalMemory = new HierarchicalMemory(mockStore);
    
    // Setup HierarchicalMemory mock
    vi.mocked(HierarchicalMemory).mockImplementation(() => mockHierarchicalMemory);
    vi.mocked(mockHierarchicalMemory.on).mockReturnValue(mockHierarchicalMemory);
    vi.mocked(mockHierarchicalMemory.store).mockResolvedValue('test-id');
    vi.mocked(mockHierarchicalMemory.get).mockResolvedValue(mockMemoryNode);
    vi.mocked(mockHierarchicalMemory.search).mockResolvedValue({
      memories: [mockMemoryNode],
      total: 1,
      executionTime: 50
    });
    vi.mocked(mockHierarchicalMemory.updateImportance).mockResolvedValue(true);
    vi.mocked(mockHierarchicalMemory.addTags).mockResolvedValue(true);
    vi.mocked(mockHierarchicalMemory.removeTags).mockResolvedValue(true);
    vi.mocked(mockHierarchicalMemory.delete).mockResolvedValue(true);
    vi.mocked(mockHierarchicalMemory.getByLevel).mockResolvedValue([mockMemoryNode]);
    vi.mocked(mockHierarchicalMemory.clear).mockResolvedValue();
    vi.mocked(mockHierarchicalMemory.getStats).mockResolvedValue({
      totalMemories: 1,
      memoryCount: {
        [MemoryLevel.SHORT_TERM]: 1,
        [MemoryLevel.LONG_TERM]: 0,
        [MemoryLevel.EPISODIC]: 0,
        [MemoryLevel.SEMANTIC]: 0
      },
      averageImportance: {
        [MemoryLevel.SHORT_TERM]: 0.5,
        [MemoryLevel.LONG_TERM]: 0,
        [MemoryLevel.EPISODIC]: 0,
        [MemoryLevel.SEMANTIC]: 0
      },
      mostAccessed: [],
      recentActivity: []
    });
    vi.mocked(mockHierarchicalMemory.consolidate).mockResolvedValue(2);
    vi.mocked(mockHierarchicalMemory.cleanup).mockResolvedValue(1);
    vi.mocked(mockHierarchicalMemory.destroy).mockReturnValue();

    // Setup InMemoryStore mock
    vi.mocked(InMemoryStore).mockImplementation(() => mockStore);
    vi.mocked(mockStore.store).mockResolvedValue();
    
    memoryManager = new MemoryManager();
  });

  afterEach(() => {
    if (memoryManager) {
      memoryManager.destroy();
    }
  });

  describe('Construction and Initialization', () => {
    it('should initialize with default configuration', () => {
      expect(memoryManager).toBeDefined();
      expect(InMemoryStore).toHaveBeenCalledWith(undefined);
      expect(HierarchicalMemory).toHaveBeenCalledWith(mockStore, undefined);
    });

    it('should initialize with custom store', () => {
      const customStore = new InMemoryStore();
      const manager = new MemoryManager({ store: customStore });
      
      expect(HierarchicalMemory).toHaveBeenCalledWith(customStore, undefined);
      manager.destroy();
    });

    it('should initialize with store configuration', () => {
      const storeConfig = {
        maxMemories: {
          [MemoryLevel.SHORT_TERM]: 100,
          [MemoryLevel.LONG_TERM]: 500,
          [MemoryLevel.EPISODIC]: 200,
          [MemoryLevel.SEMANTIC]: 1000
        }
      };
      
      const manager = new MemoryManager({ storeConfig });
      
      expect(InMemoryStore).toHaveBeenCalledWith(storeConfig);
      manager.destroy();
    });

    it('should initialize with hierarchical configuration', () => {
      const hierarchicalConfig = {
        autoConsolidation: true,
        consolidationInterval: 300000
      };
      
      const manager = new MemoryManager({ hierarchicalConfig });
      
      expect(HierarchicalMemory).toHaveBeenCalledWith(mockStore, hierarchicalConfig);
      manager.destroy();
    });

    it('should forward events from hierarchical memory', () => {
      expect(mockHierarchicalMemory.on).toHaveBeenCalledWith('memory:stored', expect.any(Function));
      expect(mockHierarchicalMemory.on).toHaveBeenCalledWith('memory:retrieved', expect.any(Function));
      expect(mockHierarchicalMemory.on).toHaveBeenCalledWith('memory:updated', expect.any(Function));
      expect(mockHierarchicalMemory.on).toHaveBeenCalledWith('memory:deleted', expect.any(Function));
      expect(mockHierarchicalMemory.on).toHaveBeenCalledWith('memory:consolidated', expect.any(Function));
      expect(mockHierarchicalMemory.on).toHaveBeenCalledWith('memory:cleaned', expect.any(Function));
    });
  });

  describe('Basic Memory Operations', () => {
    it('should store memory successfully', async () => {
      const content = 'Test memory content';
      const level = MemoryLevel.SHORT_TERM;
      const options = { importance: 0.8, tags: ['test'] };

      const result = await memoryManager.store(content, level, options);

      expect(result).toBe('test-id');
      expect(mockHierarchicalMemory.store).toHaveBeenCalledWith(content, level, options);
    });

    it('should retrieve memory by ID', async () => {
      const result = await memoryManager.get('test-id');

      expect(result).toEqual(mockMemoryNode);
      expect(mockHierarchicalMemory.get).toHaveBeenCalledWith('test-id');
    });

    it('should search memories', async () => {
      const query: MemorySearchQuery = {
        query: 'test query',
        level: MemoryLevel.SHORT_TERM,
        limit: 10
      };

      const result = await memoryManager.search(query);

      expect(result).toEqual({
        memories: [mockMemoryNode],
        total: 1,
        executionTime: 50
      });
      expect(mockHierarchicalMemory.search).toHaveBeenCalledWith(query);
    });

    it('should update memory importance', async () => {
      const result = await memoryManager.updateImportance('test-id', 0.9);

      expect(result).toBe(true);
      expect(mockHierarchicalMemory.updateImportance).toHaveBeenCalledWith('test-id', 0.9);
    });

    it('should add tags to memory', async () => {
      const tags = ['new-tag', 'another-tag'];
      const result = await memoryManager.addTags('test-id', tags);

      expect(result).toBe(true);
      expect(mockHierarchicalMemory.addTags).toHaveBeenCalledWith('test-id', tags);
    });

    it('should remove tags from memory', async () => {
      const tags = ['old-tag'];
      const result = await memoryManager.removeTags('test-id', tags);

      expect(result).toBe(true);
      expect(mockHierarchicalMemory.removeTags).toHaveBeenCalledWith('test-id', tags);
    });

    it('should delete memory', async () => {
      const result = await memoryManager.delete('test-id');

      expect(result).toBe(true);
      expect(mockHierarchicalMemory.delete).toHaveBeenCalledWith('test-id');
    });

    it('should get memories by level', async () => {
      const result = await memoryManager.getByLevel(MemoryLevel.SHORT_TERM);

      expect(result).toEqual([mockMemoryNode]);
      expect(mockHierarchicalMemory.getByLevel).toHaveBeenCalledWith(MemoryLevel.SHORT_TERM);
    });

    it('should clear memories', async () => {
      await memoryManager.clear();
      expect(mockHierarchicalMemory.clear).toHaveBeenCalledWith(undefined);

      await memoryManager.clear(MemoryLevel.SHORT_TERM);
      expect(mockHierarchicalMemory.clear).toHaveBeenCalledWith(MemoryLevel.SHORT_TERM);
    });

    it('should get memory statistics', async () => {
      const result = await memoryManager.getStats();

      expect(result).toEqual({
        totalMemories: 1,
        memoryCount: {
          [MemoryLevel.SHORT_TERM]: 1,
          [MemoryLevel.LONG_TERM]: 0,
          [MemoryLevel.EPISODIC]: 0,
          [MemoryLevel.SEMANTIC]: 0
        },
        averageImportance: {
          [MemoryLevel.SHORT_TERM]: 0.5,
          [MemoryLevel.LONG_TERM]: 0,
          [MemoryLevel.EPISODIC]: 0,
          [MemoryLevel.SEMANTIC]: 0
        },
        mostAccessed: [],
        recentActivity: []
      });
      expect(mockHierarchicalMemory.getStats).toHaveBeenCalled();
    });

    it('should perform consolidation', async () => {
      const result = await memoryManager.consolidate();

      expect(result).toBe(2);
      expect(mockHierarchicalMemory.consolidate).toHaveBeenCalled();
    });

    it('should perform cleanup', async () => {
      const result = await memoryManager.cleanup();

      expect(result).toBe(1);
      expect(mockHierarchicalMemory.cleanup).toHaveBeenCalled();
    });
  });

  describe('Convenience Methods', () => {
    it('should store short-term memory', async () => {
      const content = 'Short-term content';
      const options = { importance: 0.3 };

      const result = await memoryManager.storeShortTerm(content, options);

      expect(result).toBe('test-id');
      expect(mockHierarchicalMemory.store).toHaveBeenCalledWith(
        content,
        MemoryLevel.SHORT_TERM,
        options
      );
    });

    it('should store long-term memory', async () => {
      const content = 'Long-term content';
      const options = { importance: 0.8 };

      const result = await memoryManager.storeLongTerm(content, options);

      expect(result).toBe('test-id');
      expect(mockHierarchicalMemory.store).toHaveBeenCalledWith(
        content,
        MemoryLevel.LONG_TERM,
        options
      );
    });

    it('should store episodic memory', async () => {
      const content = 'Episodic content';
      const options = { tags: ['episode'] };

      const result = await memoryManager.storeEpisodic(content, options);

      expect(result).toBe('test-id');
      expect(mockHierarchicalMemory.store).toHaveBeenCalledWith(
        content,
        MemoryLevel.EPISODIC,
        options
      );
    });

    it('should store semantic memory', async () => {
      const content = 'Semantic content';
      const options = { importance: 0.9 };

      const result = await memoryManager.storeSemantic(content, options);

      expect(result).toBe('test-id');
      expect(mockHierarchicalMemory.store).toHaveBeenCalledWith(
        content,
        MemoryLevel.SEMANTIC,
        options
      );
    });

    it('should search within specific level', async () => {
      const result = await memoryManager.searchLevel(
        MemoryLevel.LONG_TERM,
        'test query',
        { tags: ['important'], limit: 5 }
      );

      expect(result).toEqual({
        memories: [mockMemoryNode],
        total: 1,
        executionTime: 50
      });
      expect(mockHierarchicalMemory.search).toHaveBeenCalledWith({
        query: 'test query',
        level: MemoryLevel.LONG_TERM,
        tags: ['important'],
        limit: 5
      });
    });

    it('should find similar memories with string content', async () => {
      const content = 'similar content';
      const options = { level: MemoryLevel.SEMANTIC, limit: 3 };

      const result = await memoryManager.findSimilar(content, options);

      expect(result).toEqual({
        memories: [mockMemoryNode],
        total: 1,
        executionTime: 50
      });
      expect(mockHierarchicalMemory.search).toHaveBeenCalledWith({
        query: content,
        level: MemoryLevel.SEMANTIC,
        limit: 3,
        minImportance: undefined
      });
    });

    it('should find similar memories with object content', async () => {
      const content = { type: 'test', data: 'value' };
      const options = { limit: 5, minImportance: 0.5 };

      const result = await memoryManager.findSimilar(content, options);

      expect(mockHierarchicalMemory.search).toHaveBeenCalledWith({
        query: JSON.stringify(content),
        level: undefined,
        limit: 5,
        minImportance: 0.5
      });
    });

    it('should get recent memories', async () => {
      const result = await memoryManager.getRecent(MemoryLevel.SHORT_TERM, 5);

      expect(mockHierarchicalMemory.search).toHaveBeenCalledWith({
        level: MemoryLevel.SHORT_TERM,
        limit: 5,
        timeRange: {
          start: expect.any(Date)
        }
      });
    });

    it('should get important memories', async () => {
      const result = await memoryManager.getImportant(MemoryLevel.SEMANTIC, 0.8, 3);

      expect(mockHierarchicalMemory.search).toHaveBeenCalledWith({
        level: MemoryLevel.SEMANTIC,
        minImportance: 0.8,
        limit: 3
      });
    });
  });

  describe('Maintenance Operations', () => {
    it('should perform complete maintenance', async () => {
      const result = await memoryManager.performMaintenance();

      expect(result).toEqual({
        consolidated: 2,
        cleaned: 1,
        stats: {
          totalMemories: 1,
          memoryCount: {
            [MemoryLevel.SHORT_TERM]: 1,
            [MemoryLevel.LONG_TERM]: 0,
            [MemoryLevel.EPISODIC]: 0,
            [MemoryLevel.SEMANTIC]: 0
          },
          averageImportance: {
            [MemoryLevel.SHORT_TERM]: 0.5,
            [MemoryLevel.LONG_TERM]: 0,
            [MemoryLevel.EPISODIC]: 0,
            [MemoryLevel.SEMANTIC]: 0
          },
          mostAccessed: [],
          recentActivity: []
        }
      });
      expect(mockHierarchicalMemory.consolidate).toHaveBeenCalled();
      expect(mockHierarchicalMemory.cleanup).toHaveBeenCalled();
      expect(mockHierarchicalMemory.getStats).toHaveBeenCalled();
    });
  });

  describe('Import/Export Operations', () => {
    it('should export memories for specific level', async () => {
      const result = await memoryManager.exportMemories(MemoryLevel.LONG_TERM);

      expect(result).toEqual([mockMemoryNode]);
      expect(mockHierarchicalMemory.getByLevel).toHaveBeenCalledWith(MemoryLevel.LONG_TERM);
    });

    it('should export all memories when no level specified', async () => {
      const result = await memoryManager.exportMemories();

      // Should call getByLevel for each memory level
      expect(mockHierarchicalMemory.getByLevel).toHaveBeenCalledTimes(4);
      expect(mockHierarchicalMemory.getByLevel).toHaveBeenCalledWith(MemoryLevel.SHORT_TERM);
      expect(mockHierarchicalMemory.getByLevel).toHaveBeenCalledWith(MemoryLevel.LONG_TERM);
      expect(mockHierarchicalMemory.getByLevel).toHaveBeenCalledWith(MemoryLevel.EPISODIC);
      expect(mockHierarchicalMemory.getByLevel).toHaveBeenCalledWith(MemoryLevel.SEMANTIC);
    });

    it('should import memories successfully', async () => {
      const memoriesToImport = [
        mockMemoryNode,
        { ...mockMemoryNode, id: 'test-memory-2' }
      ];

      const result = await memoryManager.importMemories(memoriesToImport);

      expect(result).toBe(2);
      expect(mockStore.store).toHaveBeenCalledTimes(2);
      expect(mockStore.store).toHaveBeenCalledWith(mockMemoryNode);
      expect(mockStore.store).toHaveBeenCalledWith({ ...mockMemoryNode, id: 'test-memory-2' });
    });

    it('should handle import failures gracefully', async () => {
      const memoriesToImport = [
        mockMemoryNode,
        { ...mockMemoryNode, id: 'test-memory-2' }
      ];

      // Make second import fail
      vi.mocked(mockStore.store)
        .mockResolvedValueOnce()
        .mockRejectedValueOnce(new Error('Import failed'));

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await memoryManager.importMemories(memoriesToImport);

      expect(result).toBe(1); // Only one successful import
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to import memory test-memory-2:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Event Handling', () => {
    it('should emit forwarded events from hierarchical memory', () => {
      const eventData = { memoryId: 'test-id', level: MemoryLevel.SHORT_TERM };
      
      // Test each event type
      const events = [
        'memory:stored',
        'memory:retrieved', 
        'memory:updated',
        'memory:deleted',
        'memory:consolidated',
        'memory:cleaned'
      ];

      events.forEach(eventName => {
        const emitSpy = vi.spyOn(memoryManager, 'emit');
        
        // Simulate the hierarchical memory emitting the event
        const eventHandler = vi.mocked(mockHierarchicalMemory.on).mock.calls
          .find(call => call[0] === eventName)?.[1];
        
        if (eventHandler) {
          eventHandler(eventData);
          expect(emitSpy).toHaveBeenCalledWith(eventName, eventData);
        }
        
        emitSpy.mockRestore();
      });
    });
  });

  describe('Resource Management', () => {
    it('should destroy hierarchical memory on destruction', () => {
      memoryManager.destroy();

      expect(mockHierarchicalMemory.destroy).toHaveBeenCalled();
    });

    it('should destroy store if it has destroy method', () => {
      const mockStoreWithDestroy = {
        ...mockStore,
        destroy: vi.fn()
      };

      const manager = new MemoryManager({ store: mockStoreWithDestroy as any });
      manager.destroy();

      expect(mockStoreWithDestroy.destroy).toHaveBeenCalled();
    });

    it('should remove all event listeners on destruction', () => {
      const removeListenersSpy = vi.spyOn(memoryManager, 'removeAllListeners');
      
      memoryManager.destroy();

      expect(removeListenersSpy).toHaveBeenCalled();
    });

    it('should handle destruction gracefully when store has no destroy method', () => {
      const simpleStore = {
        store: vi.fn(),
        get: vi.fn(),
        search: vi.fn()
      };

      const manager = new MemoryManager({ store: simpleStore as any });
      
      expect(() => manager.destroy()).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should propagate storage errors', async () => {
      const error = new Error('Storage failed');
      vi.mocked(mockHierarchicalMemory.store).mockRejectedValue(error);

      await expect(memoryManager.store('content', MemoryLevel.SHORT_TERM))
        .rejects.toThrow('Storage failed');
    });

    it('should propagate retrieval errors', async () => {
      const error = new Error('Retrieval failed');
      vi.mocked(mockHierarchicalMemory.get).mockRejectedValue(error);

      await expect(memoryManager.get('test-id'))
        .rejects.toThrow('Retrieval failed');
    });

    it('should propagate search errors', async () => {
      const error = new Error('Search failed');
      vi.mocked(mockHierarchicalMemory.search).mockRejectedValue(error);

      await expect(memoryManager.search({ query: 'test' }))
        .rejects.toThrow('Search failed');
    });

    it('should propagate maintenance operation errors', async () => {
      const consolidateError = new Error('Consolidation failed');
      vi.mocked(mockHierarchicalMemory.consolidate).mockRejectedValue(consolidateError);

      await expect(memoryManager.performMaintenance())
        .rejects.toThrow('Consolidation failed');
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined options in store methods', async () => {
      await memoryManager.storeShortTerm('content');
      
      expect(mockHierarchicalMemory.store).toHaveBeenCalledWith(
        'content',
        MemoryLevel.SHORT_TERM,
        undefined
      );
    });

    it('should handle empty search results', async () => {
      vi.mocked(mockHierarchicalMemory.search).mockResolvedValue({
        memories: [],
        total: 0,
        executionTime: 10
      });

      const result = await memoryManager.getRecent();
      expect(result).toEqual([]);
    });

    it('should handle null memory retrieval', async () => {
      vi.mocked(mockHierarchicalMemory.get).mockResolvedValue(null);

      const result = await memoryManager.get('non-existent');
      expect(result).toBeNull();
    });

    it('should sort recent memories by timestamp', async () => {
      const oldMemory = { ...mockMemoryNode, timestamp: new Date('2023-01-01') };
      const newMemory = { ...mockMemoryNode, timestamp: new Date('2023-12-31') };
      
      vi.mocked(mockHierarchicalMemory.search).mockResolvedValue({
        memories: [oldMemory, newMemory],
        total: 2,
        executionTime: 25
      });

      const result = await memoryManager.getRecent();
      
      expect(result[0].timestamp.getTime()).toBeGreaterThan(result[1].timestamp.getTime());
    });

    it('should sort important memories by importance', async () => {
      const lessImportant = { ...mockMemoryNode, importance: 0.3 };
      const moreImportant = { ...mockMemoryNode, importance: 0.9 };
      
      vi.mocked(mockHierarchicalMemory.search).mockResolvedValue({
        memories: [lessImportant, moreImportant],
        total: 2,
        executionTime: 30
      });

      const result = await memoryManager.getImportant();
      
      expect(result[0].importance).toBeGreaterThan(result[1].importance);
    });
  });
});