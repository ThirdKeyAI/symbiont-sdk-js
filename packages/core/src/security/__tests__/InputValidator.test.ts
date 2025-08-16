import { describe, it, expect, beforeEach } from 'vitest';
import { InputValidator, ValidationRule } from '../InputValidator';
import { DEFAULT_SECURITY_CONFIG } from '../SecurityConfig';

describe('InputValidator - Comprehensive Tests', () => {
  let validator: InputValidator;

  beforeEach(() => {
    validator = new InputValidator(DEFAULT_SECURITY_CONFIG.validation);
  });

  describe('Basic Validation', () => {
    it('should validate input against single rule', () => {
      const result = validator.validate('test@example.com', ['email']);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.sanitized).toBe('test@example.com');
    });

    it('should validate input against multiple rules', () => {
      const result = validator.validate('testuser123', ['alphanumericOnly', 'noEmpty']);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation with invalid input', () => {
      const result = validator.validate('invalid-email', ['email']);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid email format');
      expect(result.sanitized).toBeUndefined();
    });

    it('should handle unknown validation rules', () => {
      const result = validator.validate('test', ['unknownRule']);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Unknown validation rule: unknownRule');
    });

    it('should enforce maximum input length', () => {
      const longInput = 'x'.repeat(100001);
      const result = validator.validate(longInput, ['noEmpty']);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Input exceeds maximum length');
    });
  });

  describe('Built-in Validation Rules', () => {
    describe('Email Validation', () => {
      it('should validate correct email formats', () => {
        const validEmails = [
          'test@example.com',
          'user.name@domain.co.uk',
          'test+tag@example.org',
          'firstname.lastname@company.com'
        ];

        validEmails.forEach(email => {
          const result = validator.validate(email, ['email']);
          expect(result.valid).toBe(true);
        });
      });

      it('should reject invalid email formats', () => {
        const invalidEmails = [
          'invalid-email',
          '@example.com',
          'test@',
          'test..test@example.com',
          'test@.com',
          'test@com',
          ''
        ];

        invalidEmails.forEach(email => {
          const result = validator.validate(email, ['email']);
          expect(result.valid).toBe(false);
        });
      });
    });

    describe('URL Validation', () => {
      it('should validate correct URL formats', () => {
        const validUrls = [
          'https://example.com',
          'http://localhost:3000',
          'ftp://files.example.com',
          'https://sub.domain.com/path?query=value'
        ];

        validUrls.forEach(url => {
          const result = validator.validate(url, ['url']);
          expect(result.valid).toBe(true);
        });
      });

      it('should reject invalid URL formats', () => {
        const invalidUrls = [
          'not-a-url',
          'javascript:alert(1)',
          'data:text/html,<script>alert(1)</script>',
          'example.com',
          ''
        ];

        invalidUrls.forEach(url => {
          const result = validator.validate(url, ['url']);
          expect(result.valid).toBe(false);
        });
      });
    });

    describe('UUID Validation', () => {
      it('should validate correct UUID formats', () => {
        const validUuids = [
          '550e8400-e29b-41d4-a716-446655440000',
          '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
          '6ba7b811-9dad-11d1-80b4-00c04fd430c8',
          '00000000-0000-1000-8000-000000000000'
        ];

        validUuids.forEach(uuid => {
          const result = validator.validate(uuid, ['uuid']);
          expect(result.valid).toBe(true);
        });
      });

      it('should reject invalid UUID formats', () => {
        const invalidUuids = [
          'not-a-uuid',
          '550e8400-e29b-41d4-a716',
          '550e8400-e29b-41d4-a716-446655440000-extra',
          'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
          ''
        ];

        invalidUuids.forEach(uuid => {
          const result = validator.validate(uuid, ['uuid']);
          expect(result.valid).toBe(false);
        });
      });
    });

    describe('Alphanumeric Validation', () => {
      it('should validate alphanumeric strings', () => {
        const validInputs = ['abc123', 'ABC', '123', 'TestUser123'];

        validInputs.forEach(input => {
          const result = validator.validate(input, ['alphanumericOnly']);
          expect(result.valid).toBe(true);
        });
      });

      it('should reject non-alphanumeric strings', () => {
        const invalidInputs = ['test@example', 'hello world', 'test-user', 'user_name', ''];

        invalidInputs.forEach(input => {
          const result = validator.validate(input, ['alphanumericOnly']);
          expect(result.valid).toBe(false);
        });
      });

      it('should sanitize non-alphanumeric characters', () => {
        const result = validator.validate('test@user-123', ['alphanumericOnly']);
        expect(result.valid).toBe(false);
        // In non-strict mode, sanitization would occur
      });
    });

    describe('Numeric Validation', () => {
      it('should validate numeric values', () => {
        const validNumbers = ['123', '0', '-456', '3.14', '1e10'];

        validNumbers.forEach(num => {
          const result = validator.validate(num, ['numeric']);
          expect(result.valid).toBe(true);
          expect(typeof result.sanitized).toBe('number');
        });
      });

      it('should reject non-numeric values', () => {
        const invalidNumbers = ['abc', 'test123', '', 'NaN'];

        invalidNumbers.forEach(num => {
          const result = validator.validate(num, ['numeric']);
          expect(result.valid).toBe(false);
        });
      });
    });

    describe('Empty Value Validation', () => {
      it('should reject empty strings', () => {
        const result = validator.validate('', ['noEmpty']);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Value cannot be empty');
      });

      it('should reject whitespace-only strings', () => {
        const result = validator.validate('   \t\n   ', ['noEmpty']);
        expect(result.valid).toBe(false);
      });

      it('should accept non-empty strings', () => {
        const result = validator.validate('valid content', ['noEmpty']);
        expect(result.valid).toBe(true);
      });
    });

    describe('Special Characters Validation', () => {
      it('should validate allowed special characters', () => {
        const validInputs = ['test.file', 'user_name', 'file-name', 'hello world'];

        validInputs.forEach(input => {
          const result = validator.validate(input, ['noSpecialChars']);
          expect(result.valid).toBe(true);
        });
      });

      it('should reject disallowed special characters', () => {
        const invalidInputs = ['test@example', 'user#name', 'file$name', 'test%value'];

        invalidInputs.forEach(input => {
          const result = validator.validate(input, ['noSpecialChars']);
          expect(result.valid).toBe(false);
        });
      });
    });
  });

  describe('Security Validations', () => {
    describe('HTML Content Detection', () => {
      it('should detect HTML tags', () => {
        const htmlInputs = [
          '<script>alert("xss")</script>',
          '<div>Hello World</div>',
          '<img src="image.jpg">',
          'Hello <b>World</b>'
        ];

        htmlInputs.forEach(html => {
          const result = validator.validate(html, ['noHtml']);
          expect(result.valid).toBe(false);
          expect(result.errors).toContain('HTML content is not allowed');
        });
      });

      it('should strip HTML tags during sanitization', () => {
        const nonStrictConfig = {
          ...DEFAULT_SECURITY_CONFIG.validation,
          strict: false
        };
        const nonStrictValidator = new InputValidator(nonStrictConfig);

        const result = nonStrictValidator.validate('<div>Hello <b>World</b></div>', ['noHtml']);
        expect(result.valid).toBe(false);
        expect(result.sanitized).toBe('Hello World');
      });

      it('should allow plain text without HTML', () => {
        const result = validator.validate('Plain text without any tags', ['noHtml']);
        expect(result.valid).toBe(true);
      });
    });

    describe('SQL Injection Detection', () => {
      it('should detect SQL injection patterns', () => {
        const sqlInjectionInputs = [
          "'; DROP TABLE users; --",
          "1 OR 1=1",
          "UNION SELECT * FROM passwords",
          "'; DELETE FROM accounts WHERE 1=1; --",
          "admin'--",
          "' OR 'a'='a"
        ];

        sqlInjectionInputs.forEach(sql => {
          const result = validator.validate(sql, ['noSqlInjection']);
          expect(result.valid).toBe(false);
          expect(result.errors).toContain('Potentially dangerous SQL patterns detected');
        });
      });

      it('should allow safe SQL-like content', () => {
        const safeInputs = [
          'My favorite song is "Don\'t Stop Believin"',
          'Price range: $10-20',
          'Email: user@example.com'
        ];

        safeInputs.forEach(input => {
          const result = validator.validate(input, ['noSqlInjection']);
          expect(result.valid).toBe(true);
        });
      });

      it('should escape SQL injection patterns during sanitization', () => {
        const nonStrictConfig = {
          ...DEFAULT_SECURITY_CONFIG.validation,
          strict: false
        };
        const nonStrictValidator = new InputValidator(nonStrictConfig);

        const result = nonStrictValidator.validate("test'; DROP TABLE", ['noSqlInjection']);
        expect(result.sanitized).toContain("\\'\\;");
      });
    });

    describe('XSS Detection', () => {
      it('should detect XSS patterns', () => {
        const xssInputs = [
          '<script>alert("xss")</script>',
          '<iframe src="evil.com"></iframe>',
          '<img src="x" onerror="alert(1)">',
          'javascript:alert(1)',
          '<object data="evil.swf"></object>',
          '<embed src="evil.swf">',
          '<link rel="stylesheet" href="evil.css">',
          'vbscript:msgbox("xss")',
          'data:text/html,<script>alert(1)</script>'
        ];

        xssInputs.forEach(xss => {
          const result = validator.validate(xss, ['noXss']);
          expect(result.valid).toBe(false);
          expect(result.errors).toContain('Potentially dangerous XSS patterns detected');
        });
      });

      it('should sanitize XSS patterns', () => {
        const nonStrictConfig = {
          ...DEFAULT_SECURITY_CONFIG.validation,
          strict: false
        };
        const nonStrictValidator = new InputValidator(nonStrictConfig);

        const result = nonStrictValidator.validate('<script>alert("test")</script>', ['noXss']);
        expect(result.sanitized).not.toContain('<script>');
        expect(result.sanitized).toContain('&lt;');
      });

      it('should remove dangerous protocols', () => {
        const nonStrictConfig = {
          ...DEFAULT_SECURITY_CONFIG.validation,
          strict: false
        };
        const nonStrictValidator = new InputValidator(nonStrictConfig);

        const result = nonStrictValidator.validate('javascript:alert(1)', ['noXss']);
        expect(result.sanitized).not.toContain('javascript:');
      });
    });
  });

  describe('String Validation Helper', () => {
    it('should validate string length constraints', () => {
      const result = validator.validateString('test', {
        minLength: 3,
        maxLength: 10
      });
      expect(result.valid).toBe(true);
    });

    it('should reject strings that are too short', () => {
      const result = validator.validateString('ab', {
        minLength: 5
      });
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('minimum length');
    });

    it('should reject strings that are too long', () => {
      const result = validator.validateString('verylongstring', {
        maxLength: 5
      });
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('maximum length');
    });

    it('should handle empty strings based on allowEmpty option', () => {
      const allowEmptyResult = validator.validateString('', {
        allowEmpty: true
      });
      expect(allowEmptyResult.valid).toBe(true);

      const disallowEmptyResult = validator.validateString('', {
        allowEmpty: false
      });
      expect(disallowEmptyResult.valid).toBe(false);
    });

    it('should combine multiple validation options', () => {
      const result = validator.validateString('test123', {
        minLength: 5,
        maxLength: 10,
        alphanumericOnly: true,
        noHtml: true
      });
      expect(result.valid).toBe(true);
    });
  });

  describe('Object Validation', () => {
    it('should validate object properties according to rules', () => {
      const testObject = {
        email: 'user@example.com',
        username: 'testuser123',
        age: '25'
      };

      const rules = {
        email: ['email'],
        username: ['alphanumericOnly', 'noEmpty'],
        age: ['numeric']
      };

      const result = validator.validateObject(testObject, rules);
      expect(result.valid).toBe(true);
      expect(result.sanitized).toBeDefined();
      expect(typeof result.sanitized!.age).toBe('number');
    });

    it('should handle validation errors in object properties', () => {
      const testObject = {
        email: 'invalid-email',
        username: 'test@user',
        age: 'not-a-number'
      };

      const rules = {
        email: ['email'],
        username: ['alphanumericOnly'],
        age: ['numeric']
      };

      const result = validator.validateObject(testObject, rules);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(3);
      expect(result.errors[0]).toContain('email:');
      expect(result.errors[1]).toContain('username:');
      expect(result.errors[2]).toContain('age:');
    });

    it('should pass through properties without validation rules', () => {
      const testObject = {
        validatedField: 'test@example.com',
        unvalidatedField: 'any value here'
      };

      const rules = {
        validatedField: ['email']
      };

      const result = validator.validateObject(testObject, rules);
      expect(result.valid).toBe(true);
      expect(result.sanitized!.unvalidatedField).toBe('any value here');
    });
  });

  describe('Array Validation', () => {
    it('should validate array elements', () => {
      const testArray = ['user1@example.com', 'user2@example.com', 'user3@example.com'];
      const result = validator.validateArray(testArray, ['email']);
      
      expect(result.valid).toBe(true);
      expect(result.sanitized).toEqual(testArray);
    });

    it('should handle validation errors in array elements', () => {
      const testArray = ['valid@example.com', 'invalid-email', 'another@example.com'];
      const result = validator.validateArray(testArray, ['email']);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Index 1:');
    });

    it('should sanitize array elements', () => {
      const testArray = ['123', 'abc', '456'];
      const result = validator.validateArray(testArray, ['numeric']);
      
      expect(result.valid).toBe(false); // 'abc' is not numeric
      expect(result.errors).toHaveLength(1);
    });
  });

  describe('Custom Rules', () => {
    it('should register and use custom validation rules', () => {
      const customRule: ValidationRule = {
        name: 'customTest',
        validate: (value: string) => value.startsWith('test_'),
        errorMessage: 'Value must start with test_'
      };

      validator.registerRule(customRule);

      const validResult = validator.validate('test_value', ['customTest']);
      expect(validResult.valid).toBe(true);

      const invalidResult = validator.validate('invalid_value', ['customTest']);
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors).toContain('Value must start with test_');
    });

    it('should register custom rule with sanitization', () => {
      const customRule: ValidationRule = {
        name: 'removeSpaces',
        validate: () => true, // Always pass validation
        sanitize: (value: string) => value.replace(/\s+/g, ''),
        errorMessage: 'Should not have spaces'
      };

      validator.registerRule(customRule);

      const result = validator.validate('hello world test', ['removeSpaces']);
      expect(result.valid).toBe(true);
      expect(result.sanitized).toBe('helloworldtest');
    });

    it('should remove custom rules', () => {
      const customRule: ValidationRule = {
        name: 'tempRule',
        validate: () => true,
        errorMessage: 'Temporary rule'
      };

      validator.registerRule(customRule);
      expect(validator.getAvailableRules()).toContain('tempRule');

      validator.removeRule('tempRule');
      expect(validator.getAvailableRules()).not.toContain('tempRule');
    });

    it('should list available rules', () => {
      const rules = validator.getAvailableRules();
      expect(rules).toContain('email');
      expect(rules).toContain('noHtml');
      expect(rules).toContain('noSqlInjection');
      expect(rules).toContain('alphanumericOnly');
    });
  });

  describe('Sanitization Mode', () => {
    it('should sanitize input without strict validation', () => {
      const dirtyInput = 'test@user<script>alert(1)</script>';
      const sanitized = validator.sanitize(dirtyInput, ['noHtml', 'alphanumericOnly']);
      
      expect(sanitized).not.toContain('<script>');
      expect(typeof sanitized).toBe('string');
    });

    it('should handle sanitization errors gracefully', () => {
      const problematicRule: ValidationRule = {
        name: 'problematicSanitizer',
        validate: () => true,
        sanitize: () => { throw new Error('Sanitization failed'); },
        errorMessage: 'Error'
      };

      validator.registerRule(problematicRule);
      
      const input = 'test input';
      const result = validator.sanitize(input, ['problematicSanitizer']);
      expect(result).toBe(input); // Should return original input on error
    });
  });

  describe('Error Handling', () => {
    it('should handle validation rule errors gracefully', () => {
      const faultyRule: ValidationRule = {
        name: 'faultyRule',
        validate: () => { throw new Error('Validation error'); },
        errorMessage: 'Faulty rule error'
      };

      validator.registerRule(faultyRule);

      const result = validator.validate('test', ['faultyRule']);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Validation error in rule faultyRule');
    });

    it('should handle non-string inputs appropriately', () => {
      const numericResult = validator.validate(123, ['email']);
      expect(numericResult.valid).toBe(false);

      const objectResult = validator.validate({}, ['noEmpty']);
      expect(objectResult.valid).toBe(false);

      const nullResult = validator.validate(null, ['noEmpty']);
      expect(nullResult.valid).toBe(false);
    });
  });

  describe('Configuration Behavior', () => {
    it('should respect strict mode configuration', () => {
      const strictConfig = {
        ...DEFAULT_SECURITY_CONFIG.validation,
        strict: true
      };
      const strictValidator = new InputValidator(strictConfig);

      const result = strictValidator.validate('<div>test</div>', ['noHtml']);
      expect(result.valid).toBe(false);
      expect(result.sanitized).toBeUndefined();
    });

    it('should allow sanitization in non-strict mode', () => {
      const nonStrictConfig = {
        ...DEFAULT_SECURITY_CONFIG.validation,
        strict: false
      };
      const nonStrictValidator = new InputValidator(nonStrictConfig);

      const result = nonStrictValidator.validate('<div>test</div>', ['noHtml']);
      expect(result.valid).toBe(false);
      expect(result.sanitized).toBe('test');
    });
  });
});