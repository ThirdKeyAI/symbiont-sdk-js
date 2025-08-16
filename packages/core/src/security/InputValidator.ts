import { SecurityValidationConfig } from './SecurityConfig';

/**
 * Validation result interface
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  sanitized?: any;
}

/**
 * Validation rule interface
 */
export interface ValidationRule {
  name: string;
  validate: (value: any) => boolean;
  sanitize?: (value: any) => any;
  errorMessage: string;
}

/**
 * Input validator with security-focused validation rules
 */
export class InputValidator {
  private config: SecurityValidationConfig;
  private customRules: Map<string, ValidationRule> = new Map();

  constructor(config: SecurityValidationConfig) {
    this.config = config;
    this.registerDefaultRules();
  }

  /**
   * Validate input against specified rules
   */
  validate(input: any, ruleNames: string[]): ValidationResult {
    const errors: string[] = [];
    let sanitized = input;

    // Check input length first
    if (typeof input === 'string' && input.length > this.config.maxInputLength) {
      errors.push(`Input exceeds maximum length of ${this.config.maxInputLength} characters`);
      return { valid: false, errors };
    }

    // Apply each validation rule
    for (const ruleName of ruleNames) {
      const rule = this.customRules.get(ruleName);
      if (!rule) {
        errors.push(`Unknown validation rule: ${ruleName}`);
        continue;
      }

      try {
        if (!rule.validate(sanitized)) {
          errors.push(rule.errorMessage);
          if (!this.config.strict) {
            // In non-strict mode, try to sanitize
            if (rule.sanitize) {
              sanitized = rule.sanitize(sanitized);
            }
          }
        } else if (rule.sanitize) {
          // Always apply sanitization if available
          sanitized = rule.sanitize(sanitized);
        }
      } catch (error) {
        errors.push(`Validation error in rule ${ruleName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      sanitized: !this.config.strict || errors.length === 0 ? sanitized : undefined
    };
  }

  /**
   * Sanitize input without strict validation
   */
  sanitize(input: any, ruleNames: string[]): any {
    let sanitized = input;

    for (const ruleName of ruleNames) {
      const rule = this.customRules.get(ruleName);
      if (rule && rule.sanitize) {
        try {
          sanitized = rule.sanitize(sanitized);
        } catch {
          // If sanitization fails, return original input
          continue;
        }
      }
    }

    return sanitized;
  }

  /**
   * Quick validation for common use cases
   */
  validateString(input: string, options: {
    maxLength?: number;
    minLength?: number;
    allowEmpty?: boolean;
    noHtml?: boolean;
    noSql?: boolean;
    alphanumericOnly?: boolean;
  }): ValidationResult {
    const rules: string[] = [];

    if (options.maxLength !== undefined) {
      this.addTempRule(`maxLength_${options.maxLength}`, {
        name: `maxLength_${options.maxLength}`,
        validate: (value: string) => value.length <= options.maxLength!,
        errorMessage: `String exceeds maximum length of ${options.maxLength}`
      });
      rules.push(`maxLength_${options.maxLength}`);
    }

    if (options.minLength !== undefined) {
      this.addTempRule(`minLength_${options.minLength}`, {
        name: `minLength_${options.minLength}`,
        validate: (value: string) => value.length >= options.minLength!,
        errorMessage: `String is shorter than minimum length of ${options.minLength}`
      });
      rules.push(`minLength_${options.minLength}`);
    }

    if (!options.allowEmpty) {
      rules.push('noEmpty');
    }

    if (options.noHtml) {
      rules.push('noHtml');
    }

    if (options.noSql) {
      rules.push('noSqlInjection');
    }

    if (options.alphanumericOnly) {
      rules.push('alphanumericOnly');
    }

    return this.validate(input, rules);
  }

  /**
   * Register a custom validation rule
   */
  registerRule(rule: ValidationRule): void {
    this.customRules.set(rule.name, rule);
  }

  /**
   * Remove a validation rule
   */
  removeRule(name: string): void {
    this.customRules.delete(name);
  }

  /**
   * Get available rule names
   */
  getAvailableRules(): string[] {
    return Array.from(this.customRules.keys());
  }

  /**
   * Register default security validation rules
   */
  private registerDefaultRules(): void {
    // No HTML tags
    this.registerRule({
      name: 'noHtml',
      validate: (value: string) => {
        if (typeof value !== 'string') return true;
        return !this.containsHtml(value);
      },
      sanitize: (value: string) => this.stripHtml(value),
      errorMessage: 'HTML content is not allowed'
    });

    // No SQL injection patterns
    this.registerRule({
      name: 'noSqlInjection',
      validate: (value: string) => {
        if (typeof value !== 'string') return true;
        return !this.containsSqlInjection(value);
      },
      sanitize: (value: string) => this.escapeSqlInjection(value),
      errorMessage: 'Potentially dangerous SQL patterns detected'
    });

    // No XSS patterns
    this.registerRule({
      name: 'noXss',
      validate: (value: string) => {
        if (typeof value !== 'string') return true;
        return !this.containsXss(value);
      },
      sanitize: (value: string) => this.sanitizeXss(value),
      errorMessage: 'Potentially dangerous XSS patterns detected'
    });

    // No empty strings
    this.registerRule({
      name: 'noEmpty',
      validate: (value: string) => {
        if (typeof value !== 'string') return false;
        return value.trim().length > 0;
      },
      errorMessage: 'Value cannot be empty'
    });

    // Alphanumeric only
    this.registerRule({
      name: 'alphanumericOnly',
      validate: (value: string) => {
        if (typeof value !== 'string') return false;
        return /^[a-zA-Z0-9]+$/.test(value);
      },
      sanitize: (value: string) => value.replace(/[^a-zA-Z0-9]/g, ''),
      errorMessage: 'Only alphanumeric characters are allowed'
    });

    // Email format
    this.registerRule({
      name: 'email',
      validate: (value: string) => {
        if (typeof value !== 'string') return false;
        // More strict email validation
        const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
        
        // Additional strict checks
        if (!emailRegex.test(value)) return false;
        if (value.includes('..')) return false;
        if (value.startsWith('.') || value.endsWith('.')) return false;
        if (value.includes('@.') || value.includes('.@')) return false;
        if (value.split('@').length !== 2) return false;
        
        const [local, domain] = value.split('@');
        if (local.length === 0 || local.length > 64) return false;
        if (domain.length === 0 || domain.length > 253) return false;
        if (domain.startsWith('.') || domain.endsWith('.')) return false;
        
        // Domain must contain at least one dot (no bare TLDs allowed)
        if (!domain.includes('.')) return false;
        
        return true;
      },
      errorMessage: 'Invalid email format'
    });

    // URL format
    this.registerRule({
      name: 'url',
      validate: (value: string) => {
        if (typeof value !== 'string') return false;
        try {
          const url = new URL(value);
          // Additional checks for valid protocols
          return ['http:', 'https:', 'ftp:', 'ftps:'].includes(url.protocol);
        } catch {
          return false;
        }
      },
      errorMessage: 'Invalid URL format'
    });

    // UUID format
    this.registerRule({
      name: 'uuid',
      validate: (value: string) => {
        if (typeof value !== 'string') return false;
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return uuidRegex.test(value);
      },
      errorMessage: 'Invalid UUID format'
    });

    // Numeric only
    this.registerRule({
      name: 'numeric',
      validate: (value: any) => {
        if (value === null || value === undefined || value === '') return false;
        return !isNaN(Number(value)) && isFinite(Number(value));
      },
      sanitize: (value: any) => Number(value),
      errorMessage: 'Value must be numeric'
    });

    // No special characters
    this.registerRule({
      name: 'noSpecialChars',
      validate: (value: string) => {
        if (typeof value !== 'string') return false;
        return /^[a-zA-Z0-9\s._-]+$/.test(value);
      },
      sanitize: (value: string) => value.replace(/[^a-zA-Z0-9\s._-]/g, ''),
      errorMessage: 'Special characters are not allowed'
    });
  }

  /**
   * Check if string contains HTML
   */
  private containsHtml(value: string): boolean {
    const htmlRegex = /<[^>]*>/;
    return htmlRegex.test(value);
  }

  /**
   * Strip HTML tags from string
   */
  private stripHtml(value: string): string {
    return value.replace(/<[^>]*>/g, '');
  }

  /**
   * Check for SQL injection patterns
   */
  private containsSqlInjection(value: string): boolean {
    // Convert to lowercase for case-insensitive matching
    const lowerValue = value.toLowerCase();
    
    // Check against configured patterns
    const configPatterns = this.config.sqlInjectionPatterns.some(pattern => pattern.test(value));
    
    // Additional strict SQL injection checks
    const additionalChecks = [
      // Common SQL injection patterns
      /('\s*(or|and)\s*'[^']*'?\s*=\s*'[^']*'?)/i,
      /('\s*(or|and)\s*\d+\s*=\s*\d+)/i,
      /(union\s+select)/i,
      /(drop\s+table)/i,
      /(insert\s+into)/i,
      /(delete\s+from)/i,
      /(update\s+.*\s+set)/i,
      /(create\s+table)/i,
      /(alter\s+table)/i,
      /(exec\s*\()/i,
      /(sp_)/i,
      /(xp_)/i,
      /(0x[0-9a-f]+)/i,
      /(char\s*\(\s*\d+\s*\))/i,
      /(ascii\s*\(\s*)/i,
      /(substring\s*\(\s*)/i,
      /(waitfor\s+delay)/i,
      /(convert\s*\(\s*)/i,
      /(cast\s*\(\s*)/i,
      /(concat\s*\(\s*)/i,
      /(load_file\s*\(\s*)/i,
      /(into\s+outfile)/i,
      /(into\s+dumpfile)/i,
      /(\|\|\s*')/i,
      /('.*'\s*\+\s*')/i,
      /('.*'\s*\|\|\s*')/i
    ];
    
    const additionalMatches = additionalChecks.some(pattern => pattern.test(value));
    
    return configPatterns || additionalMatches;
  }

  /**
   * Escape SQL injection patterns
   */
  private escapeSqlInjection(value: string): string {
    // Basic escaping - in production, use proper parameterized queries
    return value
      .replace(/'/g, "\\'")
      .replace(/"/g, '\\"')
      .replace(/;/g, '\\;')
      .replace(/--/g, '\\--')
      .replace(/\/\*/g, '\\/\\*')
      .replace(/\*\//g, '\\*\\/');
  }

  /**
   * Check for XSS patterns
   */
  private containsXss(value: string): boolean {
    return this.config.xssPatterns.some(pattern => {
      // Reset regex state for global patterns to ensure consistent behavior
      pattern.lastIndex = 0;
      return pattern.test(value);
    });
  }

  /**
   * Sanitize XSS patterns
   */
  private sanitizeXss(value: string): string {
    let sanitized = value;

    // HTML encode dangerous characters
    sanitized = sanitized
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');

    // Remove javascript: and other dangerous protocols
    sanitized = sanitized.replace(/(javascript|vbscript|data|file|about):/gi, '');

    // Remove event handlers
    sanitized = sanitized.replace(/on\w+\s*=/gi, '');

    return sanitized;
  }

  /**
   * Add temporary rule (will be cleaned up)
   */
  private addTempRule(name: string, rule: ValidationRule): void {
    this.customRules.set(name, rule);
    // Set timeout to remove temp rule
    setTimeout(() => {
      this.customRules.delete(name);
    }, 1000);
  }

  /**
   * Validate object properties
   */
  validateObject(obj: Record<string, any>, rules: Record<string, string[]>): ValidationResult {
    const errors: string[] = [];
    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(obj)) {
      if (rules[key]) {
        const result = this.validate(value, rules[key]);
        if (!result.valid) {
          errors.push(...result.errors.map(error => `${key}: ${error}`));
        } else {
          sanitized[key] = result.sanitized;
        }
      } else {
        sanitized[key] = value;
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      sanitized: errors.length === 0 ? sanitized : undefined
    };
  }

  /**
   * Validate array of values
   */
  validateArray(arr: any[], rules: string[]): ValidationResult {
    const errors: string[] = [];
    const sanitized: any[] = [];

    for (let i = 0; i < arr.length; i++) {
      const result = this.validate(arr[i], rules);
      if (!result.valid) {
        errors.push(...result.errors.map(error => `Index ${i}: ${error}`));
      } else {
        sanitized.push(result.sanitized);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      sanitized: errors.length === 0 ? sanitized : undefined
    };
  }
}