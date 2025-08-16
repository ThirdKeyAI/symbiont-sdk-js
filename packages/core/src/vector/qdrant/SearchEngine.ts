import { QdrantClient } from '@qdrant/qdrant-js';
import { VectorConfig } from '../../config/VectorConfig';
import {
  SearchOptions,
  SearchResult,
  VectorPoint,
} from '@symbiont/types';

/**
 * Handles semantic search operations in Qdrant
 */
export class SearchEngine {
  constructor(
    private client: QdrantClient,
    private config: VectorConfig
  ) {}

  /**
   * Performs similarity search using a vector
   */
  async searchByVector(
    collectionName: string,
    vector: number[],
    options?: SearchOptions
  ): Promise<SearchResult[]> {
    try {
      const searchOptions = {
        limit: options?.limit ?? this.config.defaultLimit ?? 10,
        offset: options?.offset ?? 0,
        with_payload: options?.with_payload ?? this.config.defaultWithPayload ?? true,
        with_vector: options?.with_vector ?? this.config.defaultWithVectors ?? false,
        score_threshold: options?.score_threshold,
        filter: options?.filter,
        params: options?.params,
      };

      const result = await this.client.search(collectionName, {
        vector,
        ...searchOptions,
      });

      return result.map((point: any) => ({
        id: point.id as string,
        score: point.score,
        payload: point.payload,
        vector: point.vector,
      }));
    } catch (error) {
      const err = error as Error;
      throw new Error(`Failed to search by vector in collection ${collectionName}: ${err.message}`);
    }
  }

  /**
   * Performs similarity search using a point ID
   */
  async searchByPointId(
    collectionName: string,
    pointId: string,
    options?: SearchOptions
  ): Promise<SearchResult[]> {
    try {
      const searchOptions = {
        limit: options?.limit ?? this.config.defaultLimit ?? 10,
        offset: options?.offset ?? 0,
        with_payload: options?.with_payload ?? this.config.defaultWithPayload ?? true,
        with_vector: options?.with_vector ?? this.config.defaultWithVectors ?? false,
        score_threshold: options?.score_threshold,
        filter: options?.filter,
        params: options?.params,
      };

      const result = await this.client.search(collectionName, {
        vector: { id: pointId },
        ...searchOptions,
      });

      return result.map((point: any) => ({
        id: point.id as string,
        score: point.score,
        payload: point.payload,
        vector: point.vector,
      }));
    } catch (error) {
      const err = error as Error;
      throw new Error(`Failed to search by point ID ${pointId} in collection ${collectionName}: ${err.message}`);
    }
  }

  /**
   * Performs batch similarity search with multiple vectors
   */
  async searchBatch(
    collectionName: string,
    vectors: number[][],
    options?: SearchOptions
  ): Promise<SearchResult[][]> {
    try {
      const searchOptions = {
        limit: options?.limit ?? this.config.defaultLimit ?? 10,
        offset: options?.offset ?? 0,
        with_payload: options?.with_payload ?? this.config.defaultWithPayload ?? true,
        with_vector: options?.with_vector ?? this.config.defaultWithVectors ?? false,
        score_threshold: options?.score_threshold,
        filter: options?.filter,
        params: options?.params,
      };

      const searches = vectors.map(vector => ({
        vector,
        ...searchOptions,
      }));

      const result = await this.client.searchBatch(collectionName, { searches });

      return result.map((searchResult: any[]) =>
        searchResult.map((point: any) => ({
          id: point.id as string,
          score: point.score,
          payload: point.payload,
          vector: point.vector,
        }))
      );
    } catch (error) {
      const err = error as Error;
      throw new Error(`Failed to perform batch search in collection ${collectionName}: ${err.message}`);
    }
  }

  /**
   * Searches for points with specific payload conditions
   */
  async searchByFilter(
    collectionName: string,
    filter: Record<string, any>,
    options?: Omit<SearchOptions, 'filter'>
  ): Promise<VectorPoint[]> {
    try {
      const searchOptions = {
        limit: options?.limit ?? this.config.defaultLimit ?? 10,
        offset: options?.offset ?? 0,
        with_payload: options?.with_payload ?? this.config.defaultWithPayload ?? true,
        with_vector: options?.with_vector ?? this.config.defaultWithVectors ?? false,
      };

      const result = await this.client.scroll(collectionName, {
        filter,
        ...searchOptions,
      });

      return result.points.map((point: any) => ({
        id: point.id as string,
        vector: point.vector || [],
        payload: point.payload,
      }));
    } catch (error) {
      const err = error as Error;
      throw new Error(`Failed to search by filter in collection ${collectionName}: ${err.message}`);
    }
  }

  /**
   * Performs approximate nearest neighbor search with custom parameters
   */
  async searchWithParams(
    collectionName: string,
    vector: number[],
    params: {
      hnsw_ef?: number;
      exact?: boolean;
    },
    options?: SearchOptions
  ): Promise<SearchResult[]> {
    try {
      const searchOptions = {
        limit: options?.limit ?? this.config.defaultLimit ?? 10,
        offset: options?.offset ?? 0,
        with_payload: options?.with_payload ?? this.config.defaultWithPayload ?? true,
        with_vector: options?.with_vector ?? this.config.defaultWithVectors ?? false,
        score_threshold: options?.score_threshold,
        filter: options?.filter,
        params,
      };

      const result = await this.client.search(collectionName, {
        vector,
        ...searchOptions,
      });

      return result.map((point: any) => ({
        id: point.id as string,
        score: point.score,
        payload: point.payload,
        vector: point.vector,
      }));
    } catch (error) {
      const err = error as Error;
      throw new Error(`Failed to search with custom params in collection ${collectionName}: ${err.message}`);
    }
  }

  /**
   * Finds recommendations based on positive and negative examples
   */
  async recommend(
    collectionName: string,
    positive: Array<string | number[]>,
    negative: Array<string | number[]> = [],
    options?: SearchOptions
  ): Promise<SearchResult[]> {
    try {
      const searchOptions = {
        limit: options?.limit ?? this.config.defaultLimit ?? 10,
        offset: options?.offset ?? 0,
        with_payload: options?.with_payload ?? this.config.defaultWithPayload ?? true,
        with_vector: options?.with_vector ?? this.config.defaultWithVectors ?? false,
        score_threshold: options?.score_threshold,
        filter: options?.filter,
        params: options?.params,
      };

      const positiveVectors = positive.map(item => 
        typeof item === 'string' ? { id: item } : item
      );
      
      const negativeVectors = negative.map(item => 
        typeof item === 'string' ? { id: item } : item
      );

      const result = await this.client.recommend(collectionName, {
        positive: positiveVectors,
        negative: negativeVectors,
        ...searchOptions,
      });

      return result.map((point: any) => ({
        id: point.id as string,
        score: point.score,
        payload: point.payload,
        vector: point.vector,
      }));
    } catch (error) {
      const err = error as Error;
      throw new Error(`Failed to get recommendations in collection ${collectionName}: ${err.message}`);
    }
  }

  /**
   * Discovers similar points to a set of positive examples
   */
  async discover(
    collectionName: string,
    target: string | number[],
    context: Array<{
      positive?: Array<string | number[]>;
      negative?: Array<string | number[]>;
    }>,
    options?: SearchOptions
  ): Promise<SearchResult[]> {
    try {
      const searchOptions = {
        limit: options?.limit ?? this.config.defaultLimit ?? 10,
        offset: options?.offset ?? 0,
        with_payload: options?.with_payload ?? this.config.defaultWithPayload ?? true,
        with_vector: options?.with_vector ?? this.config.defaultWithVectors ?? false,
        score_threshold: options?.score_threshold,
        filter: options?.filter,
        params: options?.params,
      };

      const targetVector = typeof target === 'string' ? { id: target } : target;
      
      const contextPairs = context.map(ctx => ({
        positive: ctx.positive?.map(item => 
          typeof item === 'string' ? { id: item } : item
        ) || [],
        negative: ctx.negative?.map(item => 
          typeof item === 'string' ? { id: item } : item
        ) || [],
      }));

      const result = await this.client.discover(collectionName, {
        target: targetVector,
        context: contextPairs,
        ...searchOptions,
      });

      return result.map((point: any) => ({
        id: point.id as string,
        score: point.score,
        payload: point.payload,
        vector: point.vector,
      }));
    } catch (error) {
      const err = error as Error;
      throw new Error(`Failed to discover points in collection ${collectionName}: ${err.message}`);
    }
  }

  /**
   * Performs hybrid search combining dense and sparse vectors
   */
  async hybridSearch(
    collectionName: string,
    denseVector?: number[],
    sparseVector?: { indices: number[]; values: number[] },
    options?: SearchOptions
  ): Promise<SearchResult[]> {
    try {
      if (!denseVector && !sparseVector) {
        throw new Error('Either dense or sparse vector must be provided');
      }

      const searchOptions = {
        limit: options?.limit ?? this.config.defaultLimit ?? 10,
        offset: options?.offset ?? 0,
        with_payload: options?.with_payload ?? this.config.defaultWithPayload ?? true,
        with_vector: options?.with_vector ?? this.config.defaultWithVectors ?? false,
        score_threshold: options?.score_threshold,
        filter: options?.filter,
        params: options?.params,
      };

      const queryVector: any = {};
      if (denseVector) {
        queryVector.dense = denseVector;
      }
      if (sparseVector) {
        queryVector.sparse = sparseVector;
      }

      const result = await this.client.search(collectionName, {
        vector: queryVector,
        ...searchOptions,
      });

      return result.map((point: any) => ({
        id: point.id as string,
        score: point.score,
        payload: point.payload,
        vector: point.vector,
      }));
    } catch (error) {
      const err = error as Error;
      throw new Error(`Failed to perform hybrid search in collection ${collectionName}: ${err.message}`);
    }
  }
}