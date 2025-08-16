import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CollectionManager } from '../CollectionManager';
import { VectorConfig } from '../../../config/VectorConfig';

// Define the interface locally for testing
interface CollectionCreateRequest {
  name: string;
  vectors: {
    size: number;
    distance: 'Cosine' | 'Dot' | 'Euclid' | 'Manhattan';
    hnsw_config?: {
      m?: number;
      ef_construct?: number;
      full_scan_threshold?: number;
      max_indexing_threads?: number;
      on_disk?: boolean;
      payload_m?: number;
    };
    quantization_config?: any;
    on_disk?: boolean;
  };
  shard_number?: number;
  replication_factor?: number;
  write_consistency_factor?: number;
  on_disk_payload?: boolean;
  hnsw_config?: any;
  optimizer_config?: any;
  wal_config?: any;
}

describe('CollectionManager', () => {
  let mockClient: any;
  let config: VectorConfig;
  let collectionManager: CollectionManager;

  beforeEach(() => {
    mockClient = {
      createCollection: vi.fn(),
      getCollections: vi.fn(),
      getCollection: vi.fn(),
      deleteCollection: vi.fn(),
      updateCollection: vi.fn(),
      createAlias: vi.fn(),
      deleteAlias: vi.fn(),
      getAliases: vi.fn(),
    };

    config = {
      provider: 'qdrant',
      timeout: 60000,
      qdrant: {
        host: 'localhost',
        port: 6333,
        grpcPort: 6334,
        preferGrpc: false,
        https: false,
      },
      collections: {},
      batchSize: 100,
      maxRetries: 3,
      retryDelayMs: 1000,
      defaultLimit: 10,
      defaultWithPayload: true,
      defaultWithVectors: false,
      parallelism: 1,
      connectionPoolSize: 10,
    };

    collectionManager = new CollectionManager(mockClient, config);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    const mockCreateRequest: CollectionCreateRequest = {
      name: 'test-collection',
      vectors: {
        size: 384,
        distance: 'Cosine',
      },
      shard_number: 1,
      replication_factor: 1,
      write_consistency_factor: 1,
      on_disk_payload: false,
    };

    it('should create collection successfully', async () => {
      mockClient.createCollection.mockResolvedValue({});

      const result = await collectionManager.create(mockCreateRequest);

      expect(result).toBe(true);
      expect(mockClient.createCollection).toHaveBeenCalledWith('test-collection', {
        vectors: mockCreateRequest.vectors,
        shard_number: mockCreateRequest.shard_number,
        replication_factor: mockCreateRequest.replication_factor,
        write_consistency_factor: mockCreateRequest.write_consistency_factor,
        on_disk_payload: mockCreateRequest.on_disk_payload,
        hnsw_config: mockCreateRequest.hnsw_config,
        optimizer_config: mockCreateRequest.optimizer_config,
        wal_config: mockCreateRequest.wal_config,
      });
    });

    it('should handle collection creation with optional parameters', async () => {
      const requestWithOptionals: CollectionCreateRequest = {
        ...mockCreateRequest,
        hnsw_config: {
          m: 16,
          ef_construct: 100,
          full_scan_threshold: 10000,
          max_indexing_threads: 0,
        },
        optimizer_config: {
          deleted_threshold: 0.2,
          vacuum_min_vector_number: 1000,
          default_segment_number: 0,
          indexing_threshold: 20000,
          flush_interval_sec: 5,
        },
        wal_config: {
          wal_capacity_mb: 32,
          wal_segments_ahead: 0,
        },
      };

      mockClient.createCollection.mockResolvedValue({});

      const result = await collectionManager.create(requestWithOptionals);

      expect(result).toBe(true);
      expect(mockClient.createCollection).toHaveBeenCalledWith(
        'test-collection',
        expect.objectContaining({
          hnsw_config: requestWithOptionals.hnsw_config,
          optimizer_config: requestWithOptionals.optimizer_config,
          wal_config: requestWithOptionals.wal_config,
        })
      );
    });

    it('should throw error when collection creation fails', async () => {
      mockClient.createCollection.mockRejectedValue(new Error('Creation failed'));

      await expect(collectionManager.create(mockCreateRequest)).rejects.toThrow(
        'Failed to create collection test-collection: Creation failed'
      );
    });
  });

  describe('list', () => {
    it('should list collections successfully', async () => {
      const mockResponse = {
        collections: [
          {
            name: 'collection1',
            config: {
              params: {
                vectors: {
                  size: 384,
                  distance: 'Cosine',
                },
              },
            },
          },
          {
            name: 'collection2',
            config: {
              params: {
                vectors: {
                  size: 512,
                  distance: 'Dot',
                },
              },
            },
          },
        ],
      };

      mockClient.getCollections.mockResolvedValue(mockResponse);

      const result = await collectionManager.list();

      expect(result).toEqual([
        {
          name: 'collection1',
          dimension: 384,
          distance: 'Cosine',
          config: mockResponse.collections[0].config,
        },
        {
          name: 'collection2',
          dimension: 512,
          distance: 'Dot',
          config: mockResponse.collections[1].config,
        },
      ]);
      expect(mockClient.getCollections).toHaveBeenCalled();
    });

    it('should handle collections with missing config data', async () => {
      const mockResponse = {
        collections: [
          {
            name: 'incomplete-collection',
            config: {},
          },
        ],
      };

      mockClient.getCollections.mockResolvedValue(mockResponse);

      const result = await collectionManager.list();

      expect(result).toEqual([
        {
          name: 'incomplete-collection',
          dimension: 0,
          distance: 'Cosine',
          config: {},
        },
      ]);
    });

    it('should throw error when listing fails', async () => {
      mockClient.getCollections.mockRejectedValue(new Error('List failed'));

      await expect(collectionManager.list()).rejects.toThrow(
        'Failed to list collections: List failed'
      );
    });
  });

  describe('getInfo', () => {
    it('should get collection info successfully', async () => {
      const mockCollectionInfo = {
        name: 'test-collection',
        status: 'green',
        optimizer_status: 'ok',
        vectors_count: 1000,
        indexed_vectors_count: 950,
        points_count: 1000,
        segments_count: 2,
        config: {
          params: {
            vectors: {
              size: 384,
              distance: 'Cosine',
            },
          },
        },
        payload_schema: {},
      };

      mockClient.getCollection.mockResolvedValue(mockCollectionInfo);

      const result = await collectionManager.getInfo('test-collection');

      expect(result).toEqual({
        name: 'test-collection',
        status: 'green',
        optimizer_status: 'ok',
        vectors_count: 1000,
        indexed_vectors_count: 950,
        points_count: 1000,
        segments_count: 2,
        config: mockCollectionInfo.config,
        payload_schema: {},
      });
      expect(mockClient.getCollection).toHaveBeenCalledWith('test-collection');
    });

    it('should handle missing optional fields', async () => {
      const mockCollectionInfo = {
        name: 'test-collection',
        status: 'green',
        optimizer_status: 'ok',
        config: {},
      };

      mockClient.getCollection.mockResolvedValue(mockCollectionInfo);

      const result = await collectionManager.getInfo('test-collection');

      expect(result.vectors_count).toBe(0);
      expect(result.indexed_vectors_count).toBe(0);
      expect(result.points_count).toBe(0);
      expect(result.segments_count).toBe(0);
    });

    it('should throw error when getting collection info fails', async () => {
      mockClient.getCollection.mockRejectedValue(new Error('Get failed'));

      await expect(collectionManager.getInfo('test-collection')).rejects.toThrow(
        'Failed to get collection info for test-collection: Get failed'
      );
    });
  });

  describe('exists', () => {
    it('should return true when collection exists', async () => {
      mockClient.getCollection.mockResolvedValue({ name: 'test-collection' });

      const result = await collectionManager.exists('test-collection');

      expect(result).toBe(true);
      expect(mockClient.getCollection).toHaveBeenCalledWith('test-collection');
    });

    it('should return false when collection does not exist', async () => {
      mockClient.getCollection.mockRejectedValue(new Error('Not found'));

      const result = await collectionManager.exists('test-collection');

      expect(result).toBe(false);
    });
  });

  describe('delete', () => {
    it('should delete collection successfully', async () => {
      mockClient.deleteCollection.mockResolvedValue({});

      const result = await collectionManager.delete('test-collection');

      expect(result).toBe(true);
      expect(mockClient.deleteCollection).toHaveBeenCalledWith('test-collection');
    });

    it('should throw error when deletion fails', async () => {
      mockClient.deleteCollection.mockRejectedValue(new Error('Delete failed'));

      await expect(collectionManager.delete('test-collection')).rejects.toThrow(
        'Failed to delete collection test-collection: Delete failed'
      );
    });
  });

  describe('updateCollection', () => {
    it('should update collection successfully', async () => {
      const updates = {
        optimizers_config: { deleted_threshold: 0.3 },
        params: { shard_number: 2 },
      };

      mockClient.updateCollection.mockResolvedValue({});

      const result = await collectionManager.updateCollection('test-collection', updates);

      expect(result).toBe(true);
      expect(mockClient.updateCollection).toHaveBeenCalledWith('test-collection', updates);
    });

    it('should throw error when update fails', async () => {
      mockClient.updateCollection.mockRejectedValue(new Error('Update failed'));

      await expect(
        collectionManager.updateCollection('test-collection', {})
      ).rejects.toThrow('Failed to update collection test-collection: Update failed');
    });
  });

  describe('createAlias', () => {
    it('should create alias successfully', async () => {
      mockClient.createAlias.mockResolvedValue({});

      const result = await collectionManager.createAlias('my-alias', 'test-collection');

      expect(result).toBe(true);
      expect(mockClient.createAlias).toHaveBeenCalledWith('my-alias', 'test-collection');
    });

    it('should throw error when alias creation fails', async () => {
      mockClient.createAlias.mockRejectedValue(new Error('Alias failed'));

      await expect(
        collectionManager.createAlias('my-alias', 'test-collection')
      ).rejects.toThrow(
        'Failed to create alias my-alias for collection test-collection: Alias failed'
      );
    });
  });

  describe('deleteAlias', () => {
    it('should delete alias successfully', async () => {
      mockClient.deleteAlias.mockResolvedValue({});

      const result = await collectionManager.deleteAlias('my-alias');

      expect(result).toBe(true);
      expect(mockClient.deleteAlias).toHaveBeenCalledWith('my-alias');
    });

    it('should throw error when alias deletion fails', async () => {
      mockClient.deleteAlias.mockRejectedValue(new Error('Delete alias failed'));

      await expect(collectionManager.deleteAlias('my-alias')).rejects.toThrow(
        'Failed to delete alias my-alias: Delete alias failed'
      );
    });
  });

  describe('listAliases', () => {
    it('should list aliases successfully', async () => {
      const mockAliases = [
        { alias: 'alias1', collection: 'collection1' },
        { alias: 'alias2', collection: 'collection2' },
      ];

      mockClient.getAliases.mockResolvedValue({ aliases: mockAliases });

      const result = await collectionManager.listAliases();

      expect(result).toEqual(mockAliases);
      expect(mockClient.getAliases).toHaveBeenCalled();
    });

    it('should handle empty aliases response', async () => {
      mockClient.getAliases.mockResolvedValue({});

      const result = await collectionManager.listAliases();

      expect(result).toEqual([]);
    });

    it('should throw error when listing aliases fails', async () => {
      mockClient.getAliases.mockRejectedValue(new Error('List aliases failed'));

      await expect(collectionManager.listAliases()).rejects.toThrow(
        'Failed to list aliases: List aliases failed'
      );
    });
  });

  describe('getStats', () => {
    it('should get collection stats successfully', async () => {
      const mockInfo = {
        name: 'test-collection',
        status: 'green',
        optimizer_status: 'ok',
        vectors_count: 1000,
        indexed_vectors_count: 950,
        points_count: 1000,
        segments_count: 2,
        config: {},
      };

      mockClient.getCollection.mockResolvedValue(mockInfo);

      const result = await collectionManager.getStats('test-collection');

      expect(result).toEqual({
        vectors_count: 1000,
        indexed_vectors_count: 950,
        points_count: 1000,
        segments_count: 2,
        status: 'green',
        optimizer_status: 'ok',
      });
    });

    it('should throw error when getting stats fails', async () => {
      mockClient.getCollection.mockRejectedValue(new Error('Stats failed'));

      await expect(collectionManager.getStats('test-collection')).rejects.toThrow(
        'Failed to get collection stats for test-collection: Stats failed'
      );
    });
  });

  describe('recreate', () => {
    it('should recreate collection successfully', async () => {
      const newConfig: CollectionCreateRequest = {
        name: 'test-collection',
        vectors: {
          size: 512,
          distance: 'Dot',
        },
        shard_number: 2,
        replication_factor: 1,
        write_consistency_factor: 1,
        on_disk_payload: true,
      };

      mockClient.deleteCollection.mockResolvedValue({});
      mockClient.createCollection.mockResolvedValue({});

      const result = await collectionManager.recreate('test-collection', newConfig);

      expect(result).toBe(true);
      expect(mockClient.deleteCollection).toHaveBeenCalledWith('test-collection');
      expect(mockClient.createCollection).toHaveBeenCalledWith(
        'test-collection',
        expect.objectContaining({
          vectors: newConfig.vectors,
          shard_number: newConfig.shard_number,
          on_disk_payload: newConfig.on_disk_payload,
        })
      );
    });

    it('should throw error when recreation fails during deletion', async () => {
      mockClient.deleteCollection.mockRejectedValue(new Error('Delete failed'));

      const newConfig: CollectionCreateRequest = {
        name: 'test-collection',
        vectors: { size: 512, distance: 'Dot' },
        shard_number: 1,
        replication_factor: 1,
        write_consistency_factor: 1,
        on_disk_payload: false,
      };

      await expect(
        collectionManager.recreate('test-collection', newConfig)
      ).rejects.toThrow('Failed to recreate collection test-collection: Delete failed');
    });

    it('should throw error when recreation fails during creation', async () => {
      mockClient.deleteCollection.mockResolvedValue({});
      mockClient.createCollection.mockRejectedValue(new Error('Create failed'));

      const newConfig: CollectionCreateRequest = {
        name: 'test-collection',
        vectors: { size: 512, distance: 'Dot' },
        shard_number: 1,
        replication_factor: 1,
        write_consistency_factor: 1,
        on_disk_payload: false,
      };

      await expect(
        collectionManager.recreate('test-collection', newConfig)
      ).rejects.toThrow('Failed to recreate collection test-collection: Create failed');
    });
  });

  describe('error handling', () => {
    it('should properly cast errors to Error type', async () => {
      mockClient.createCollection.mockRejectedValue('String error');

      const createRequest: CollectionCreateRequest = {
        name: 'test-collection',
        vectors: { size: 384, distance: 'Cosine' },
        shard_number: 1,
        replication_factor: 1,
        write_consistency_factor: 1,
        on_disk_payload: false,
      };

      await expect(collectionManager.create(createRequest)).rejects.toThrow(
        'Failed to create collection test-collection: String error'
      );
    });
  });
});