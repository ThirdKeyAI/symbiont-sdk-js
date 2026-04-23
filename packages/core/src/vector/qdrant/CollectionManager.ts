import { QdrantClient } from '@qdrant/qdrant-js';
import { VectorConfig } from '../../config/VectorConfig';
import {
  Collection,
  CollectionInfo,
  CollectionCreateRequest,
  BatchOperationResult,
} from 'symbi-types';

/**
 * Manages collection lifecycle operations in Qdrant
 */
export class CollectionManager {
  constructor(
    private client: QdrantClient,
    private config: VectorConfig
  ) {}

  /**
   * Creates a new collection
   */
  async create(request: CollectionCreateRequest): Promise<boolean> {
    try {
      await this.client.createCollection(request.name, {
        vectors: request.vectors,
        shard_number: request.shard_number,
        replication_factor: request.replication_factor,
        write_consistency_factor: request.write_consistency_factor,
        on_disk_payload: request.on_disk_payload,
        hnsw_config: request.hnsw_config,
        optimizers_config: request.optimizer_config,
        wal_config: request.wal_config,
      });
      return true;
    } catch (error) {
      const errorMessage = this.handleError(error);
      const rootMessage = this.extractRootErrorMessage(errorMessage);
      throw new Error(`Failed to create collection ${request.name}: ${rootMessage}`);
    }
  }

  /**
   * Lists all collections
   */
  async list(): Promise<Collection[]> {
    try {
      const response = await this.client.getCollections();
      return response.collections.map((collection: any) => ({
        name: collection.name,
        dimension: collection.config?.params?.vectors?.size || 0,
        distance: collection.config?.params?.vectors?.distance || 'Cosine',
        config: collection.config,
      }));
    } catch (error) {
      const errorMessage = this.handleError(error);
      const rootMessage = this.extractRootErrorMessage(errorMessage);
      throw new Error(`Failed to list collections: ${rootMessage}`);
    }
  }

  /**
   * Gets detailed information about a collection
   */
  async getInfo(collectionName: string): Promise<CollectionInfo> {
    try {
      const response = await this.client.getCollection(collectionName);

      // Narrow qdrant-js response types to our stricter CollectionInfo schema:
      // - response.status can be "grey" (initializing); surface as "red"
      // - response.optimizer_status can be { error } object; surface as "error"
      // - response has no "name" field; use the caller-supplied collectionName
      const status =
        response.status === 'grey' ? 'red' : response.status;
      const optimizer_status =
        typeof response.optimizer_status === 'object' ? 'error' : response.optimizer_status;

      const params = response.config?.params;
      const vectors = params?.vectors;
      const vectorConfig =
        vectors && typeof vectors === 'object' && 'size' in vectors && 'distance' in vectors
          ? { size: vectors.size as number, distance: vectors.distance as 'Cosine' | 'Dot' | 'Euclid' | 'Manhattan' }
          : { size: 0, distance: 'Cosine' as const };

      return {
        name: collectionName,
        status,
        optimizer_status,
        vectors_count: response.vectors_count || 0,
        indexed_vectors_count: response.indexed_vectors_count || 0,
        points_count: response.points_count || 0,
        segments_count: response.segments_count || 0,
        config: {
          params: {
            vectors: vectorConfig,
            shard_number: (params?.shard_number as number) ?? 1,
            replication_factor: (params?.replication_factor as number) ?? 1,
            write_consistency_factor: (params?.write_consistency_factor as number) ?? 1,
            on_disk_payload: (params?.on_disk_payload as boolean) ?? false,
          },
        },
        payload_schema: response.payload_schema as Record<string, unknown> | undefined,
      };
    } catch (error) {
      const errorMessage = this.handleError(error);
      const rootMessage = this.extractRootErrorMessage(errorMessage);
      throw new Error(`Failed to get collection info for ${collectionName}: ${rootMessage}`);
    }
  }

  /**
   * Checks if a collection exists
   */
  async exists(collectionName: string): Promise<boolean> {
    try {
      await this.client.getCollection(collectionName);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Deletes a collection
   */
  async delete(collectionName: string): Promise<boolean> {
    try {
      await this.client.deleteCollection(collectionName);
      return true;
    } catch (error) {
      const errorMessage = this.handleError(error);
      const rootMessage = this.extractRootErrorMessage(errorMessage);
      throw new Error(`Failed to delete collection ${collectionName}: ${rootMessage}`);
    }
  }

  /**
   * Updates collection parameters
   */
  async updateCollection(
    collectionName: string,
    updates: {
      optimizers_config?: any;
      params?: any;
    }
  ): Promise<boolean> {
    try {
      await this.client.updateCollection(collectionName, updates);
      return true;
    } catch (error) {
      const errorMessage = this.handleError(error);
      const rootMessage = this.extractRootErrorMessage(errorMessage);
      throw new Error(`Failed to update collection ${collectionName}: ${rootMessage}`);
    }
  }

  /**
   * Creates an alias for a collection
   */
  async createAlias(aliasName: string, collectionName: string): Promise<boolean> {
    try {
      await this.client.updateCollectionAliases({
        actions: [{ create_alias: { alias_name: aliasName, collection_name: collectionName } }],
      });
      return true;
    } catch (error) {
      const errorMessage = this.handleError(error);
      const rootMessage = this.extractRootErrorMessage(errorMessage);
      throw new Error(`Failed to create alias ${aliasName} for collection ${collectionName}: ${rootMessage}`);
    }
  }

  /**
   * Deletes an alias
   */
  async deleteAlias(aliasName: string): Promise<boolean> {
    try {
      await this.client.updateCollectionAliases({
        actions: [{ delete_alias: { alias_name: aliasName } }],
      });
      return true;
    } catch (error) {
      const errorMessage = this.handleError(error);
      const rootMessage = this.extractRootErrorMessage(errorMessage);
      throw new Error(`Failed to delete alias ${aliasName}: ${rootMessage}`);
    }
  }

  /**
   * Lists all aliases
   */
  async listAliases(): Promise<any[]> {
    try {
      const response = await this.client.getAliases();
      return response.aliases || [];
    } catch (error) {
      const errorMessage = this.handleError(error);
      const rootMessage = this.extractRootErrorMessage(errorMessage);
      throw new Error(`Failed to list aliases: ${rootMessage}`);
    }
  }

  /**
   * Gets collection statistics
   */
  async getStats(collectionName: string): Promise<any> {
    try {
      const info = await this.getInfo(collectionName);
      return {
        vectors_count: info.vectors_count,
        indexed_vectors_count: info.indexed_vectors_count,
        points_count: info.points_count,
        segments_count: info.segments_count,
        status: info.status,
        optimizer_status: info.optimizer_status,
      };
    } catch (error) {
      const err = error as Error;
      // Extract the root error message to avoid nesting
      const rootMessage = this.extractRootErrorMessage(err.message);
      throw new Error(`Failed to get collection stats for ${collectionName}: ${rootMessage}`);
    }
  }

  /**
   * Recreates a collection with new configuration
   */
  async recreate(
    collectionName: string,
    newConfig: CollectionCreateRequest
  ): Promise<boolean> {
    try {
      // Delete existing collection
      await this.delete(collectionName);
      
      // Create new collection with updated config
      await this.create({
        ...newConfig,
        name: collectionName,
      });
      
      return true;
    } catch (error) {
      const err = error as Error;
      // Extract the root error message to avoid nesting
      const rootMessage = this.extractRootErrorMessage(err.message);
      throw new Error(`Failed to recreate collection ${collectionName}: ${rootMessage}`);
    }
  }

  /**
   * Extracts the root error message from potentially nested error messages
   */
  private extractRootErrorMessage(message: string): string {
    // Handle string errors that aren't Error objects
    if (!message || typeof message !== 'string') {
      return 'Unknown error';
    }

    // Remove nested "Failed to..." prefixes to get to the root cause
    // Example: "Failed to get collection info for test: Stats failed" -> "Stats failed"
    const patterns = [
      /Failed to create collection [^:]+: (.+)/,
      /Failed to delete collection [^:]+: (.+)/,
      /Failed to get collection info for [^:]+: (.+)/,
      /Failed to get collection stats for [^:]+: (.+)/,
      /Failed to recreate collection [^:]+: (.+)/,
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) {
        // Recursively extract in case of multiple layers
        return this.extractRootErrorMessage(match[1]);
      }
    }

    return message;
  }

  /**
   * Handles error casting and message extraction
   */
  private handleError(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    return 'Unknown error';
  }
}