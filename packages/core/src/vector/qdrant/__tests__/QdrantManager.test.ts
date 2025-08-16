import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QdrantManager } from '../QdrantManager';
import { VectorConfig } from '../../../config/VectorConfig';

// Mock QdrantClient
vi.mock('@qdrant/js-client', () => ({
  QdrantClient: vi.fn(),
}));

// Mock sub-managers
vi.mock('../CollectionManager', () => ({
  CollectionManager: vi.fn(),
}));

vi.mock('../VectorOperations', () => ({
  VectorOperations: vi.fn(),
}));

vi.mock('../SearchEngine', () => ({
  SearchEngine: vi.fn(),
}));

vi.mock('../EmbeddingManager', () => ({
  EmbeddingManager: vi.fn(),
}));

describe('QdrantManager', () => {
  let mockClient: any;
  let mockQdrantClient: any;
  let config: VectorConfig;
  let qdrantManager: QdrantManager;

  const createValidConfig = (overrides: any = {}): VectorConfig => ({
    provider: 'qdrant',
    timeout: 60000,
    qdrant: {
      host: 'localhost',
      port: 6333,
      grpcPort: 6334,
      preferGrpc: false,
      https: false,
      apiKey: 'test-api-key',
      prefix: 'test',
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
    ...overrides,
  });

  beforeEach(async () => {
    // Get the mocked QdrantClient
    const { QdrantClient } = await vi.importMock('@qdrant/js-client');
    mockQdrantClient = QdrantClient as any;
    
    // Setup mock client
    mockClient = {
      getCollections: vi.fn(),
      getClusterInfo: vi.fn(),
      healthCheck: vi.fn(),
      getMetrics: vi.fn(),
      createSnapshot: vi.fn(),
      listSnapshots: vi.fn(),
      deleteSnapshot: vi.fn(),
      recover: vi.fn(),
    };

    mockQdrantClient.mockImplementation(() => mockClient);
    config = createValidConfig();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create QdrantManager with valid config', async () => {
      qdrantManager = new QdrantManager(config);

      expect(qdrantManager).toBeInstanceOf(QdrantManager);
      expect(mockQdrantClient).toHaveBeenCalledWith({
        host: 'localhost',
        port: 6333,
        apiKey: 'test-api-key',
        prefix: 'test',
      });
    });

    it('should create client with HTTPS when enabled', async () => {
      const httpsConfig = createValidConfig({
        qdrant: {
          host: 'localhost',
          port: 6333,
          grpcPort: 6334,
          preferGrpc: false,
          https: true,
          apiKey: 'test-api-key',
          prefix: 'test',
        },
      });

      qdrantManager = new QdrantManager(httpsConfig);

      expect(mockQdrantClient).toHaveBeenCalledWith({
        host: 'localhost',
        port: 6333,
        apiKey: 'test-api-key',
        https: true,
        prefix: 'test',
      });
    });

    it('should use gRPC when preferred and grpcPort is available', async () => {
      const grpcConfig = createValidConfig({
        qdrant: {
          host: 'localhost',
          port: 6333,
          grpcPort: 6334,
          preferGrpc: true,
          https: false,
          apiKey: 'test-api-key',
          prefix: 'test',
        },
      });

      qdrantManager = new QdrantManager(grpcConfig);

      expect(mockQdrantClient).toHaveBeenCalledWith({
        host: 'localhost',
        port: 6334,
        apiKey: 'test-api-key',
        prefix: 'test',
        grpc: true,
      });
    });

    it('should throw error when qdrant config is missing', async () => {
      const invalidConfig = createValidConfig({ qdrant: undefined });

      expect(() => new QdrantManager(invalidConfig)).toThrow(
        'Qdrant configuration is required'
      );
    });

    it('should create client without optional fields', async () => {
      const minimalConfig = createValidConfig({
        qdrant: {
          host: 'localhost',
          port: 6333,
          grpcPort: 6334,
          preferGrpc: false,
          https: false,
        },
      });

      qdrantManager = new QdrantManager(minimalConfig);

      expect(mockQdrantClient).toHaveBeenCalledWith({
        host: 'localhost',
        port: 6333,
      });
    });
  });

  describe('testConnection', () => {
    beforeEach(() => {
      qdrantManager = new QdrantManager(config);
    });

    it('should return true when connection test succeeds', async () => {
      mockClient.getCollections.mockResolvedValue({ collections: [] });

      const result = await qdrantManager.testConnection();

      expect(result).toBe(true);
      expect(mockClient.getCollections).toHaveBeenCalled();
    });

    it('should return false when connection test fails', async () => {
      mockClient.getCollections.mockRejectedValue(new Error('Connection failed'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await qdrantManager.testConnection();

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Qdrant connection test failed:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('getClusterInfo', () => {
    beforeEach(() => {
      qdrantManager = new QdrantManager(config);
    });

    it('should return cluster info when successful', async () => {
      const mockClusterInfo = { peer_id: 'test-peer', uri: 'http://localhost:6333' };
      mockClient.getClusterInfo.mockResolvedValue(mockClusterInfo);

      const result = await qdrantManager.getClusterInfo();

      expect(result).toEqual(mockClusterInfo);
      expect(mockClient.getClusterInfo).toHaveBeenCalled();
    });

    it('should throw error when cluster info request fails', async () => {
      mockClient.getClusterInfo.mockRejectedValue(new Error('API error'));

      await expect(qdrantManager.getClusterInfo()).rejects.toThrow(
        'Failed to get cluster info: API error'
      );
    });
  });

  describe('getHealth', () => {
    beforeEach(() => {
      qdrantManager = new QdrantManager(config);
    });

    it('should return true when health check succeeds', async () => {
      mockClient.healthCheck.mockResolvedValue(true);

      const result = await qdrantManager.getHealth();

      expect(result).toBe(true);
      expect(mockClient.healthCheck).toHaveBeenCalled();
    });

    it('should return false when health check fails', async () => {
      mockClient.healthCheck.mockRejectedValue(new Error('Health check failed'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await qdrantManager.getHealth();

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Health check failed:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should return true when health check returns true', async () => {
      mockClient.healthCheck.mockResolvedValue(true);

      const result = await qdrantManager.getHealth();

      expect(result).toBe(true);
    });

    it('should return false when health check returns non-true value', async () => {
      mockClient.healthCheck.mockResolvedValue('ok');

      const result = await qdrantManager.getHealth();

      expect(result).toBe(false);
    });
  });

  describe('getMetrics', () => {
    beforeEach(() => {
      qdrantManager = new QdrantManager(config);
    });

    it('should return metrics when successful', async () => {
      const mockMetrics = 'metric1{label="value"} 123\nmetric2{} 456';
      mockClient.getMetrics.mockResolvedValue(mockMetrics);

      const result = await qdrantManager.getMetrics();

      expect(result).toBe(mockMetrics);
      expect(mockClient.getMetrics).toHaveBeenCalled();
    });

    it('should throw error when metrics request fails', async () => {
      mockClient.getMetrics.mockRejectedValue(new Error('Metrics error'));

      await expect(qdrantManager.getMetrics()).rejects.toThrow(
        'Failed to get metrics: Metrics error'
      );
    });
  });

  describe('createSnapshot', () => {
    beforeEach(() => {
      qdrantManager = new QdrantManager(config);
    });

    it('should create snapshot successfully', async () => {
      const mockResult = { name: 'snapshot-123' };
      mockClient.createSnapshot.mockResolvedValue(mockResult);

      const result = await qdrantManager.createSnapshot('test-collection');

      expect(result).toEqual(mockResult);
      expect(mockClient.createSnapshot).toHaveBeenCalledWith('test-collection');
    });

    it('should throw error when snapshot creation fails', async () => {
      mockClient.createSnapshot.mockRejectedValue(new Error('Snapshot error'));

      await expect(qdrantManager.createSnapshot('test-collection')).rejects.toThrow(
        'Failed to create snapshot for collection test-collection: Snapshot error'
      );
    });
  });

  describe('listSnapshots', () => {
    beforeEach(() => {
      qdrantManager = new QdrantManager(config);
    });

    it('should list snapshots successfully', async () => {
      const mockSnapshots = [{ name: 'snapshot-1' }, { name: 'snapshot-2' }];
      mockClient.listSnapshots.mockResolvedValue(mockSnapshots);

      const result = await qdrantManager.listSnapshots('test-collection');

      expect(result).toEqual(mockSnapshots);
      expect(mockClient.listSnapshots).toHaveBeenCalledWith('test-collection');
    });

    it('should throw error when listing snapshots fails', async () => {
      mockClient.listSnapshots.mockRejectedValue(new Error('List error'));

      await expect(qdrantManager.listSnapshots('test-collection')).rejects.toThrow(
        'Failed to list snapshots for collection test-collection: List error'
      );
    });
  });

  describe('deleteSnapshot', () => {
    beforeEach(() => {
      qdrantManager = new QdrantManager(config);
    });

    it('should delete snapshot successfully', async () => {
      mockClient.deleteSnapshot.mockResolvedValue(undefined);

      const result = await qdrantManager.deleteSnapshot('test-collection', 'snapshot-1');

      expect(result).toBe(true);
      expect(mockClient.deleteSnapshot).toHaveBeenCalledWith('test-collection', 'snapshot-1');
    });

    it('should throw error when snapshot deletion fails', async () => {
      mockClient.deleteSnapshot.mockRejectedValue(new Error('Delete error'));

      await expect(
        qdrantManager.deleteSnapshot('test-collection', 'snapshot-1')
      ).rejects.toThrow(
        'Failed to delete snapshot snapshot-1 for collection test-collection: Delete error'
      );
    });
  });

  describe('recoverFromSnapshot', () => {
    beforeEach(() => {
      qdrantManager = new QdrantManager(config);
    });

    it('should recover from snapshot successfully', async () => {
      mockClient.recover.mockResolvedValue(undefined);

      const result = await qdrantManager.recoverFromSnapshot(
        'test-collection',
        '/path/to/snapshot'
      );

      expect(result).toBe(true);
      expect(mockClient.recover).toHaveBeenCalledWith('test-collection', {
        location: '/path/to/snapshot',
      });
    });

    it('should recover from snapshot with options', async () => {
      mockClient.recover.mockResolvedValue(undefined);

      const result = await qdrantManager.recoverFromSnapshot(
        'test-collection',
        '/path/to/snapshot',
        {
          priority: 'replica',
          checksum: 'abc123',
        }
      );

      expect(result).toBe(true);
      expect(mockClient.recover).toHaveBeenCalledWith('test-collection', {
        location: '/path/to/snapshot',
        priority: 'replica',
        checksum: 'abc123',
      });
    });

    it('should throw error when recovery fails', async () => {
      mockClient.recover.mockRejectedValue(new Error('Recovery error'));

      await expect(
        qdrantManager.recoverFromSnapshot('test-collection', '/path/to/snapshot')
      ).rejects.toThrow(
        'Failed to recover collection test-collection from snapshot: Recovery error'
      );
    });
  });

  describe('getClient', () => {
    beforeEach(() => {
      qdrantManager = new QdrantManager(config);
    });

    it('should return the client instance', () => {
      const client = qdrantManager.getClient();

      expect(client).toBe(mockClient);
    });
  });

  describe('getConfig', () => {
    beforeEach(() => {
      qdrantManager = new QdrantManager(config);
    });

    it('should return the current configuration', () => {
      const currentConfig = qdrantManager.getConfig();

      expect(currentConfig).toEqual(config);
    });
  });

  describe('updateConfig', () => {
    beforeEach(() => {
      qdrantManager = new QdrantManager(config);
    });

    it('should update configuration and recreate client', async () => {
      const newConfig = {
        qdrant: {
          host: 'new-host',
          port: 6334,
          grpcPort: 6335,
          preferGrpc: false,
          https: false,
        },
      };

      qdrantManager.updateConfig(newConfig);

      const updatedConfig = qdrantManager.getConfig();
      expect(updatedConfig.qdrant?.host).toBe('new-host');
      expect(updatedConfig.qdrant?.port).toBe(6334);
      expect(mockQdrantClient).toHaveBeenCalledTimes(2); // Initial + update
    });

    it('should merge partial configuration updates', () => {
      const partialUpdate = {
        batchSize: 200,
      };

      qdrantManager.updateConfig(partialUpdate);

      const updatedConfig = qdrantManager.getConfig();
      expect(updatedConfig.batchSize).toBe(200);
      expect(updatedConfig.qdrant?.host).toBe('localhost'); // Should remain unchanged
    });
  });

  describe('close', () => {
    beforeEach(() => {
      qdrantManager = new QdrantManager(config);
    });

    it('should close connection successfully', async () => {
      await qdrantManager.close();

      expect(qdrantManager.getClient()).toBeNull();
    });

    it('should handle close errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      // Force an error by making client property non-configurable
      Object.defineProperty(qdrantManager, 'client', {
        set: () => {
          throw new Error('Cannot set client');
        },
        configurable: false,
      });

      await qdrantManager.close();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Error closing Qdrant connection:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('sub-managers initialization', () => {
    it('should initialize all sub-managers', () => {
      qdrantManager = new QdrantManager(config);

      expect(qdrantManager.collections).toBeDefined();
      expect(qdrantManager.vectors).toBeDefined();
      expect(qdrantManager.search).toBeDefined();
      expect(qdrantManager.embeddings).toBeDefined();
    });
  });
});