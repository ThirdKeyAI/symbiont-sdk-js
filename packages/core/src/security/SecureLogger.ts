import { SecurityLoggingConfig } from './SecurityConfig';

/**
 * Log levels enum
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

/**
 * Log entry interface
 */
export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  data?: any;
  sanitizedData?: any;
}

/**
 * Secure logger that prevents sensitive data leakage
 */
export class SecureLogger {
  private config: SecurityLoggingConfig;
  private logBuffer: LogEntry[] = [];
  private readonly maxBufferSize = 1000;

  constructor(config: SecurityLoggingConfig) {
    this.config = config;
  }

  /**
   * Log debug message
   */
  debug(message: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  /**
   * Log info message
   */
  info(message: string, data?: any): void {
    this.log(LogLevel.INFO, message, data);
  }

  /**
   * Log warning message
   */
  warn(message: string, data?: any): void {
    this.log(LogLevel.WARN, message, data);
  }

  /**
   * Log error message
   */
  error(message: string, data?: any): void {
    this.log(LogLevel.ERROR, message, data);
  }

  /**
   * Log security event with enhanced sanitization
   */
  logSecurityEvent(event: string, data: any): void {
    const sanitizedData = this.deepSanitize(data);
    this.log(LogLevel.WARN, `Security Event: ${event}`, sanitizedData);
  }

  /**
   * Log authentication event
   */
  logAuthEvent(event: string, userId?: string, success: boolean = true, details?: any): void {
    const logData = {
      userId: userId && userId.trim() ? this.hashSensitiveValue(userId) : '[EMPTY]',
      success,
      details: details ? this.sanitizeObject(details) : undefined
    };
    
    this.log(
      success ? LogLevel.INFO : LogLevel.WARN,
      `Auth Event: ${event}`,
      logData
    );
  }

  /**
   * Log API request/response with sanitization
   */
  logApiCall(method: string, url: string, statusCode: number, duration: number, error?: string): void {
    const sanitizedUrl = this.sanitizeUrl(url);
    const logData = {
      method,
      url: sanitizedUrl,
      statusCode,
      duration,
      error: error ? this.sanitizeErrorMessage(error) : undefined
    };

    const level = statusCode >= 400 ? LogLevel.ERROR : LogLevel.INFO;
    this.log(level, `API Call: ${method} ${sanitizedUrl}`, logData);
  }

  /**
   * Core logging method with sanitization
   */
  private log(level: LogLevel, message: string, data?: any): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const sanitizedMessage = this.sanitizeMessage(message);
    const sanitizedData = data ? this.deepSanitize(data) : undefined;

    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message: sanitizedMessage,
      data,
      sanitizedData
    };

    this.addToBuffer(entry);
    this.outputLog(entry);
  }

  /**
   * Check if should log based on level
   */
  private shouldLog(level: LogLevel): boolean {
    const configLevel = this.getLogLevelValue(this.config.level);
    return level >= configLevel;
  }

  /**
   * Get numeric value for log level
   */
  private getLogLevelValue(level: string): number {
    switch (level.toLowerCase()) {
      case 'debug': return LogLevel.DEBUG;
      case 'info': return LogLevel.INFO;
      case 'warn': return LogLevel.WARN;
      case 'error': return LogLevel.ERROR;
      default: return LogLevel.INFO;
    }
  }

  /**
   * Add entry to buffer
   */
  private addToBuffer(entry: LogEntry): void {
    this.logBuffer.push(entry);
    
    if (this.logBuffer.length > this.maxBufferSize) {
      this.logBuffer.shift();
    }
  }

  /**
   * Output log entry (can be overridden for custom output)
   */
  protected outputLog(entry: LogEntry): void {
    const levelName = LogLevel[entry.level];
    const timestamp = entry.timestamp.toISOString();
    
    let output = `[${timestamp}] ${levelName}: ${entry.message}`;
    
    if (entry.sanitizedData) {
      try {
        const dataStr = JSON.stringify(entry.sanitizedData, null, 2);
        if (dataStr.length <= this.config.maxLogLength) {
          output += `\nData: ${dataStr}`;
        } else {
          output += `\nData: [TRUNCATED - ${dataStr.length} chars]`;
        }
      } catch (error) {
        output += '\nData: [INVALID JSON]';
      }
    }

    // Output to console (in production, this would go to your logging service)
    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(output);
        break;
      case LogLevel.INFO:
        console.info(output);
        break;
      case LogLevel.WARN:
        console.warn(output);
        break;
      case LogLevel.ERROR:
        console.error(output);
        break;
    }
  }

  /**
   * Deep sanitize object recursively
   */
  private deepSanitize(obj: any, visited = new WeakSet()): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj === 'string') {
      return this.sanitizeString(obj);
    }

    if (typeof obj !== 'object') {
      return obj;
    }

    // Handle circular references
    if (visited.has(obj)) {
      return '[CIRCULAR]';
    }
    visited.add(obj);

    if (Array.isArray(obj)) {
      return obj.map(item => this.deepSanitize(item, visited));
    }

    return this.sanitizeObject(obj, visited);
  }

  /**
   * Sanitize object properties
   */
  private sanitizeObject(obj: Record<string, any>, visited = new WeakSet()): Record<string, any> {
    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      
      if (this.isSensitiveField(lowerKey)) {
        sanitized[key] = this.redactSensitiveValue(value);
      } else if (lowerKey === 'url' && typeof value === 'string') {
        // Sanitize URLs found in data objects
        sanitized[key] = this.sanitizeUrl(value);
      } else {
        sanitized[key] = this.deepSanitize(value, visited);
      }
    }

    return sanitized;
  }

  /**
   * Check if field name indicates sensitive data
   */
  private isSensitiveField(fieldName: string): boolean {
    return this.config.redactFields.some(field => 
      fieldName.includes(field.toLowerCase())
    );
  }

  /**
   * Redact sensitive value while preserving some metadata
   */
  private redactSensitiveValue(value: any): string {
    if (typeof value === 'string') {
      if (value.length === 0) return '[EMPTY]';
      if (value.length <= 4) return '[REDACTED]';
      return `[REDACTED:${value.length}chars]`;
    }
    return '[REDACTED]';
  }

  /**
   * Hash sensitive value for correlation purposes
   */
  private hashSensitiveValue(value: string): string {
    if (!value || !value.trim()) return '[EMPTY]';
    
    // Simple hash for correlation (not cryptographic)
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
      const char = value.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return `[HASH:${Math.abs(hash).toString(36)}]`;
  }

  /**
   * Sanitize log message
   */
  private sanitizeMessage(message: string): string {
    if (!this.config.redactSensitiveData) {
      return message;
    }

    let sanitized = message;

    // Remove common sensitive patterns
    const patterns = [
      // JWT tokens
      /Bearer\s+[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+/g,
      // API keys (common formats)
      /[Aa]pi[_-]?[Kk]ey[:\s=][\w-]{20,}/g,
      /sk-[a-zA-Z0-9]{32,}/g, // OpenAI style API keys
      /[a-zA-Z0-9]{32,}/g, // Generic long strings that might be keys
      // Passwords in URLs
      /password[=:][^&\s]+/gi,
      // Credit card numbers
      /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
      // Email addresses (partial redaction)
      /([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g
    ];

    for (const pattern of patterns) {
      sanitized = sanitized.replace(pattern, '[REDACTED]');
    }

    return sanitized;
  }

  /**
   * Sanitize string content
   */
  private sanitizeString(str: string): string {
    if (!this.config.redactSensitiveData) {
      return str;
    }

    // Check if string looks like sensitive data
    if (this.looksLikeSensitiveData(str)) {
      return this.redactSensitiveValue(str);
    }

    return this.sanitizeMessage(str);
  }

  /**
   * Heuristic to detect if string contains sensitive data
   */
  private looksLikeSensitiveData(str: string): boolean {
    if (str.length < 8) return false;

    const sensitivePatterns = [
      /^[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+$/, // JWT
      /^[A-Fa-f0-9]{32,}$/, // Hex strings (potential hashes/keys)
      /^[A-Za-z0-9+/]{20,}={0,2}$/, // Base64
      /^[A-Za-z0-9\-_]{40,}$/, // Long alphanumeric strings
    ];

    return sensitivePatterns.some(pattern => pattern.test(str));
  }

  /**
   * Sanitize URL to remove sensitive query parameters
   */
  private sanitizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const sensitiveParams = ['token', 'key', 'secret', 'password', 'auth', 'apikey'];
      
      for (const param of sensitiveParams) {
        if (urlObj.searchParams.has(param)) {
          urlObj.searchParams.set(param, '[REDACTED]');
        }
      }
      
      // Decode the URL to prevent double-encoding
      return decodeURIComponent(urlObj.toString());
    } catch {
      // If URL parsing fails, manually replace query parameters
      let sanitized = url;
      const sensitiveParams = ['token', 'key', 'secret', 'password', 'auth', 'apikey'];
      
      for (const param of sensitiveParams) {
        // Handle both standard query params (?param= or &param=) and loose matches (param=)
        const standardRegex = new RegExp(`([?&]${param}=)[^&]*`, 'gi');
        const looseRegex = new RegExp(`(${param}=)[^&\\s]*`, 'gi');
        
        sanitized = sanitized.replace(standardRegex, `$1[REDACTED]`);
        sanitized = sanitized.replace(looseRegex, `$1[REDACTED]`);
      }
      
      return sanitized;
    }
  }

  /**
   * Sanitize error message
   */
  private sanitizeErrorMessage(error: string): string {
    // Remove potential file paths that might contain sensitive info
    let sanitized = error.replace(/\/[^\s]+/g, '[PATH]');
    
    // Remove stack traces that might contain sensitive data
    sanitized = sanitized.split('\n')[0]; // Keep only first line
    
    return this.sanitizeMessage(sanitized);
  }

  /**
   * Get recent log entries
   */
  getRecentLogs(count: number = 100): LogEntry[] {
    return this.logBuffer.slice(-count);
  }

  /**
   * Clear log buffer
   */
  clearBuffer(): void {
    this.logBuffer = [];
  }

  /**
   * Get log statistics
   */
  getLogStats(): {
    totalEntries: number;
    errorCount: number;
    warnCount: number;
    infoCount: number;
    debugCount: number;
  } {
    const stats = {
      totalEntries: this.logBuffer.length,
      errorCount: 0,
      warnCount: 0,
      infoCount: 0,
      debugCount: 0
    };

    for (const entry of this.logBuffer) {
      switch (entry.level) {
        case LogLevel.ERROR: stats.errorCount++; break;
        case LogLevel.WARN: stats.warnCount++; break;
        case LogLevel.INFO: stats.infoCount++; break;
        case LogLevel.DEBUG: stats.debugCount++; break;
      }
    }

    return stats;
  }
}