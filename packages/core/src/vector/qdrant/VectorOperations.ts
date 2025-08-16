import { QdrantClient } from '@qdrant/qdrant-js';
import { VectorConfig } from '../../config/VectorConfig';
import {
  VectorPoint,
  BatchOperationResult,
  PointInsertRequest,
  PointUpdateRequest,
  PointDeleteRequest,
  ScrollRequest,
  ScrollResponse,
} from '@symbiont/types';

/**
 * Handles CRUD operations on vectors in Qdrant
 */
export class VectorOperations {
  constructor(
    private client: QdrantClient,
    private config: VectorConfig
  ) {}

  /**
   * Inserts a single vector point
   */
  async insertPoint(
    collectionName: string,
    point: VectorPoint,
    options?: {
      wait?: boolean;
      ordering?: 'weak' | 'medium' | 'strong';
    }
  ): Promise<BatchOperationResult> {
    try {
      const result = await this.client.upsert(collectionName, {
        wait: options?.wait ?? true,
        ordering: options?.ordering,
        points: [
          {
            id: point.id,
            vector: point.vector,
            payload: point.payload,
          },
        ],
      });

      return {
        operation_id: result.operation_id || 0,
        status: result.status || 'acknowledged',
      };
    } catch (error) {
      const err = error as Error;
      throw new Error(`Failed to insert point ${point.id} in collection ${collectionName}: ${err.message}`);
    }
  }

  /**
   * Inserts multiple vector points in batch
   */
  async insertPoints(
    collectionName: string,
    request: PointInsertRequest
  ): Promise<BatchOperationResult> {
    try {
      const batchSize = this.config.batchSize || 100;
      const points = request.points;
      
      // Process in batches if necessary
      if (points.length <= batchSize) {
        const result = await this.client.upsert(collectionName, {
          wait: request.wait,
          ordering: request.ordering,
          points: points.map(point => ({
            id: point.id,
            vector: point.vector,
            payload: point.payload,
          })),
        });

        return {
          operation_id: result.operation_id || 0,
          status: result.status || 'acknowledged',
        };
      }

      // Handle large batches
      let lastResult: any = { operation_id: 0, status: 'acknowledged' };
      for (let i = 0; i < points.length; i += batchSize) {
        const batch = points.slice(i, i + batchSize);
        lastResult = await this.client.upsert(collectionName, {
          wait: request.wait,
          ordering: request.ordering,
          points: batch.map(point => ({
            id: point.id,
            vector: point.vector,
            payload: point.payload,
          })),
        });
      }

      return {
        operation_id: lastResult.operation_id || 0,
        status: lastResult.status || 'acknowledged',
      };
    } catch (error) {
      const err = error as Error;
      throw new Error(`Failed to insert points in collection ${collectionName}: ${err.message}`);
    }
  }

  /**
   * Updates existing vector points
   */
  async updatePoints(
    collectionName: string,
    request: PointUpdateRequest
  ): Promise<BatchOperationResult> {
    try {
      const result = await this.client.upsert(collectionName, {
        wait: request.wait,
        ordering: request.ordering,
        points: request.points.map(point => ({
          id: point.id,
          vector: point.vector,
          payload: point.payload,
        })),
      });

      return {
        operation_id: result.operation_id || 0,
        status: result.status || 'acknowledged',
      };
    } catch (error) {
      const err = error as Error;
      throw new Error(`Failed to update points in collection ${collectionName}: ${err.message}`);
    }
  }

  /**
   * Deletes vector points by IDs
   */
  async deletePoints(
    collectionName: string,
    request: PointDeleteRequest
  ): Promise<BatchOperationResult> {
    try {
      const result = await this.client.delete(collectionName, {
        wait: request.wait,
        ordering: request.ordering,
        points: request.ids,
      });

      return {
        operation_id: result.operation_id || 0,
        status: result.status || 'acknowledged',
      };
    } catch (error) {
      const err = error as Error;
      throw new Error(`Failed to delete points in collection ${collectionName}: ${err.message}`);
    }
  }

  /**
   * Retrieves a single vector point by ID
   */
  async getPoint(
    collectionName: string,
    pointId: string,
    options?: {
      with_payload?: boolean;
      with_vector?: boolean;
    }
  ): Promise<VectorPoint | null> {
    try {
      const result = await this.client.retrieve(collectionName, {
        ids: [pointId],
        with_payload: options?.with_payload ?? true,
        with_vector: options?.with_vector ?? false,
      });

      if (result.length === 0) {
        return null;
      }

      const point = result[0];
      return {
        id: point.id as string,
        vector: point.vector || [],
        payload: point.payload,
      };
    } catch (error) {
      const err = error as Error;
      throw new Error(`Failed to get point ${pointId} from collection ${collectionName}: ${err.message}`);
    }
  }

  /**
   * Retrieves multiple vector points by IDs
   */
  async getPoints(
    collectionName: string,
    pointIds: string[],
    options?: {
      with_payload?: boolean;
      with_vector?: boolean;
    }
  ): Promise<VectorPoint[]> {
    try {
      const result = await this.client.retrieve(collectionName, {
        ids: pointIds,
        with_payload: options?.with_payload ?? true,
        with_vector: options?.with_vector ?? false,
      });

      return result.map((point: any) => ({
        id: point.id as string,
        vector: point.vector || [],
        payload: point.payload,
      }));
    } catch (error) {
      const err = error as Error;
      throw new Error(`Failed to get points from collection ${collectionName}: ${err.message}`);
    }
  }

  /**
   * Scrolls through all points in a collection with pagination
   */
  async scrollPoints(
    collectionName: string,
    request: ScrollRequest
  ): Promise<ScrollResponse> {
    try {
      const result = await this.client.scroll(collectionName, {
        offset: request.offset,
        limit: request.limit,
        with_payload: request.with_payload,
        with_vector: request.with_vector,
        filter: request.filter,
      });

      return {
        points: result.points.map((point: any) => ({
          id: point.id as string,
          vector: point.vector || [],
          payload: point.payload,
        })),
        next_page_offset: result.next_page_offset,
      };
    } catch (error) {
      const err = error as Error;
      throw new Error(`Failed to scroll points in collection ${collectionName}: ${err.message}`);
    }
  }

  /**
   * Updates payload for existing points
   */
  async updatePayload(
    collectionName: string,
    pointIds: string[],
    payload: Record<string, any>,
    options?: {
      wait?: boolean;
      ordering?: 'weak' | 'medium' | 'strong';
    }
  ): Promise<BatchOperationResult> {
    try {
      const result = await this.client.setPayload(collectionName, {
        wait: options?.wait ?? true,
        ordering: options?.ordering,
        payload,
        points: pointIds,
      });

      return {
        operation_id: result.operation_id || 0,
        status: result.status || 'acknowledged',
      };
    } catch (error) {
      const err = error as Error;
      throw new Error(`Failed to update payload for points in collection ${collectionName}: ${err.message}`);
    }
  }

  /**
   * Deletes specific payload keys from points
   */
  async deletePayload(
    collectionName: string,
    pointIds: string[],
    keys: string[],
    options?: {
      wait?: boolean;
      ordering?: 'weak' | 'medium' | 'strong';
    }
  ): Promise<BatchOperationResult> {
    try {
      const result = await this.client.deletePayload(collectionName, {
        wait: options?.wait ?? true,
        ordering: options?.ordering,
        keys,
        points: pointIds,
      });

      return {
        operation_id: result.operation_id || 0,
        status: result.status || 'acknowledged',
      };
    } catch (error) {
      const err = error as Error;
      throw new Error(`Failed to delete payload keys for points in collection ${collectionName}: ${err.message}`);
    }
  }

  /**
   * Clears all payload from points
   */
  async clearPayload(
    collectionName: string,
    pointIds: string[],
    options?: {
      wait?: boolean;
      ordering?: 'weak' | 'medium' | 'strong';
    }
  ): Promise<BatchOperationResult> {
    try {
      const result = await this.client.clearPayload(collectionName, {
        wait: options?.wait ?? true,
        ordering: options?.ordering,
        points: pointIds,
      });

      return {
        operation_id: result.operation_id || 0,
        status: result.status || 'acknowledged',
      };
    } catch (error) {
      const err = error as Error;
      throw new Error(`Failed to clear payload for points in collection ${collectionName}: ${err.message}`);
    }
  }

  /**
   * Counts points in a collection with optional filter
   */
  async countPoints(
    collectionName: string,
    filter?: Record<string, any>
  ): Promise<number> {
    try {
      const result = await this.client.count(collectionName, {
        filter,
        exact: true,
      });

      return result.count;
    } catch (error) {
      const err = error as Error;
      throw new Error(`Failed to count points in collection ${collectionName}: ${err.message}`);
    }
  }
}