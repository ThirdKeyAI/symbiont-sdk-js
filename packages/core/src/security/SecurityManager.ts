import { SecurityConfig } from './SecurityConfig';
import { CryptoUtils } from './CryptoUtils';
import { SecureLogger } from './SecureLogger';
import { InputValidator } from './InputValidator';

/**
 * Central security manager for policy enforcement and threat detection
 */
export class SecurityManager {
  private config: SecurityConfig;
  private logger: SecureLogger;
  private inputValidator: InputValidator;
  private auditLog: Array<{ timestamp: Date; event: string; details: any }> = [];

  constructor(config: SecurityConfig) {
    this.config = config;
    this.logger = new SecureLogger(config.logging);
    this.inputValidator = new InputValidator(config.validation);
  }

  /**
   * Validate input data with security policies
   */
  validateInput(input: any, rules: string[]): { valid: boolean; errors: string[] } {
    const startTime = process.hrtime.bigint();
    
    try {
      const result = this.inputValidator.validate(input, rules);
      
      if (!result.valid && this.config.audit.enabled) {
        this.auditSecurityEvent('input_validation_failed', {
          rules,
          errors: result.errors,
          timestamp: new Date()
        });
      }
      
      return result;
    } finally {
      // Ensure constant time by padding if necessary
      const elapsed = process.hrtime.bigint() - startTime;
      if (elapsed < this.config.security.minValidationTime) {
        const padTime = Number(this.config.security.minValidationTime - elapsed) / 1000000;
        setTimeout(() => {}, padTime);
      }
    }
  }

  /**
   * Perform constant-time string comparison
   */
  constantTimeCompare(a: string, b: string): boolean {
    // Handle null/undefined values
    if (a == null || b == null) {
      return false;
    }
    
    return CryptoUtils.constantTimeCompare(a, b);
  }

  /**
   * Generate secure random token
   */
  generateSecureToken(): string {
    return CryptoUtils.generateSecureToken();
  }

  /**
   * Verify HMAC signature with timing attack prevention
   */
  verifyHmac(data: string, signature: string, secret: string): boolean {
    const startTime = process.hrtime.bigint();
    
    try {
      return CryptoUtils.verifyHmac(data, signature, secret);
    } finally {
      // Ensure constant time
      const elapsed = process.hrtime.bigint() - startTime;
      if (elapsed < this.config.security.minVerificationTime) {
        const padTime = Number(this.config.security.minVerificationTime - elapsed) / 1000000;
        setTimeout(() => {}, padTime);
      }
    }
  }

  /**
   * Audit security events
   */
  auditSecurityEvent(event: string, details: any): void {
    if (!this.config.audit.enabled) {
      return;
    }

    const auditEntry = {
      timestamp: new Date(),
      event,
      details: this.sanitizeAuditData(details)
    };

    this.auditLog.push(auditEntry);
    this.logger.logSecurityEvent(event, auditEntry);

    // Cleanup old audit entries
    if (this.auditLog.length > this.config.audit.maxEntries) {
      this.auditLog.splice(0, this.auditLog.length - this.config.audit.maxEntries);
    }
  }

  /**
   * Detect potential timing attacks
   */
  detectTimingAttack(operationTimes: number[]): boolean {
    if (operationTimes.length < this.config.security.timingAttackThreshold) {
      return false;
    }

    const mean = operationTimes.reduce((a, b) => a + b, 0) / operationTimes.length;
    const variance = operationTimes.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / operationTimes.length;
    const stdDev = Math.sqrt(variance);

    // If standard deviation is too low, it might indicate timing attack patterns
    const coefficient = stdDev / mean;
    return coefficient < this.config.security.timingVarianceThreshold;
  }

  /**
   * Get security audit log
   */
  getAuditLog(): Array<{ timestamp: Date; event: string; details: any }> {
    return [...this.auditLog];
  }

  /**
   * Clear audit log
   */
  clearAuditLog(): void {
    this.auditLog = [];
  }

  /**
   * Get security metrics
   */
  getSecurityMetrics(): {
    auditLogSize: number;
    timingAttackDetections: number;
    inputValidationFailures: number;
  } {
    const timingAttacks = this.auditLog.filter(entry => entry.event === 'timing_attack_detected').length;
    const validationFailures = this.auditLog.filter(entry => entry.event === 'input_validation_failed').length;

    return {
      auditLogSize: this.auditLog.length,
      timingAttackDetections: timingAttacks,
      inputValidationFailures: validationFailures
    };
  }

  /**
   * Sanitize data for audit logging (remove sensitive information)
   */
  private sanitizeAuditData(data: any, visited = new WeakSet()): any {
    // Handle primitive types
    if (data === null || data === undefined || typeof data !== 'object') {
      return data;
    }

    // Handle circular references
    if (visited.has(data)) {
      return '[CIRCULAR]';
    }
    visited.add(data);

    // Handle arrays
    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeAuditData(item, visited));
    }

    // Handle objects
    const result: any = {};
    const sensitiveFields = this.config.security.sensitiveFields;

    for (const [key, value] of Object.entries(data)) {
      // Check if field name contains sensitive keywords (case-insensitive)
      const keyLower = key.toLowerCase();
      const isSensitive = sensitiveFields.some(field =>
        keyLower.includes(field.toLowerCase())
      );

      if (isSensitive && (typeof value !== 'object' || value === null)) {
        // Only redact primitive sensitive values, not objects
        result[key] = '[REDACTED]';
      } else if (value !== null && typeof value === 'object') {
        // Always recursively sanitize nested objects, even if the key is sensitive
        result[key] = this.sanitizeAuditData(value, visited);
      } else {
        result[key] = value;
      }
    }

    return result;
  }
}