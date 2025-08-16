import { z } from 'zod';

/**
 * Distance metric for vector operations
 */
export const DistanceMetricSchema = z.enum(['Cosine', 'Dot', 'Euclid', 'Manhattan']);
export type DistanceMetric = z.infer<typeof DistanceMetricSchema>;

/**
 * Quantization configuration schema
 */
export const QuantizationConfigSchema = z.object({
  scalar: z.object({
    type: z.enum(['int8']),
    quantile: z.number().min(0).max(1).optional(),
    alwaysRam: z.boolean().optional(),
  }).optional(),
  product: z.object({
    compression: z.enum(['x4', 'x8', 'x16', 'x32', 'x64']),
    alwaysRam: z.boolean().optional(),
  }).optional(),
  binary: z.object({
    alwaysRam: z.boolean().optional(),
  }).optional(),
});

export type QuantizationConfig = z.infer<typeof QuantizationConfigSchema>;

/**
 * Optimizer configuration schema
 */
export const OptimizerConfigSchema = z.object({
  deletedThreshold: z.number().min(0).max(1).default(0.2),
  vacuumMinVectorNumber: z.number().min(0).default(1000),
  defaultSegmentNumber: z.number().min(0).default(0),
  maxSegmentSize: z.number().min(0).optional(),
  memmapThreshold: z.number().min(0).optional(),
  indexingThreshold: z.number().min(0).default(20000),
  flushIntervalSec: z.number().min(0).default(5),
  maxOptimizationThreads: z.number().min(0).optional(),
});

export type OptimizerConfig = z.infer<typeof OptimizerConfigSchema>;

/**
 * HNSW (Hierarchical Navigable Small World) configuration schema
 */
export const HnswConfigSchema = z.object({
  m: z.number().min(0).default(16),
  efConstruct: z.number().min(0).default(100),
  fullScanThreshold: z.number().min(0).default(10000),
  maxIndexingThreads: z.number().min(0).default(0),
  onDisk: z.boolean().optional(),
  payloadM: z.number().min(0).optional(),
});

export type HnswConfig = z.infer<typeof HnswConfigSchema>;

/**
 * WAL (Write-Ahead Logging) configuration schema
 */
export const WalConfigSchema = z.object({
  walCapacityMb: z.number().min(0).default(32),
  walSegmentsAhead: z.number().min(0).default(0),
});

export type WalConfig = z.infer<typeof WalConfigSchema>;

/**
 * Collection configuration schema
 */
export const CollectionConfigSchema = z.object({
  params: z.object({
    vectors: z.object({
      size: z.number().min(1),
      distance: DistanceMetricSchema,
      hnsw_config: HnswConfigSchema.optional(),
      quantization_config: QuantizationConfigSchema.optional(),
      on_disk: z.boolean().optional(),
    }),
    shard_number: z.number().min(1).default(1),
    replication_factor: z.number().min(1).default(1),
    write_consistency_factor: z.number().min(1).default(1),
    on_disk_payload: z.boolean().default(false),
  }),
  hnsw_config: HnswConfigSchema.optional(),
  optimizer_config: OptimizerConfigSchema.optional(),
  wal_config: WalConfigSchema.optional(),
});

export type CollectionConfig = z.infer<typeof CollectionConfigSchema>;

/**
 * Vector database configuration schema
 */
export const VectorConfigSchema = z.object({
  provider: z.enum(['qdrant', 'pinecone', 'weaviate', 'chroma']).default('qdrant'),
  url: z.string().url().optional(),
  apiKey: z.string().optional(),
  timeout: z.number().min(0).default(60000),
  
  // Qdrant-specific configuration
  qdrant: z.object({
    host: z.string().default('localhost'),
    port: z.number().min(1).max(65535).default(6333),
    grpcPort: z.number().min(1).max(65535).default(6334),
    preferGrpc: z.boolean().default(false),
    apiKey: z.string().optional(),
    https: z.boolean().default(false),
    prefix: z.string().optional(),
  }).optional(),
  
  // Collection defaults
  collections: z.record(z.string(), CollectionConfigSchema).default({}),
  
  // Vector operations configuration
  batchSize: z.number().min(1).default(100),
  maxRetries: z.number().min(0).default(3),
  retryDelayMs: z.number().min(0).default(1000),
  
  // Search configuration
  defaultLimit: z.number().min(1).default(10),
  defaultWithPayload: z.boolean().default(true),
  defaultWithVectors: z.boolean().default(false),
  
  // Performance tuning
  parallelism: z.number().min(1).default(1),
  connectionPoolSize: z.number().min(1).default(10),
});

export type VectorConfig = z.infer<typeof VectorConfigSchema>;

/**
 * Default vector configuration
 */
export const defaultVectorConfig: Partial<VectorConfig> = {
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