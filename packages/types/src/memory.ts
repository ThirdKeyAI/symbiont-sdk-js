/**
 * Memory system types and interfaces for the Symbiont SDK
 */

/**
 * Memory levels in the hierarchical memory system
 */
export enum MemoryLevel {
  SHORT_TERM = 'short_term',
  LONG_TERM = 'long_term', 
  EPISODIC = 'episodic',
  SEMANTIC = 'semantic'
}

/**
 * Individual memory item in the hierarchical memory system
 */
export interface MemoryNode {
  /** Unique identifier for this memory node */
  id: string;
  /** The actual content/data stored in this memory */
  content: any;
  /** Which memory level this node belongs to */
  level: MemoryLevel;
  /** When this memory was created */
  timestamp: Date;
  /** How many times this memory has been accessed */
  accessCount: number;
  /** Importance score (0-1) for memory retention decisions */
  importance: number;
  /** Optional tags for categorization and search */
  tags?: string[];
  /** Additional metadata for the memory */
  metadata?: Record<string, any>;
  /** Optional expiration time for automatic cleanup */
  expiresAt?: Date;
}

/**
 * Search criteria for querying memories
 */
export interface MemorySearchQuery {
  /** Text query to search for */
  query?: string;
  /** Filter by specific memory level */
  level?: MemoryLevel;
  /** Filter by tags */
  tags?: string[];
  /** Minimum importance threshold */
  minImportance?: number;
  /** Maximum number of results to return */
  limit?: number;
  /** Time range filter */
  timeRange?: {
    start?: Date;
    end?: Date;
  };
  /** Additional metadata filters */
  metadata?: Record<string, any>;
}

/**
 * Result of a memory search operation
 */
export interface MemorySearchResult {
  /** The memory nodes that matched the search */
  memories: MemoryNode[];
  /** Total number of memories found (before limit) */
  total: number;
  /** Search execution time in milliseconds */
  executionTime: number;
}

/**
 * Configuration for memory storage
 */
export interface MemoryStoreConfig {
  /** Maximum number of memories to store per level */
  maxMemories?: Record<MemoryLevel, number>;
  /** Default TTL for memories in seconds */
  defaultTtl?: number;
  /** Whether to enable automatic cleanup of expired memories */
  autoCleanup?: boolean;
  /** Cleanup interval in seconds */
  cleanupInterval?: number;
}

/**
 * Statistics about memory usage
 */
export interface MemoryStats {
  /** Number of memories per level */
  memoryCount: Record<MemoryLevel, number>;
  /** Total memory usage */
  totalMemories: number;
  /** Average importance scores per level */
  averageImportance: Record<MemoryLevel, number>;
  /** Most accessed memories */
  mostAccessed: MemoryNode[];
  /** Recent memory activity */
  recentActivity: MemoryNode[];
}

/**
 * Memory storage backend interface
 */
export interface MemoryStore {
  /**
   * Store a memory node
   */
  store(memory: MemoryNode): Promise<void>;

  /**
   * Retrieve a memory by ID
   */
  get(id: string): Promise<MemoryNode | null>;

  /**
   * Search for memories matching criteria
   */
  search(query: MemorySearchQuery): Promise<MemorySearchResult>;

  /**
   * Update an existing memory
   */
  update(id: string, updates: Partial<MemoryNode>): Promise<boolean>;

  /**
   * Delete a memory by ID
   */
  delete(id: string): Promise<boolean>;

  /**
   * Get all memories for a specific level
   */
  getByLevel(level: MemoryLevel): Promise<MemoryNode[]>;

  /**
   * Clear all memories (optionally for a specific level)
   */
  clear(level?: MemoryLevel): Promise<void>;

  /**
   * Get memory statistics
   */
  getStats(): Promise<MemoryStats>;

  /**
   * Clean up expired memories
   */
  cleanup(): Promise<number>;
}

/**
 * Memory manager interface for high-level operations
 */
export interface MemoryManager {
  /**
   * Store a new memory
   */
  store(content: any, level: MemoryLevel, options?: {
    importance?: number;
    tags?: string[];
    metadata?: Record<string, any>;
    expiresAt?: Date;
  }): Promise<string>;

  /**
   * Retrieve a memory by ID
   */
  get(id: string): Promise<MemoryNode | null>;

  /**
   * Search memories
   */
  search(query: MemorySearchQuery): Promise<MemorySearchResult>;

  /**
   * Update memory importance or other properties
   */
  updateImportance(id: string, importance: number): Promise<boolean>;

  /**
   * Add tags to a memory
   */
  addTags(id: string, tags: string[]): Promise<boolean>;

  /**
   * Remove tags from a memory
   */
  removeTags(id: string, tags: string[]): Promise<boolean>;

  /**
   * Delete a memory
   */
  delete(id: string): Promise<boolean>;

  /**
   * Get memories by level
   */
  getByLevel(level: MemoryLevel): Promise<MemoryNode[]>;

  /**
   * Clear memories (optionally by level)
   */
  clear(level?: MemoryLevel): Promise<void>;

  /**
   * Get memory statistics
   */
  getStats(): Promise<MemoryStats>;

  /**
   * Perform memory consolidation (moving important short-term to long-term)
   */
  consolidate(): Promise<number>;

  /**
   * Clean up expired memories
   */
  cleanup(): Promise<number>;
}

/**
 * Events emitted by the memory system
 */
export interface MemoryEvents {
  'memory:stored': { memory: MemoryNode };
  'memory:retrieved': { memory: MemoryNode };
  'memory:updated': { memory: MemoryNode; changes: Partial<MemoryNode> };
  'memory:deleted': { id: string };
  'memory:consolidated': { moved: number; from: MemoryLevel; to: MemoryLevel };
  'memory:cleaned': { deleted: number };
}