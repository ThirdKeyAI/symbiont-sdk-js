import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { VectorOperations } from '../VectorOperations';
import { VectorConfig } from '../../../config/VectorConfig';

// Define interfaces locally for testing
interface VectorPoint {
  id: string;
  vector: number[];
  payload?: Record<string, any>;
}

interface BatchOperationResult {
  operation_id: number;
  status: 'acknowledged' | 'completed';
}

interface PointInsertRequest {
  points: VectorPoint[];
  wait?: boolean;
  ordering?: 'weak' | 'medium' | 'strong';
}

interface PointUpdateRequest {
  points: VectorPoint[];
  wait?: boolean;
  ordering?: 'weak' | 'medium' | 'strong';
}

interface PointDeleteRequest {
  ids: string[];
  wait?: boolean;
  ordering?: 'weak' | 'medium' | 'strong';
}

interface ScrollRequest {
  offset?: string;
  limit?: number;
  with_payload?: boolean;
  with_vector?: boolean;
  filter?: Record<string, any>;
}

interface ScrollResponse {
  points: VectorPoint[];
  next_page_offset?: string;
}

describe('VectorOperations', () => {
  let mockClient: any;
  let config: VectorConfig;
  let vectorOperations: VectorOperations;

  beforeEach(() => {
    mockClient = {
      upsert: vi.fn(),
      delete: vi.fn(),
      retrieve: vi.fn(),
      scroll: vi.fn(),
      setPayload: vi.fn(),
      deletePayload: vi.fn(),
      clearPayload: vi.fn(),
      count: vi.fn(),
    };

    config = {
      provider: 'qdrant',
      timeout: 60000,
      batchSize: 100,
      maxRetries: 3,
      retryDelayMs: 1000,
      defaultLimit: 10,
      defaultWithPayload: true,
      defaultWithVectors: false,
      parallelism: 1,
      connectionPoolSize: 10,
      collections: {},
    };

    vectorOperations = new VectorOperations(mockClient, config);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('insertPoint', () => {
    const mockPoint: VectorPoint = {
      id: 'test-point-1',
      vector: [0.1, 0.2, 0.3, 0.4],
      payload: { category: 'test', value: 42 },
    };

    it('should insert single point successfully', async () => {
      const mockResult = {
        operation_id: 123,
        status: 'acknowledged',
      };

      mockClient.upsert.mockResolvedValue(mockResult);

      const result = await vectorOperations.insertPoint('test-collection', mockPoint);

      expect(result).toEqual({
        operation_id: 123,
        status: 'acknowledged',
      });

      expect(mockClient.upsert).toHaveBeenCalledWith('test-collection', {
        wait: true,
        ordering: undefined,
        points: [
          {
            id: 'test-point-1',
            vector: [0.1, 0.2, 0.3, 0.4],
            payload: { category: 'test', value: 42 },
          },
        ],
      });
    });

    it('should insert point with custom options', async () => {
      const mockResult = {
        operation_id: 456,
        status: 'completed',
      };

      mockClient.upsert.mockResolvedValue(mockResult);

      const result = await vectorOperations.insertPoint(
        'test-collection',
        mockPoint,
        {
          wait: false,
          ordering: 'strong',
        }
      );

      expect(result).toEqual({
        operation_id: 456,
        status: 'completed',
      });

      expect(mockClient.upsert).toHaveBeenCalledWith('test-collection', {
        wait: false,
        ordering: 'strong',
        points: [expect.objectContaining({ id: 'test-point-1' })],
      });
    });

    it('should handle missing result fields', async () => {
      mockClient.upsert.mockResolvedValue({});

      const result = await vectorOperations.insertPoint('test-collection', mockPoint);

      expect(result).toEqual({
        operation_id: 0,
        status: 'acknowledged',
      });
    });

    it('should throw error when insertion fails', async () => {
      mockClient.upsert.mockRejectedValue(new Error('Insert failed'));

      await expect(
        vectorOperations.insertPoint('test-collection', mockPoint)
      ).rejects.toThrow(
        'Failed to insert point test-point-1 in collection test-collection: Insert failed'
      );
    });
  });

  describe('insertPoints', () => {
    const mockPoints: VectorPoint[] = [
      { id: 'point-1', vector: [0.1, 0.2], payload: { type: 'A' } },
      { id: 'point-2', vector: [0.3, 0.4], payload: { type: 'B' } },
      { id: 'point-3', vector: [0.5, 0.6], payload: { type: 'C' } },
    ];

    it('should insert multiple points in single batch', async () => {
      const mockRequest: PointInsertRequest = {
        points: mockPoints,
        wait: true,
        ordering: 'medium',
      };

      const mockResult = {
        operation_id: 789,
        status: 'acknowledged',
      };

      mockClient.upsert.mockResolvedValue(mockResult);

      const result = await vectorOperations.insertPoints('test-collection', mockRequest);

      expect(result).toEqual({
        operation_id: 789,
        status: 'acknowledged',
      });

      expect(mockClient.upsert).toHaveBeenCalledTimes(1);
      expect(mockClient.upsert).toHaveBeenCalledWith('test-collection', {
        wait: true,
        ordering: 'medium',
        points: mockPoints.map(point => ({
          id: point.id,
          vector: point.vector,
          payload: point.payload,
        })),
      });
    });

    it('should handle large batches by splitting them', async () => {
      // Create a config with small batch size
      const smallBatchConfig = { ...config, batchSize: 2 };
      vectorOperations = new VectorOperations(mockClient, smallBatchConfig);

      const mockRequest: PointInsertRequest = {
        points: mockPoints, // 3 points, batch size is 2
        wait: true,
      };

      const mockResult = {
        operation_id: 999,
        status: 'completed',
      };

      mockClient.upsert.mockResolvedValue(mockResult);

      const result = await vectorOperations.insertPoints('test-collection', mockRequest);

      expect(result).toEqual({
        operation_id: 999,
        status: 'completed',
      });

      // Should be called twice: first batch (2 points), second batch (1 point)
      expect(mockClient.upsert).toHaveBeenCalledTimes(2);
    });

    it('should throw error when batch insertion fails', async () => {
      mockClient.upsert.mockRejectedValue(new Error('Batch insert failed'));

      const mockRequest: PointInsertRequest = {
        points: mockPoints,
      };

      await expect(
        vectorOperations.insertPoints('test-collection', mockRequest)
      ).rejects.toThrow(
        'Failed to insert points in collection test-collection: Batch insert failed'
      );
    });
  });

  describe('updatePoints', () => {
    it('should update points successfully', async () => {
      const mockRequest: PointUpdateRequest = {
        points: [
          { id: 'point-1', vector: [0.7, 0.8], payload: { updated: true } },
        ],
        wait: true,
        ordering: 'strong',
      };

      const mockResult = {
        operation_id: 111,
        status: 'acknowledged',
      };

      mockClient.upsert.mockResolvedValue(mockResult);

      const result = await vectorOperations.updatePoints('test-collection', mockRequest);

      expect(result).toEqual({
        operation_id: 111,
        status: 'acknowledged',
      });

      expect(mockClient.upsert).toHaveBeenCalledWith('test-collection', {
        wait: true,
        ordering: 'strong',
        points: [
          {
            id: 'point-1',
            vector: [0.7, 0.8],
            payload: { updated: true },
          },
        ],
      });
    });

    it('should throw error when update fails', async () => {
      mockClient.upsert.mockRejectedValue(new Error('Update failed'));

      const mockRequest: PointUpdateRequest = {
        points: [{ id: 'point-1', vector: [0.1, 0.2] }],
      };

      await expect(
        vectorOperations.updatePoints('test-collection', mockRequest)
      ).rejects.toThrow(
        'Failed to update points in collection test-collection: Update failed'
      );
    });
  });

  describe('deletePoints', () => {
    it('should delete points successfully', async () => {
      const mockRequest: PointDeleteRequest = {
        ids: ['point-1', 'point-2', 'point-3'],
        wait: true,
        ordering: 'medium',
      };

      const mockResult = {
        operation_id: 222,
        status: 'completed',
      };

      mockClient.delete.mockResolvedValue(mockResult);

      const result = await vectorOperations.deletePoints('test-collection', mockRequest);

      expect(result).toEqual({
        operation_id: 222,
        status: 'completed',
      });

      expect(mockClient.delete).toHaveBeenCalledWith('test-collection', {
        wait: true,
        ordering: 'medium',
        points: ['point-1', 'point-2', 'point-3'],
      });
    });

    it('should throw error when deletion fails', async () => {
      mockClient.delete.mockRejectedValue(new Error('Delete failed'));

      const mockRequest: PointDeleteRequest = {
        ids: ['point-1'],
      };

      await expect(
        vectorOperations.deletePoints('test-collection', mockRequest)
      ).rejects.toThrow(
        'Failed to delete points in collection test-collection: Delete failed'
      );
    });
  });

  describe('getPoint', () => {
    it('should retrieve single point successfully', async () => {
      const mockRetrieveResult = [
        {
          id: 'point-1',
          vector: [0.1, 0.2, 0.3],
          payload: { category: 'test' },
        },
      ];

      mockClient.retrieve.mockResolvedValue(mockRetrieveResult);

      const result = await vectorOperations.getPoint('test-collection', 'point-1');

      expect(result).toEqual({
        id: 'point-1',
        vector: [0.1, 0.2, 0.3],
        payload: { category: 'test' },
      });

      expect(mockClient.retrieve).toHaveBeenCalledWith('test-collection', {
        ids: ['point-1'],
        with_payload: true,
        with_vector: false,
      });
    });

    it('should retrieve point with custom options', async () => {
      const mockRetrieveResult = [
        {
          id: 'point-1',
          vector: [0.1, 0.2, 0.3],
          payload: { category: 'test' },
        },
      ];

      mockClient.retrieve.mockResolvedValue(mockRetrieveResult);

      const result = await vectorOperations.getPoint(
        'test-collection',
        'point-1',
        {
          with_payload: false,
          with_vector: true,
        }
      );

      expect(result).toEqual({
        id: 'point-1',
        vector: [0.1, 0.2, 0.3],
        payload: { category: 'test' },
      });

      expect(mockClient.retrieve).toHaveBeenCalledWith('test-collection', {
        ids: ['point-1'],
        with_payload: false,
        with_vector: true,
      });
    });

    it('should return null when point not found', async () => {
      mockClient.retrieve.mockResolvedValue([]);

      const result = await vectorOperations.getPoint('test-collection', 'nonexistent');

      expect(result).toBeNull();
    });

    it('should handle points without vectors', async () => {
      const mockRetrieveResult = [
        {
          id: 'point-1',
          payload: { category: 'test' },
        },
      ];

      mockClient.retrieve.mockResolvedValue(mockRetrieveResult);

      const result = await vectorOperations.getPoint('test-collection', 'point-1');

      expect(result).toEqual({
        id: 'point-1',
        vector: [],
        payload: { category: 'test' },
      });
    });

    it('should throw error when retrieval fails', async () => {
      mockClient.retrieve.mockRejectedValue(new Error('Retrieve failed'));

      await expect(
        vectorOperations.getPoint('test-collection', 'point-1')
      ).rejects.toThrow(
        'Failed to get point point-1 from collection test-collection: Retrieve failed'
      );
    });
  });

  describe('getPoints', () => {
    it('should retrieve multiple points successfully', async () => {
      const mockRetrieveResult = [
        { id: 'point-1', vector: [0.1, 0.2], payload: { type: 'A' } },
        { id: 'point-2', vector: [0.3, 0.4], payload: { type: 'B' } },
      ];

      mockClient.retrieve.mockResolvedValue(mockRetrieveResult);

      const result = await vectorOperations.getPoints(
        'test-collection',
        ['point-1', 'point-2']
      );

      expect(result).toEqual([
        { id: 'point-1', vector: [0.1, 0.2], payload: { type: 'A' } },
        { id: 'point-2', vector: [0.3, 0.4], payload: { type: 'B' } },
      ]);

      expect(mockClient.retrieve).toHaveBeenCalledWith('test-collection', {
        ids: ['point-1', 'point-2'],
        with_payload: true,
        with_vector: false,
      });
    });

    it('should throw error when retrieval fails', async () => {
      mockClient.retrieve.mockRejectedValue(new Error('Retrieve failed'));

      await expect(
        vectorOperations.getPoints('test-collection', ['point-1'])
      ).rejects.toThrow(
        'Failed to get points from collection test-collection: Retrieve failed'
      );
    });
  });

  describe('scrollPoints', () => {
    it('should scroll points successfully', async () => {
      const mockRequest: ScrollRequest = {
        offset: 'offset-123',
        limit: 50,
        with_payload: true,
        with_vector: false,
        filter: { category: 'test' },
      };

      const mockScrollResult = {
        points: [
          { id: 'point-1', vector: [0.1, 0.2], payload: { type: 'A' } },
          { id: 'point-2', vector: [0.3, 0.4], payload: { type: 'B' } },
        ],
        next_page_offset: 'offset-456',
      };

      mockClient.scroll.mockResolvedValue(mockScrollResult);

      const result = await vectorOperations.scrollPoints('test-collection', mockRequest);

      expect(result).toEqual({
        points: [
          { id: 'point-1', vector: [0.1, 0.2], payload: { type: 'A' } },
          { id: 'point-2', vector: [0.3, 0.4], payload: { type: 'B' } },
        ],
        next_page_offset: 'offset-456',
      });

      expect(mockClient.scroll).toHaveBeenCalledWith('test-collection', {
        offset: 'offset-123',
        limit: 50,
        with_payload: true,
        with_vector: false,
        filter: { category: 'test' },
      });
    });

    it('should throw error when scrolling fails', async () => {
      mockClient.scroll.mockRejectedValue(new Error('Scroll failed'));

      await expect(
        vectorOperations.scrollPoints('test-collection', { limit: 10 })
      ).rejects.toThrow(
        'Failed to scroll points in collection test-collection: Scroll failed'
      );
    });
  });

  describe('updatePayload', () => {
    it('should update payload successfully', async () => {
      const mockResult = {
        operation_id: 333,
        status: 'acknowledged',
      };

      mockClient.setPayload.mockResolvedValue(mockResult);

      const result = await vectorOperations.updatePayload(
        'test-collection',
        ['point-1', 'point-2'],
        { updated: true, timestamp: '2023-01-01' }
      );

      expect(result).toEqual({
        operation_id: 333,
        status: 'acknowledged',
      });

      expect(mockClient.setPayload).toHaveBeenCalledWith('test-collection', {
        wait: true,
        ordering: undefined,
        payload: { updated: true, timestamp: '2023-01-01' },
        points: ['point-1', 'point-2'],
      });
    });

    it('should throw error when payload update fails', async () => {
      mockClient.setPayload.mockRejectedValue(new Error('Payload update failed'));

      await expect(
        vectorOperations.updatePayload('test-collection', ['point-1'], {})
      ).rejects.toThrow(
        'Failed to update payload for points in collection test-collection: Payload update failed'
      );
    });
  });

  describe('deletePayload', () => {
    it('should delete payload keys successfully', async () => {
      const mockResult = {
        operation_id: 444,
        status: 'completed',
      };

      mockClient.deletePayload.mockResolvedValue(mockResult);

      const result = await vectorOperations.deletePayload(
        'test-collection',
        ['point-1', 'point-2'],
        ['oldKey1', 'oldKey2'],
        { wait: false, ordering: 'weak' }
      );

      expect(result).toEqual({
        operation_id: 444,
        status: 'completed',
      });

      expect(mockClient.deletePayload).toHaveBeenCalledWith('test-collection', {
        wait: false,
        ordering: 'weak',
        keys: ['oldKey1', 'oldKey2'],
        points: ['point-1', 'point-2'],
      });
    });

    it('should throw error when payload deletion fails', async () => {
      mockClient.deletePayload.mockRejectedValue(new Error('Payload delete failed'));

      await expect(
        vectorOperations.deletePayload('test-collection', ['point-1'], ['key'])
      ).rejects.toThrow(
        'Failed to delete payload keys for points in collection test-collection: Payload delete failed'
      );
    });
  });

  describe('clearPayload', () => {
    it('should clear payload successfully', async () => {
      const mockResult = {
        operation_id: 555,
        status: 'acknowledged',
      };

      mockClient.clearPayload.mockResolvedValue(mockResult);

      const result = await vectorOperations.clearPayload(
        'test-collection',
        ['point-1', 'point-2']
      );

      expect(result).toEqual({
        operation_id: 555,
        status: 'acknowledged',
      });

      expect(mockClient.clearPayload).toHaveBeenCalledWith('test-collection', {
        wait: true,
        ordering: undefined,
        points: ['point-1', 'point-2'],
      });
    });

    it('should throw error when payload clearing fails', async () => {
      mockClient.clearPayload.mockRejectedValue(new Error('Clear payload failed'));

      await expect(
        vectorOperations.clearPayload('test-collection', ['point-1'])
      ).rejects.toThrow(
        'Failed to clear payload for points in collection test-collection: Clear payload failed'
      );
    });
  });

  describe('countPoints', () => {
    it('should count points successfully', async () => {
      const mockCountResult = {
        count: 1500,
      };

      mockClient.count.mockResolvedValue(mockCountResult);

      const result = await vectorOperations.countPoints('test-collection');

      expect(result).toBe(1500);

      expect(mockClient.count).toHaveBeenCalledWith('test-collection', {
        filter: undefined,
        exact: true,
      });
    });

    it('should count points with filter', async () => {
      const mockCountResult = {
        count: 750,
      };

      mockClient.count.mockResolvedValue(mockCountResult);

      const result = await vectorOperations.countPoints('test-collection', {
        category: 'test',
      });

      expect(result).toBe(750);

      expect(mockClient.count).toHaveBeenCalledWith('test-collection', {
        filter: { category: 'test' },
        exact: true,
      });
    });

    it('should throw error when counting fails', async () => {
      mockClient.count.mockRejectedValue(new Error('Count failed'));

      await expect(
        vectorOperations.countPoints('test-collection')
      ).rejects.toThrow(
        'Failed to count points in collection test-collection: Count failed'
      );
    });
  });
});