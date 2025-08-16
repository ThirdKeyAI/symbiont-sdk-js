import { z } from 'zod';

/**
 * Database connection pool configuration schema
 */
export const PoolConfigSchema = z.object({
  min: z.number().min(0).default(0),
  max: z.number().min(1).default(10),
  acquireTimeoutMillis: z.number().min(0).default(60000),
  createTimeoutMillis: z.number().min(0).default(30000),
  destroyTimeoutMillis: z.number().min(0).default(5000),
  idleTimeoutMillis: z.number().min(0).default(30000),
  reapIntervalMillis: z.number().min(0).default(1000),
  createRetryIntervalMillis: z.number().min(0).default(200),
  propagateCreateError: z.boolean().default(false),
});

export type PoolConfig = z.infer<typeof PoolConfigSchema>;

/**
 * SSL configuration schema
 */
export const SSLConfigSchema = z.object({
  enabled: z.boolean().default(false),
  rejectUnauthorized: z.boolean().default(true),
  ca: z.string().optional(),
  cert: z.string().optional(),
  key: z.string().optional(),
  passphrase: z.string().optional(),
});

export type SSLConfig = z.infer<typeof SSLConfigSchema>;

/**
 * Migration configuration schema
 */
export const MigrationConfigSchema = z.object({
  directory: z.string().default('./migrations'),
  tableName: z.string().default('knex_migrations'),
  schemaName: z.string().optional(),
  disableTransactions: z.boolean().default(false),
  sortDirsSeparately: z.boolean().default(false),
  loadExtensions: z.array(z.string()).default([]),
});

export type MigrationConfig = z.infer<typeof MigrationConfigSchema>;

/**
 * Database configuration schema
 */
export const DatabaseConfigSchema = z.object({
  provider: z.enum(['postgresql', 'mysql', 'sqlite', 'mongodb', 'redis']).default('postgresql'),
  
  // Connection settings
  host: z.string().default('localhost'),
  port: z.number().min(1).max(65535).optional(),
  database: z.string().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
  
  // Connection string (alternative to individual settings)
  url: z.string().optional(),
  
  // SSL configuration
  ssl: SSLConfigSchema.optional(),
  
  // Connection pool
  pool: PoolConfigSchema.optional(),
  
  // Query configuration
  timeout: z.number().min(0).default(30000),
  charset: z.string().default('utf8'),
  timezone: z.string().default('UTC'),
  
  // PostgreSQL specific
  schema: z.string().optional(),
  searchPath: z.array(z.string()).optional(),
  
  // SQLite specific
  filename: z.string().optional(),
  
  // MongoDB specific
  authSource: z.string().optional(),
  replicaSet: z.string().optional(),
  readPreference: z.enum(['primary', 'primaryPreferred', 'secondary', 'secondaryPreferred', 'nearest']).optional(),
  
  // Redis specific
  keyPrefix: z.string().optional(),
  db: z.number().min(0).max(15).optional(),
  
  // Advanced options
  debug: z.boolean().default(false),
  acquireConnectionTimeout: z.number().min(0).default(60000),
  useNullAsDefault: z.boolean().default(false),
  
  // Migration settings
  migrations: MigrationConfigSchema.optional(),
  
  // Retry configuration
  maxRetries: z.number().min(0).default(3),
  retryDelayMs: z.number().min(0).default(1000),
});

export type DatabaseConfig = z.infer<typeof DatabaseConfigSchema>;

/**
 * Default database configuration
 */
export const defaultDatabaseConfig: Partial<DatabaseConfig> = {
  provider: 'postgresql',
  host: 'localhost',
  charset: 'utf8',
  timezone: 'UTC',
  timeout: 30000,
  debug: false,
  acquireConnectionTimeout: 60000,
  useNullAsDefault: false,
  maxRetries: 3,
  retryDelayMs: 1000,
  pool: {
    min: 0,
    max: 10,
    acquireTimeoutMillis: 60000,
    createTimeoutMillis: 30000,
    destroyTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    reapIntervalMillis: 1000,
    createRetryIntervalMillis: 200,
    propagateCreateError: false,
  },
  ssl: {
    enabled: false,
    rejectUnauthorized: true,
  },
  migrations: {
    directory: './migrations',
    tableName: 'knex_migrations',
    disableTransactions: false,
    sortDirsSeparately: false,
    loadExtensions: [],
  },
};

/**
 * Get default port for database provider
 */
export function getDefaultPort(provider: DatabaseConfig['provider']): number {
  switch (provider) {
    case 'postgresql':
      return 5432;
    case 'mysql':
      return 3306;
    case 'sqlite':
      return 0; // N/A for SQLite
    case 'mongodb':
      return 27017;
    case 'redis':
      return 6379;
    default:
      return 5432;
  }
}