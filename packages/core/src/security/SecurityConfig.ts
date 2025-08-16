/**
 * Security configuration interface and default settings
 */

export interface SecurityPolicyConfig {
  /** Minimum validation time in nanoseconds to prevent timing attacks */
  minValidationTime: bigint;
  /** Minimum verification time in nanoseconds to prevent timing attacks */
  minVerificationTime: bigint;
  /** Threshold for detecting timing attack patterns */
  timingAttackThreshold: number;
  /** Variance threshold for timing attack detection */
  timingVarianceThreshold: number;
  /** List of sensitive field names to redact in logs */
  sensitiveFields: string[];
}

export interface SecurityAuditConfig {
  /** Enable security audit logging */
  enabled: boolean;
  /** Maximum number of audit entries to keep in memory */
  maxEntries: number;
  /** Log security events to external systems */
  logToExternal: boolean;
}

export interface SecurityLoggingConfig {
  /** Log level for security events */
  level: 'debug' | 'info' | 'warn' | 'error';
  /** Redact sensitive data from logs */
  redactSensitiveData: boolean;
  /** Fields to always redact */
  redactFields: string[];
  /** Maximum log entry length */
  maxLogLength: number;
}

export interface SecurityValidationConfig {
  /** Enable strict input validation */
  strict: boolean;
  /** Maximum input length */
  maxInputLength: number;
  /** Allow HTML in input */
  allowHtml: boolean;
  /** SQL injection protection patterns */
  sqlInjectionPatterns: RegExp[];
  /** XSS protection patterns */
  xssPatterns: RegExp[];
}

export interface SecurityConfig {
  security: SecurityPolicyConfig;
  audit: SecurityAuditConfig;
  logging: SecurityLoggingConfig;
  validation: SecurityValidationConfig;
}

/**
 * Default security configuration
 */
export const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  security: {
    minValidationTime: BigInt(1000000), // 1ms in nanoseconds
    minVerificationTime: BigInt(5000000), // 5ms in nanoseconds
    timingAttackThreshold: 10,
    timingVarianceThreshold: 0.1,
    sensitiveFields: [
      'password',
      'token',
      'secret',
      'key',
      'apiKey',
      'accessToken',
      'refreshToken',
      'authorization',
      'auth',
      'jwt',
      'bearer',
      'credential',
      'privateKey',
      'publicKey',
      'signature',
      'hash',
      'salt'
    ]
  },
  audit: {
    enabled: true,
    maxEntries: 1000,
    logToExternal: false
  },
  logging: {
    level: 'info',
    redactSensitiveData: true,
    redactFields: [
      'password',
      'token',
      'secret',
      'key',
      'apiKey',
      'accessToken',
      'refreshToken',
      'authorization',
      'jwt',
      'bearer',
      'credential',
      'privateKey',
      'signature'
    ],
    maxLogLength: 10000
  },
  validation: {
    strict: true,
    maxInputLength: 100000,
    allowHtml: false,
    sqlInjectionPatterns: [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|SCRIPT)\b)/i,
      /(\b(OR|AND)\s+\d+\s*=\s*\d+)/i,
      /(["'][^"']*["'];\s*(DROP|DELETE|UPDATE|INSERT))/i,
      /(--|#|\/\*|\*\/)/,
      /(\b(INFORMATION_SCHEMA|SYSOBJECTS|SYSCOLUMNS)\b)/i
    ],
    xssPatterns: [
      /<script[^>]*>.*?<\/script>/gi,
      /<iframe[^>]*>.*?<\/iframe>/gi,
      /<object[^>]*>.*?<\/object>/gi,
      /<embed[^>]*>/gi,
      /<link[^>]*>/gi,
      /<meta[^>]*>/gi,
      /javascript:/gi,
      /vbscript:/gi,
      /data:/gi,
      /on\w+\s*=/gi
    ]
  }
};

/**
 * Security configuration builder
 */
export class SecurityConfigBuilder {
  private config: SecurityConfig;

  constructor(baseConfig?: Partial<SecurityConfig>) {
    this.config = {
      ...DEFAULT_SECURITY_CONFIG,
      ...baseConfig
    };
  }

  /**
   * Set security policy configuration
   */
  withSecurityPolicy(policy: Partial<SecurityPolicyConfig>): SecurityConfigBuilder {
    this.config.security = {
      ...this.config.security,
      ...policy
    };
    return this;
  }

  /**
   * Set audit configuration
   */
  withAudit(audit: Partial<SecurityAuditConfig>): SecurityConfigBuilder {
    this.config.audit = {
      ...this.config.audit,
      ...audit
    };
    return this;
  }

  /**
   * Set logging configuration
   */
  withLogging(logging: Partial<SecurityLoggingConfig>): SecurityConfigBuilder {
    this.config.logging = {
      ...this.config.logging,
      ...logging
    };
    return this;
  }

  /**
   * Set validation configuration
   */
  withValidation(validation: Partial<SecurityValidationConfig>): SecurityConfigBuilder {
    this.config.validation = {
      ...this.config.validation,
      ...validation
    };
    return this;
  }

  /**
   * Add sensitive fields to redact
   */
  addSensitiveFields(fields: string[]): SecurityConfigBuilder {
    this.config.security.sensitiveFields.push(...fields);
    this.config.logging.redactFields.push(...fields);
    return this;
  }

  /**
   * Add SQL injection patterns
   */
  addSqlInjectionPatterns(patterns: RegExp[]): SecurityConfigBuilder {
    this.config.validation.sqlInjectionPatterns.push(...patterns);
    return this;
  }

  /**
   * Add XSS patterns
   */
  addXssPatterns(patterns: RegExp[]): SecurityConfigBuilder {
    this.config.validation.xssPatterns.push(...patterns);
    return this;
  }

  /**
   * Build the configuration
   */
  build(): SecurityConfig {
    return { ...this.config };
  }
}