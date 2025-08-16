import { z } from 'zod';

/**
 * Log level enum
 */
export const LogLevelSchema = z.enum(['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly']);
export type LogLevel = z.infer<typeof LogLevelSchema>;

/**
 * Log format enum
 */
export const LogFormatSchema = z.enum(['json', 'simple', 'combined', 'dev', 'tiny']);
export type LogFormat = z.infer<typeof LogFormatSchema>;

/**
 * Transport type enum
 */
export const TransportTypeSchema = z.enum(['console', 'file', 'http', 'stream', 'syslog']);
export type TransportType = z.infer<typeof TransportTypeSchema>;

/**
 * File transport configuration schema
 */
export const FileTransportConfigSchema = z.object({
  filename: z.string(),
  dirname: z.string().optional(),
  maxsize: z.number().min(0).optional(),
  maxFiles: z.union([z.number().min(0), z.string()]).optional(),
  tailable: z.boolean().default(false),
  zippedArchive: z.boolean().default(false),
  datePattern: z.string().optional(),
  createSymlink: z.boolean().default(false),
  symlinkName: z.string().optional(),
});

export type FileTransportConfig = z.infer<typeof FileTransportConfigSchema>;

/**
 * HTTP transport configuration schema
 */
export const HttpTransportConfigSchema = z.object({
  host: z.string().default('localhost'),
  port: z.number().min(1).max(65535).default(80),
  path: z.string().default('/'),
  ssl: z.boolean().default(false),
  auth: z.object({
    username: z.string().optional(),
    password: z.string().optional(),
  }).optional(),
  headers: z.record(z.string(), z.string()).optional(),
  batchInterval: z.number().min(0).default(5000),
  batchCount: z.number().min(1).default(10),
});

export type HttpTransportConfig = z.infer<typeof HttpTransportConfigSchema>;

/**
 * Console transport configuration schema
 */
export const ConsoleTransportConfigSchema = z.object({
  colorize: z.boolean().default(true),
  timestamp: z.boolean().default(true),
  prettyPrint: z.boolean().default(false),
  silent: z.boolean().default(false),
  stderrLevels: z.array(LogLevelSchema).default(['error']),
});

export type ConsoleTransportConfig = z.infer<typeof ConsoleTransportConfigSchema>;

/**
 * Transport configuration schema
 */
export const TransportConfigSchema = z.object({
  type: TransportTypeSchema,
  level: LogLevelSchema.default('info'),
  format: LogFormatSchema.default('simple'),
  silent: z.boolean().default(false),
  handleExceptions: z.boolean().default(false),
  handleRejections: z.boolean().default(false),
  
  // Type-specific configurations
  console: ConsoleTransportConfigSchema.optional(),
  file: FileTransportConfigSchema.optional(),
  http: HttpTransportConfigSchema.optional(),
});

export type TransportConfig = z.infer<typeof TransportConfigSchema>;

/**
 * Logging configuration schema
 */
export const LoggingConfigSchema = z.object({
  level: LogLevelSchema.default('info'),
  format: LogFormatSchema.default('simple'),
  silent: z.boolean().default(false),
  exitOnError: z.boolean().default(false),
  
  // Transports configuration
  transports: z.array(TransportConfigSchema).default([
    {
      type: 'console',
      level: 'info',
      format: 'simple',
      silent: false,
      handleExceptions: false,
      handleRejections: false,
      console: {
        colorize: true,
        timestamp: true,
        prettyPrint: false,
        silent: false,
        stderrLevels: ['error'],
      },
    },
  ]),
  
  // Performance and filtering
  maxsize: z.number().min(0).default(5242880), // 5MB
  maxFiles: z.number().min(0).default(5),
  
  // Metadata and context
  defaultMeta: z.record(z.string(), z.any()).default({}),
  
  // Performance monitoring
  profiling: z.boolean().default(false),
  timing: z.boolean().default(false),
  
  // Security
  sanitize: z.boolean().default(true),
  redactFields: z.array(z.string()).default(['password', 'token', 'secret', 'key']),
  
  // Request/Response logging
  logRequests: z.boolean().default(false),
  logResponses: z.boolean().default(false),
  logRequestBodies: z.boolean().default(false),
  logResponseBodies: z.boolean().default(false),
  maxBodyLength: z.number().min(0).default(1000),
  
  // Error handling
  logErrors: z.boolean().default(true),
  logStackTrace: z.boolean().default(true),
  
  // Environment-specific settings
  development: z.object({
    level: LogLevelSchema.default('debug'),
    prettyPrint: z.boolean().default(true),
  }).optional(),
  
  production: z.object({
    level: LogLevelSchema.default('warn'),
    prettyPrint: z.boolean().default(false),
  }).optional(),
});

export type LoggingConfig = z.infer<typeof LoggingConfigSchema>;

/**
 * Default logging configuration
 */
export const defaultLoggingConfig: Partial<LoggingConfig> = {
  level: 'info',
  format: 'simple',
  silent: false,
  exitOnError: false,
  maxsize: 5242880, // 5MB
  maxFiles: 5,
  defaultMeta: {},
  profiling: false,
  timing: false,
  sanitize: true,
  redactFields: ['password', 'token', 'secret', 'key'],
  logRequests: false,
  logResponses: false,
  logRequestBodies: false,
  logResponseBodies: false,
  maxBodyLength: 1000,
  logErrors: true,
  logStackTrace: true,
  transports: [
    {
      type: 'console',
      level: 'info',
      format: 'simple',
      silent: false,
      handleExceptions: false,
      handleRejections: false,
      console: {
        colorize: true,
        timestamp: true,
        prettyPrint: false,
        silent: false,
        stderrLevels: ['error'],
      },
    },
  ],
  development: {
    level: 'debug',
    prettyPrint: true,
  },
  production: {
    level: 'warn',
    prettyPrint: false,
  },
};