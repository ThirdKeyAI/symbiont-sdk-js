import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SearchEngine } from '../SearchEngine';
import { VectorConfig } from '../../../config/VectorConfig';

// Define interfaces locally for testing
interface SearchOptions {
  limit?: number;
  offset?: number;
  with_payload?: boolean;
  with_vector?: boolean;
  score_threshold?: number;
  filter?: Record<string, any>;
  params?: {
    hnsw_ef?: number;
    exact?: boolean;
  };
}

interface SearchResult {
  id: string;
  score: number;
  payload?: Record<string, any>;
  vector?: number[];
}

interface VectorPoint {
  id: string;
  vector: number[];
  payload?: Record<string, any>;
}

describe('SearchEngine', () => {
  let mockClient: any;
  let config: VectorConfig;
  let searchEngine: SearchEngine;

  beforeEach(() => {
    mockClient = {
      search: vi.fn(),
      searchBatch: vi.fn(),
      scroll: vi.fn(),
      recommend: vi.fn(),
      discover: vi.fn(),
    };

    config = {
      provider: 'qdrant',
      timeout: 60000,
      defaultLimit: 10,
      defaultWithPayload: true,
      defaultWithVectors: false,
      batchSize: 100,
      maxRetries: 3,
      retryDelayMs: 1000,
      parallelism: 1,
      connectionPoolSize: 10,
      collections: {},
    };

    searchEngine = new SearchEngine(mockClient, config);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('searchByVector', () => {
    const testVector = [0.1, 0.2, 0.3, 0.4];

    it('should search by vector with default options', async () => {
      const mockSearchResult = [
        {
          id: 'point-1',
          score: 0.95,
          payload: { category: 'test' },
          vector: [0.1, 0.2, 0.3, 0.4],
        },
        {
          id: 'point-2',
          score: 0.87,
          payload: { category: 'demo' },
          vector: [0.2, 0.3, 0.4, 0.5],
        },
      ];

      mockClient.search.mockResolvedValue(mockSearchResult);

      const result = await searchEngine.searchByVector('test-collection', testVector);

      expect(result).toEqual([
        {
          id: 'point-1',
          score: 0.95,
          payload: { category: 'test' },
          vector: [0.1, 0.2, 0.3, 0.4],
        },
        {
          id: 'point-2',
          score: 0.87,
          payload: { category: 'demo' },
          vector: [0.2, 0.3, 0.4, 0.5],
        },
      ]);

      expect(mockClient.search).toHaveBeenCalledWith('test-collection', {
        vector: testVector,
        limit: 10,
        offset: 0,
        with_payload: true,
        with_vector: false,
        score_threshold: undefined,
        filter: undefined,
        params: undefined,
      });
    });

    it('should search by vector with custom options', async () => {
      const options: SearchOptions = {
        limit: 5,
        offset: 10,
        with_payload: false,
        with_vector: true,
        score_threshold: 0.8,
        filter: { category: 'test' },
        params: { hnsw_ef: 128, exact: false },
      };

      mockClient.search.mockResolvedValue([]);

      await searchEngine.searchByVector('test-collection', testVector, options);

      expect(mockClient.search).toHaveBeenCalledWith('test-collection', {
        vector: testVector,
        limit: 5,
        offset: 10,
        with_payload: false,
        with_vector: true,
        score_threshold: 0.8,
        filter: { category: 'test' },
        params: { hnsw_ef: 128, exact: false },
      });
    });

    it('should throw error when search fails', async () => {
      mockClient.search.mockRejectedValue(new Error('Search failed'));

      await expect(
        searchEngine.searchByVector('test-collection', testVector)
      ).rejects.toThrow(
        'Failed to search by vector in collection test-collection: Search failed'
      );
    });
  });

  describe('searchByPointId', () => {
    it('should search by point ID successfully', async () => {
      const mockSearchResult = [
        {
          id: 'similar-1',
          score: 0.92,
          payload: { type: 'similar' },
        },
      ];

      mockClient.search.mockResolvedValue(mockSearchResult);

      const result = await searchEngine.searchByPointId('test-collection', 'reference-point');

      expect(result).toEqual([
        {
          id: 'similar-1',
          score: 0.92,
          payload: { type: 'similar' },
          vector: undefined,
        },
      ]);

      expect(mockClient.search).toHaveBeenCalledWith('test-collection', {
        vector: { id: 'reference-point' },
        limit: 10,
        offset: 0,
        with_payload: true,
        with_vector: false,
        score_threshold: undefined,
        filter: undefined,
        params: undefined,
      });
    });

    it('should search by point ID with custom options', async () => {
      const options: SearchOptions = {
        limit: 3,
        score_threshold: 0.9,
      };

      mockClient.search.mockResolvedValue([]);

      await searchEngine.searchByPointId('test-collection', 'reference-point', options);

      expect(mockClient.search).toHaveBeenCalledWith('test-collection', {
        vector: { id: 'reference-point' },
        limit: 3,
        offset: 0,
        with_payload: true,
        with_vector: false,
        score_threshold: 0.9,
        filter: undefined,
        params: undefined,
      });
    });

    it('should throw error when search by point ID fails', async () => {
      mockClient.search.mockRejectedValue(new Error('Point search failed'));

      await expect(
        searchEngine.searchByPointId('test-collection', 'reference-point')
      ).rejects.toThrow(
        'Failed to search by point ID reference-point in collection test-collection: Point search failed'
      );
    });
  });

  describe('searchBatch', () => {
    const testVectors = [
      [0.1, 0.2, 0.3],
      [0.4, 0.5, 0.6],
      [0.7, 0.8, 0.9],
    ];

    it('should perform batch search successfully', async () => {
      const mockBatchResult = [
        [
          { id: 'result-1-1', score: 0.95, payload: { batch: 1 } },
          { id: 'result-1-2', score: 0.87, payload: { batch: 1 } },
        ],
        [
          { id: 'result-2-1', score: 0.93, payload: { batch: 2 } },
        ],
        [
          { id: 'result-3-1', score: 0.89, payload: { batch: 3 } },
          { id: 'result-3-2', score: 0.82, payload: { batch: 3 } },
          { id: 'result-3-3', score: 0.75, payload: { batch: 3 } },
        ],
      ];

      mockClient.searchBatch.mockResolvedValue(mockBatchResult);

      const result = await searchEngine.searchBatch('test-collection', testVectors);

      expect(result).toEqual([
        [
          { id: 'result-1-1', score: 0.95, payload: { batch: 1 }, vector: undefined },
          { id: 'result-1-2', score: 0.87, payload: { batch: 1 }, vector: undefined },
        ],
        [
          { id: 'result-2-1', score: 0.93, payload: { batch: 2 }, vector: undefined },
        ],
        [
          { id: 'result-3-1', score: 0.89, payload: { batch: 3 }, vector: undefined },
          { id: 'result-3-2', score: 0.82, payload: { batch: 3 }, vector: undefined },
          { id: 'result-3-3', score: 0.75, payload: { batch: 3 }, vector: undefined },
        ],
      ]);

      expect(mockClient.searchBatch).toHaveBeenCalledWith('test-collection', {
        searches: [
          {
            vector: [0.1, 0.2, 0.3],
            limit: 10,
            offset: 0,
            with_payload: true,
            with_vector: false,
            score_threshold: undefined,
            filter: undefined,
            params: undefined,
          },
          {
            vector: [0.4, 0.5, 0.6],
            limit: 10,
            offset: 0,
            with_payload: true,
            with_vector: false,
            score_threshold: undefined,
            filter: undefined,
            params: undefined,
          },
          {
            vector: [0.7, 0.8, 0.9],
            limit: 10,
            offset: 0,
            with_payload: true,
            with_vector: false,
            score_threshold: undefined,
            filter: undefined,
            params: undefined,
          },
        ],
      });
    });

    it('should perform batch search with custom options', async () => {
      const options: SearchOptions = {
        limit: 3,
        with_vector: true,
        filter: { active: true },
      };

      mockClient.searchBatch.mockResolvedValue([[], [], []]);

      await searchEngine.searchBatch('test-collection', testVectors, options);

      expect(mockClient.searchBatch).toHaveBeenCalledWith('test-collection', {
        searches: testVectors.map(vector => ({
          vector,
          limit: 3,
          offset: 0,
          with_payload: true,
          with_vector: true,
          score_threshold: undefined,
          filter: { active: true },
          params: undefined,
        })),
      });
    });

    it('should throw error when batch search fails', async () => {
      mockClient.searchBatch.mockRejectedValue(new Error('Batch search failed'));

      await expect(
        searchEngine.searchBatch('test-collection', testVectors)
      ).rejects.toThrow(
        'Failed to perform batch search in collection test-collection: Batch search failed'
      );
    });
  });

  describe('searchByFilter', () => {
    it('should search by filter successfully', async () => {
      const filter = { category: 'test', active: true };
      const mockScrollResult = {
        points: [
          { id: 'point-1', vector: [0.1, 0.2], payload: { category: 'test', active: true } },
          { id: 'point-2', vector: [0.3, 0.4], payload: { category: 'test', active: true } },
        ],
      };

      mockClient.scroll.mockResolvedValue(mockScrollResult);

      const result = await searchEngine.searchByFilter('test-collection', filter);

      expect(result).toEqual([
        { id: 'point-1', vector: [0.1, 0.2], payload: { category: 'test', active: true } },
        { id: 'point-2', vector: [0.3, 0.4], payload: { category: 'test', active: true } },
      ]);

      expect(mockClient.scroll).toHaveBeenCalledWith('test-collection', {
        filter,
        limit: 10,
        offset: 0,
        with_payload: true,
        with_vector: false,
      });
    });

    it('should handle points without vectors', async () => {
      const filter = { type: 'metadata-only' };
      const mockScrollResult = {
        points: [
          { id: 'point-1', payload: { type: 'metadata-only' } },
        ],
      };

      mockClient.scroll.mockResolvedValue(mockScrollResult);

      const result = await searchEngine.searchByFilter('test-collection', filter);

      expect(result).toEqual([
        { id: 'point-1', vector: [], payload: { type: 'metadata-only' } },
      ]);
    });

    it('should throw error when filter search fails', async () => {
      mockClient.scroll.mockRejectedValue(new Error('Filter search failed'));

      await expect(
        searchEngine.searchByFilter('test-collection', { category: 'test' })
      ).rejects.toThrow(
        'Failed to search by filter in collection test-collection: Filter search failed'
      );
    });
  });

  describe('searchWithParams', () => {
    const testVector = [0.1, 0.2, 0.3, 0.4];

    it('should search with custom parameters', async () => {
      const params = { hnsw_ef: 256, exact: true };
      const mockSearchResult = [
        { id: 'exact-1', score: 1.0, payload: { method: 'exact' } },
      ];

      mockClient.search.mockResolvedValue(mockSearchResult);

      const result = await searchEngine.searchWithParams(
        'test-collection',
        testVector,
        params
      );

      expect(result).toEqual([
        { id: 'exact-1', score: 1.0, payload: { method: 'exact' }, vector: undefined },
      ]);

      expect(mockClient.search).toHaveBeenCalledWith('test-collection', {
        vector: testVector,
        limit: 10,
        offset: 0,
        with_payload: true,
        with_vector: false,
        score_threshold: undefined,
        filter: undefined,
        params: { hnsw_ef: 256, exact: true },
      });
    });

    it('should combine custom params with search options', async () => {
      const params = { hnsw_ef: 128 };
      const options: SearchOptions = {
        limit: 5,
        score_threshold: 0.9,
        filter: { quality: 'high' },
      };

      mockClient.search.mockResolvedValue([]);

      await searchEngine.searchWithParams('test-collection', testVector, params, options);

      expect(mockClient.search).toHaveBeenCalledWith('test-collection', {
        vector: testVector,
        limit: 5,
        offset: 0,
        with_payload: true,
        with_vector: false,
        score_threshold: 0.9,
        filter: { quality: 'high' },
        params: { hnsw_ef: 128 },
      });
    });

    it('should throw error when parametric search fails', async () => {
      mockClient.search.mockRejectedValue(new Error('Parametric search failed'));

      await expect(
        searchEngine.searchWithParams('test-collection', testVector, {})
      ).rejects.toThrow(
        'Failed to search with custom params in collection test-collection: Parametric search failed'
      );
    });
  });

  describe('recommend', () => {
    it('should recommend with point IDs', async () => {
      const positive = ['good-1', 'good-2'];
      const negative = ['bad-1'];
      const mockRecommendResult = [
        { id: 'recommendation-1', score: 0.91, payload: { recommended: true } },
      ];

      mockClient.recommend.mockResolvedValue(mockRecommendResult);

      const result = await searchEngine.recommend('test-collection', positive, negative);

      expect(result).toEqual([
        { id: 'recommendation-1', score: 0.91, payload: { recommended: true }, vector: undefined },
      ]);

      expect(mockClient.recommend).toHaveBeenCalledWith('test-collection', {
        positive: [{ id: 'good-1' }, { id: 'good-2' }],
        negative: [{ id: 'bad-1' }],
        limit: 10,
        offset: 0,
        with_payload: true,
        with_vector: false,
        score_threshold: undefined,
        filter: undefined,
        params: undefined,
      });
    });

    it('should recommend with vectors', async () => {
      const positive = [[0.1, 0.2, 0.3], [0.4, 0.5, 0.6]];
      const negative = [[0.7, 0.8, 0.9]];

      mockClient.recommend.mockResolvedValue([]);

      await searchEngine.recommend('test-collection', positive, negative);

      expect(mockClient.recommend).toHaveBeenCalledWith('test-collection', {
        positive: [[0.1, 0.2, 0.3], [0.4, 0.5, 0.6]],
        negative: [[0.7, 0.8, 0.9]],
        limit: 10,
        offset: 0,
        with_payload: true,
        with_vector: false,
        score_threshold: undefined,
        filter: undefined,
        params: undefined,
      });
    });

    it('should recommend with mixed point IDs and vectors', async () => {
      const positive = ['point-1', [0.1, 0.2, 0.3]];
      const negative: Array<string | number[]> = [];

      mockClient.recommend.mockResolvedValue([]);

      await searchEngine.recommend('test-collection', positive, negative);

      expect(mockClient.recommend).toHaveBeenCalledWith('test-collection', {
        positive: [{ id: 'point-1' }, [0.1, 0.2, 0.3]],
        negative: [],
        limit: 10,
        offset: 0,
        with_payload: true,
        with_vector: false,
        score_threshold: undefined,
        filter: undefined,
        params: undefined,
      });
    });

    it('should throw error when recommendation fails', async () => {
      mockClient.recommend.mockRejectedValue(new Error('Recommendation failed'));

      await expect(
        searchEngine.recommend('test-collection', ['point-1'])
      ).rejects.toThrow(
        'Failed to get recommendations in collection test-collection: Recommendation failed'
      );
    });
  });

  describe('discover', () => {
    it('should discover with point ID target', async () => {
      const target = 'target-point';
      const context = [
        { positive: ['good-1', 'good-2'], negative: ['bad-1'] },
        { positive: [[0.1, 0.2, 0.3]] },
      ];

      const mockDiscoverResult = [
        { id: 'discovery-1', score: 0.88, payload: { discovered: true } },
      ];

      mockClient.discover.mockResolvedValue(mockDiscoverResult);

      const result = await searchEngine.discover('test-collection', target, context);

      expect(result).toEqual([
        { id: 'discovery-1', score: 0.88, payload: { discovered: true }, vector: undefined },
      ]);

      expect(mockClient.discover).toHaveBeenCalledWith('test-collection', {
        target: { id: 'target-point' },
        context: [
          {
            positive: [{ id: 'good-1' }, { id: 'good-2' }],
            negative: [{ id: 'bad-1' }],
          },
          {
            positive: [[0.1, 0.2, 0.3]],
            negative: [],
          },
        ],
        limit: 10,
        offset: 0,
        with_payload: true,
        with_vector: false,
        score_threshold: undefined,
        filter: undefined,
        params: undefined,
      });
    });

    it('should discover with vector target', async () => {
      const target = [0.5, 0.6, 0.7];
      const context = [{ positive: ['reference-1'] }];

      mockClient.discover.mockResolvedValue([]);

      await searchEngine.discover('test-collection', target, context);

      expect(mockClient.discover).toHaveBeenCalledWith('test-collection', {
        target: [0.5, 0.6, 0.7],
        context: [
          {
            positive: [{ id: 'reference-1' }],
            negative: [],
          },
        ],
        limit: 10,
        offset: 0,
        with_payload: true,
        with_vector: false,
        score_threshold: undefined,
        filter: undefined,
        params: undefined,
      });
    });

    it('should throw error when discovery fails', async () => {
      mockClient.discover.mockRejectedValue(new Error('Discovery failed'));

      await expect(
        searchEngine.discover('test-collection', 'target', [])
      ).rejects.toThrow(
        'Failed to discover points in collection test-collection: Discovery failed'
      );
    });
  });

  describe('hybridSearch', () => {
    it('should perform hybrid search with dense vector only', async () => {
      const denseVector = [0.1, 0.2, 0.3, 0.4];
      const mockSearchResult = [
        { id: 'hybrid-1', score: 0.92, payload: { type: 'dense' } },
      ];

      mockClient.search.mockResolvedValue(mockSearchResult);

      const result = await searchEngine.hybridSearch('test-collection', denseVector);

      expect(result).toEqual([
        { id: 'hybrid-1', score: 0.92, payload: { type: 'dense' }, vector: undefined },
      ]);

      expect(mockClient.search).toHaveBeenCalledWith('test-collection', {
        vector: { dense: denseVector },
        limit: 10,
        offset: 0,
        with_payload: true,
        with_vector: false,
        score_threshold: undefined,
        filter: undefined,
        params: undefined,
      });
    });

    it('should perform hybrid search with sparse vector only', async () => {
      const sparseVector = { indices: [1, 5, 10], values: [0.8, 0.6, 0.4] };

      mockClient.search.mockResolvedValue([]);

      await searchEngine.hybridSearch('test-collection', undefined, sparseVector);

      expect(mockClient.search).toHaveBeenCalledWith('test-collection', {
        vector: { sparse: sparseVector },
        limit: 10,
        offset: 0,
        with_payload: true,
        with_vector: false,
        score_threshold: undefined,
        filter: undefined,
        params: undefined,
      });
    });

    it('should perform hybrid search with both dense and sparse vectors', async () => {
      const denseVector = [0.1, 0.2, 0.3];
      const sparseVector = { indices: [2, 7], values: [0.9, 0.3] };

      mockClient.search.mockResolvedValue([]);

      await searchEngine.hybridSearch('test-collection', denseVector, sparseVector);

      expect(mockClient.search).toHaveBeenCalledWith('test-collection', {
        vector: {
          dense: denseVector,
          sparse: sparseVector,
        },
        limit: 10,
        offset: 0,
        with_payload: true,
        with_vector: false,
        score_threshold: undefined,
        filter: undefined,
        params: undefined,
      });
    });

    it('should throw error when no vectors provided', async () => {
      await expect(
        searchEngine.hybridSearch('test-collection')
      ).rejects.toThrow('Either dense or sparse vector must be provided');
    });

    it('should throw error when hybrid search fails', async () => {
      mockClient.search.mockRejectedValue(new Error('Hybrid search failed'));

      await expect(
        searchEngine.hybridSearch('test-collection', [0.1, 0.2])
      ).rejects.toThrow(
        'Failed to perform hybrid search in collection test-collection: Hybrid search failed'
      );
    });
  });
});