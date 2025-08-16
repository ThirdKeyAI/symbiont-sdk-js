import { z } from 'zod';

/**
 * Vector point schema for storing vectors with metadata
 */
export const VectorPointSchema = z.object({
  id: z.string(),
  vector: z.array(z.number()),
  payload: z.record(z.string(), z.unknown()).optional(),
});

export type VectorPoint = z.infer<typeof VectorPointSchema>;

/**
 * Search result schema for vector search operations
 */
export const SearchResultSchema = z.object({
  id: z.string(),
  score: z.number(),
  payload: z.record(z.string(), z.unknown()).optional(),
  vector: z.array(z.number()).optional(),
});

export type SearchResult = z.infer<typeof SearchResultSchema>;

/**
 * Collection schema for vector collections
 */
export const CollectionSchema = z.object({
  name: z.string(),
  dimension: z.number().min(1),
  distance: z.enum(['Cosine', 'Dot', 'Euclid', 'Manhattan']),
  config: z.record(z.string(), z.unknown()).optional(),
});

export type Collection = z.infer<typeof CollectionSchema>;

/**
 * Collection info schema with additional metadata
 */
export const CollectionInfoSchema = z.object({
  name: z.string(),
  status: z.enum(['green', 'yellow', 'red']),
  optimizer_status: z.enum(['ok', 'error']),
  vectors_count: z.number(),
  indexed_vectors_count: z.number(),
  points_count: z.number(),
  segments_count: z.number(),
  config: z.object({
    params: z.object({
      vectors: z.object({
        size: z.number(),
        distance: z.enum(['Cosine', 'Dot', 'Euclid', 'Manhattan']),
      }),
      shard_number: z.number(),
      replication_factor: z.number(),
      write_consistency_factor: z.number(),
      on_disk_payload: z.boolean(),
    }),
  }),
  payload_schema: z.record(z.string(), z.unknown()).optional(),
});

export type CollectionInfo = z.infer<typeof CollectionInfoSchema>;

/**
 * Search options for vector search operations
 */
export const SearchOptionsSchema = z.object({
  limit: z.number().min(1).default(10),
  offset: z.number().min(0).default(0),
  with_payload: z.boolean().default(true),
  with_vector: z.boolean().default(false),
  score_threshold: z.number().optional(),
  filter: z.record(z.string(), z.unknown()).optional(),
  params: z.object({
    hnsw_ef: z.number().optional(),
    exact: z.boolean().optional(),
  }).optional(),
});

export type SearchOptions = z.infer<typeof SearchOptionsSchema>;

/**
 * Batch operation result
 */
export const BatchOperationResultSchema = z.object({
  operation_id: z.number(),
  status: z.enum(['acknowledged', 'completed']),
});

export type BatchOperationResult = z.infer<typeof BatchOperationResultSchema>;

/**
 * Point insert request
 */
export const PointInsertRequestSchema = z.object({
  points: z.array(VectorPointSchema),
  wait: z.boolean().default(true),
  ordering: z.enum(['weak', 'medium', 'strong']).optional(),
});

export type PointInsertRequest = z.infer<typeof PointInsertRequestSchema>;

/**
 * Point update request
 */
export const PointUpdateRequestSchema = z.object({
  points: z.array(VectorPointSchema),
  wait: z.boolean().default(true),
  ordering: z.enum(['weak', 'medium', 'strong']).optional(),
});

export type PointUpdateRequest = z.infer<typeof PointUpdateRequestSchema>;

/**
 * Point delete request
 */
export const PointDeleteRequestSchema = z.object({
  ids: z.array(z.string()),
  wait: z.boolean().default(true),
  ordering: z.enum(['weak', 'medium', 'strong']).optional(),
});

export type PointDeleteRequest = z.infer<typeof PointDeleteRequestSchema>;

/**
 * Embedding provider configuration
 */
export const EmbeddingProviderSchema = z.object({
  provider: z.enum(['openai', 'huggingface', 'cohere', 'custom']),
  model: z.string(),
  apiKey: z.string().optional(),
  baseUrl: z.string().optional(),
  dimension: z.number().min(1),
});

export type EmbeddingProvider = z.infer<typeof EmbeddingProviderSchema>;

/**
 * Embedding request
 */
export const EmbeddingRequestSchema = z.object({
  text: z.string(),
  model: z.string().optional(),
});

export type EmbeddingRequest = z.infer<typeof EmbeddingRequestSchema>;

/**
 * Embedding response
 */
export const EmbeddingResponseSchema = z.object({
  embedding: z.array(z.number()),
  model: z.string(),
  usage: z.object({
    prompt_tokens: z.number(),
    total_tokens: z.number(),
  }).optional(),
});

export type EmbeddingResponse = z.infer<typeof EmbeddingResponseSchema>;

/**
 * Collection create request
 */
export const CollectionCreateRequestSchema = z.object({
  name: z.string(),
  vectors: z.object({
    size: z.number().min(1),
    distance: z.enum(['Cosine', 'Dot', 'Euclid', 'Manhattan']),
    hnsw_config: z.object({
      m: z.number().min(0).default(16),
      ef_construct: z.number().min(0).default(100),
      full_scan_threshold: z.number().min(0).default(10000),
      max_indexing_threads: z.number().min(0).default(0),
      on_disk: z.boolean().optional(),
      payload_m: z.number().min(0).optional(),
    }).optional(),
    quantization_config: z.object({
      scalar: z.object({
        type: z.enum(['int8']),
        quantile: z.number().min(0).max(1).optional(),
        always_ram: z.boolean().optional(),
      }).optional(),
      product: z.object({
        compression: z.enum(['x4', 'x8', 'x16', 'x32', 'x64']),
        always_ram: z.boolean().optional(),
      }).optional(),
      binary: z.object({
        always_ram: z.boolean().optional(),
      }).optional(),
    }).optional(),
    on_disk: z.boolean().optional(),
  }),
  shard_number: z.number().min(1).default(1),
  replication_factor: z.number().min(1).default(1),
  write_consistency_factor: z.number().min(1).default(1),
  on_disk_payload: z.boolean().default(false),
  hnsw_config: z.object({
    m: z.number().min(0).default(16),
    ef_construct: z.number().min(0).default(100),
    full_scan_threshold: z.number().min(0).default(10000),
    max_indexing_threads: z.number().min(0).default(0),
    on_disk: z.boolean().optional(),
    payload_m: z.number().min(0).optional(),
  }).optional(),
  optimizer_config: z.object({
    deleted_threshold: z.number().min(0).max(1).default(0.2),
    vacuum_min_vector_number: z.number().min(0).default(1000),
    default_segment_number: z.number().min(0).default(0),
    max_segment_size: z.number().min(0).optional(),
    memmap_threshold: z.number().min(0).optional(),
    indexing_threshold: z.number().min(0).default(20000),
    flush_interval_sec: z.number().min(0).default(5),
    max_optimization_threads: z.number().min(0).optional(),
  }).optional(),
  wal_config: z.object({
    wal_capacity_mb: z.number().min(0).default(32),
    wal_segments_ahead: z.number().min(0).default(0),
  }).optional(),
});

export type CollectionCreateRequest = z.infer<typeof CollectionCreateRequestSchema>;

/**
 * Scroll request for paginated retrieval
 */
export const ScrollRequestSchema = z.object({
  offset: z.string().optional(),
  limit: z.number().min(1).default(10),
  with_payload: z.boolean().default(true),
  with_vector: z.boolean().default(false),
  filter: z.record(z.string(), z.unknown()).optional(),
});

export type ScrollRequest = z.infer<typeof ScrollRequestSchema>;

/**
 * Scroll response
 */
export const ScrollResponseSchema = z.object({
  points: z.array(VectorPointSchema),
  next_page_offset: z.string().optional(),
});

export type ScrollResponse = z.infer<typeof ScrollResponseSchema>;