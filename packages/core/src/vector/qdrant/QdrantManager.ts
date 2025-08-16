import { QdrantClient } from '@qdrant/qdrant-js';
import { VectorConfig } from '../../config/VectorConfig';
import { CollectionManager } from './CollectionManager';
import { VectorOperations } from './VectorOperations';
import { SearchEngine } from './SearchEngine';
import { EmbeddingManager } from './EmbeddingManager';

/**
 * Main class for interacting with Qdrant vector database
 */
export class QdrantManager {
  private client: QdrantClient;
  private config: VectorConfig;
  public collections: CollectionManager;
  public vectors: VectorOperations;
  public search: SearchEngine;
  public embeddings: EmbeddingManager;

  constructor(config: VectorConfig) {
    this.config = config;
    this.client = this.createClient();
    
    // Initialize sub-managers
    this.collections = new CollectionManager(this.client, config);
    this.vectors = new VectorOperations(this.client, config);
    this.search = new SearchEngine(this.client, config);
    this.embeddings = new EmbeddingManager(config);
  }

  /**
   * Creates and configures the Qdrant client
   */
  private createClient(): QdrantClient {
    const qdrantConfig = this.config.qdrant;
    
    if (!qdrantConfig) {
      throw new Error('Qdrant configuration is required');
    }

    const clientConfig: any = {
      host: qdrantConfig.host,
      port: qdrantConfig.port,
    };

    if (qdrantConfig.apiKey) {
      clientConfig.apiKey = qdrantConfig.apiKey;
    }

    if (qdrantConfig.https) {
      clientConfig.https = true;
    }

    if (qdrantConfig.prefix) {
      clientConfig.prefix = qdrantConfig.prefix;
    }

    // Use gRPC if preferred and grpcPort is available
    if (qdrantConfig.preferGrpc && qdrantConfig.grpcPort) {
      clientConfig.port = qdrantConfig.grpcPort;
      clientConfig.grpc = true;
    }

    return new QdrantClient(clientConfig);
  }

  /**
   * Tests the connection to Qdrant
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.client.getCollections();
      return true;
    } catch (error) {
      console.error('Qdrant connection test failed:', error);
      return false;
    }
  }

  /**
   * Gets Qdrant cluster information
   */
  async getClusterInfo(): Promise<any> {
    try {
      // Return basic cluster info using collections endpoint
      const collections = await this.client.getCollections();
      return {
        cluster_status: 'enabled',
        peer_id: null,
        collections_count: collections.collections.length
      };
    } catch (error) {
      const err = error as Error;
      throw new Error(`Failed to get cluster info: ${err.message}`);
    }
  }

  /**
   * Gets health status of the Qdrant instance
   */
  async getHealth(): Promise<boolean> {
    try {
      // Test connection by listing collections
      await this.client.getCollections();
      return true;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }

  /**
   * Gets metrics from Qdrant instance
   */
  async getMetrics(): Promise<string> {
    try {
      // Get basic metrics using collections info
      const collections = await this.client.getCollections();
      return JSON.stringify({
        collections_count: collections.collections.length,
        collections: collections.collections.map(c => ({
          name: c.name
        }))
      });
    } catch (error) {
      const err = error as Error;
      throw new Error(`Failed to get metrics: ${err.message}`);
    }
  }

  /**
   * Creates a snapshot of a collection
   */
  async createSnapshot(collectionName: string): Promise<{ name: string }> {
    try {
      const result = await this.client.createSnapshot(collectionName);
      if (!result) {
        throw new Error('Snapshot creation returned null');
      }
      return { name: result.name };
    } catch (error) {
      const err = error as Error;
      throw new Error(`Failed to create snapshot for collection ${collectionName}: ${err.message}`);
    }
  }

  /**
   * Lists all snapshots for a collection
   */
  async listSnapshots(collectionName: string): Promise<any[]> {
    try {
      const result = await this.client.listSnapshots(collectionName);
      return Array.isArray(result) ? result : [];
    } catch (error) {
      const err = error as Error;
      throw new Error(`Failed to list snapshots for collection ${collectionName}: ${err.message}`);
    }
  }

  /**
   * Deletes a snapshot
   */
  async deleteSnapshot(collectionName: string, snapshotName: string): Promise<boolean> {
    try {
      await this.client.deleteSnapshot(collectionName, snapshotName);
      return true;
    } catch (error) {
      const err = error as Error;
      throw new Error(`Failed to delete snapshot ${snapshotName} for collection ${collectionName}: ${err.message}`);
    }
  }

  /**
   * Recovers a collection from a snapshot
   */
  async recoverFromSnapshot(
    collectionName: string,
    snapshotLocation: string,
    options?: {
      priority?: 'replica' | 'snapshot';
      checksum?: string;
    }
  ): Promise<boolean> {
    try {
      // Recovery from snapshot is not yet supported in this client version
      // This would typically require direct API calls to Qdrant
      throw new Error(`Snapshot recovery is not yet implemented in the current Qdrant client. Collection: ${collectionName}, Location: ${snapshotLocation}`);
    } catch (error) {
      const err = error as Error;
      throw new Error(`Failed to recover collection ${collectionName} from snapshot: ${err.message}`);
    }
  }

  /**
   * Gets the Qdrant client instance for advanced operations
   */
  getClient(): QdrantClient {
    return this.client;
  }

  /**
   * Gets the current configuration
   */
  getConfig(): VectorConfig {
    return this.config;
  }

  /**
   * Updates the configuration and recreates the client
   */
  updateConfig(newConfig: Partial<VectorConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.client = this.createClient();
    
    // Update sub-managers with new client and config
    this.collections = new CollectionManager(this.client, this.config);
    this.vectors = new VectorOperations(this.client, this.config);
    this.search = new SearchEngine(this.client, this.config);
    this.embeddings = new EmbeddingManager(this.config);
  }

  /**
   * Closes the connection to Qdrant
   */
  async close(): Promise<void> {
    try {
      // The Qdrant client doesn't have an explicit close method
      // but we can clean up our references
      this.client = null as any;
    } catch (error) {
      console.error('Error closing Qdrant connection:', error);
    }
  }
}