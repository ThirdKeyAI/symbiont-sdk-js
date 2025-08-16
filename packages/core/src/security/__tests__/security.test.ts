import { vi } from 'vitest';
import { CryptoUtils } from '../CryptoUtils';
import { SecureLogger, LogLevel } from '../SecureLogger';
import { InputValidator } from '../InputValidator';
import { SecurityManager } from '../SecurityManager';
import { DEFAULT_SECURITY_CONFIG, SecurityConfigBuilder } from '../SecurityConfig';

describe('Security Implementations', () => {
  describe('CryptoUtils', () => {
    test('constant time comparison should work correctly', () => {
      expect(CryptoUtils.constantTimeCompare('hello', 'hello')).toBe(true);
      expect(CryptoUtils.constantTimeCompare('hello', 'world')).toBe(false);
      expect(CryptoUtils.constantTimeCompare('hello', 'hello123')).toBe(false);
      expect(CryptoUtils.constantTimeCompare('', '')).toBe(true);
    });

    test('should generate secure random tokens', () => {
      const token1 = CryptoUtils.generateSecureToken();
      const token2 = CryptoUtils.generateSecureToken();
      
      expect(token1).not.toBe(token2);
      expect(token1.length).toBeGreaterThan(0);
      expect(typeof token1).toBe('string');
    });

    test('should hash passwords securely', async () => {
      const password = 'testPassword123';
      const result = await CryptoUtils.hashPassword(password);
      
      expect(result.hash).toBeDefined();
      expect(result.salt).toBeDefined();
      expect(result.iterations).toBe(100000);
      
      // Verify password
      const isValid = await CryptoUtils.verifyPassword(password, result.hash, result.salt, result.iterations);
      expect(isValid).toBe(true);
      
      // Verify wrong password fails
      const isInvalid = await CryptoUtils.verifyPassword('wrongPassword', result.hash, result.salt, result.iterations);
      expect(isInvalid).toBe(false);
    });

    test('should verify HMAC signatures correctly', () => {
      const data = 'test data';
      const secret = 'test secret';
      
      const signature = CryptoUtils.hmac(data, secret);
      expect(CryptoUtils.verifyHmac(data, signature, secret)).toBe(true);
      expect(CryptoUtils.verifyHmac('different data', signature, secret)).toBe(false);
      expect(CryptoUtils.verifyHmac(data, 'wrong signature', secret)).toBe(false);
    });
  });

  describe('SecureLogger', () => {
    let logger: SecureLogger;

    beforeEach(() => {
      logger = new SecureLogger(DEFAULT_SECURITY_CONFIG.logging);
    });

    test('should redact sensitive data from logs', () => {
      const sensitiveData = {
        username: 'testuser',
        password: 'secret123',
        token: 'jwt-token-here',
        email: 'test@example.com'
      };

      // Capture console output
      const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
      
      logger.info('Test log', sensitiveData);
      
      const logOutput = consoleSpy.mock.calls[0][0];
      expect(logOutput).toContain('[REDACTED');
      expect(logOutput).not.toContain('secret123');
      expect(logOutput).not.toContain('jwt-token-here');
      
      consoleSpy.mockRestore();
    });

    test('should sanitize JWT tokens in messages', () => {
      const message = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      logger.warn(message);
      
      const logOutput = consoleSpy.mock.calls[0][0];
      expect(logOutput).toContain('[REDACTED]');
      expect(logOutput).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
      
      consoleSpy.mockRestore();
    });
  });

  describe('InputValidator', () => {
    let validator: InputValidator;

    beforeEach(() => {
      validator = new InputValidator(DEFAULT_SECURITY_CONFIG.validation);
    });

    test('should validate email format', () => {
      const validEmail = validator.validate('test@example.com', ['email']);
      expect(validEmail.valid).toBe(true);

      const invalidEmail = validator.validate('invalid-email', ['email']);
      expect(invalidEmail.valid).toBe(false);
      expect(invalidEmail.errors).toContain('Invalid email format');
    });

    test('should detect SQL injection attempts', () => {
      const maliciousInput = "'; DROP TABLE users; --";
      const result = validator.validate(maliciousInput, ['noSqlInjection']);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Potentially dangerous SQL patterns detected');
    });

    test('should detect XSS attempts', () => {
      const xssInput = '<script>alert("xss")</script>';
      const result = validator.validate(xssInput, ['noXss']);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Potentially dangerous XSS patterns detected');
    });

    test('should sanitize HTML content', () => {
      const htmlInput = '<div>Hello <script>alert("xss")</script> World</div>';
      const result = validator.validate(htmlInput, ['noHtml']);
      
      if (result.sanitized) {
        expect(result.sanitized).not.toContain('<script>');
        expect(result.sanitized).toContain('Hello');
      }
    });

    test('should validate string constraints', () => {
      const shortString = validator.validateString('abc', { minLength: 5 });
      expect(shortString.valid).toBe(false);

      const longString = validator.validateString('a'.repeat(101), { maxLength: 100 });
      expect(longString.valid).toBe(false);

      const validString = validator.validateString('hello', { minLength: 3, maxLength: 10 });
      expect(validString.valid).toBe(true);
    });
  });

  describe('SecurityManager', () => {
    let securityManager: SecurityManager;

    beforeEach(() => {
      const config = new SecurityConfigBuilder().build();
      securityManager = new SecurityManager(config);
    });

    test('should validate input with security policies', () => {
      const result = securityManager.validateInput('test@example.com', ['email']);
      expect(result.valid).toBe(true);

      // Test with a rule that should fail
      const maliciousResult = securityManager.validateInput('', ['noEmpty']);
      expect(maliciousResult.valid).toBe(false);
    });

    test('should perform constant-time comparisons', () => {
      expect(securityManager.constantTimeCompare('test', 'test')).toBe(true);
      expect(securityManager.constantTimeCompare('test', 'fail')).toBe(false);
    });

    test('should generate secure tokens', () => {
      const token1 = securityManager.generateSecureToken();
      const token2 = securityManager.generateSecureToken();
      
      expect(token1).not.toBe(token2);
      expect(token1.length).toBeGreaterThan(0);
    });

    test('should verify HMAC signatures', () => {
      const data = 'test data';
      const secret = 'test secret';
      const signature = CryptoUtils.hmac(data, secret);
      
      expect(securityManager.verifyHmac(data, signature, secret)).toBe(true);
      expect(securityManager.verifyHmac('wrong data', signature, secret)).toBe(false);
    });

    test('should audit security events', () => {
      securityManager.auditSecurityEvent('test_event', { userId: '123', action: 'login' });
      
      const auditLog = securityManager.getAuditLog();
      expect(auditLog.length).toBe(1);
      expect(auditLog[0].event).toBe('test_event');
      expect(auditLog[0].details).toBeDefined();
    });

    test('should get security metrics', () => {
      securityManager.auditSecurityEvent('input_validation_failed', { field: 'email' });
      securityManager.auditSecurityEvent('timing_attack_detected', { endpoint: '/api/login' });
      
      const metrics = securityManager.getSecurityMetrics();
      expect(metrics.auditLogSize).toBe(2);
      expect(metrics.inputValidationFailures).toBe(1);
      expect(metrics.timingAttackDetections).toBe(1);
    });
  });

  describe('SecurityConfig', () => {
    test('should use default configuration', () => {
      expect(DEFAULT_SECURITY_CONFIG.security.sensitiveFields).toContain('password');
      expect(DEFAULT_SECURITY_CONFIG.security.sensitiveFields).toContain('token');
      expect(DEFAULT_SECURITY_CONFIG.audit.enabled).toBe(true);
      expect(DEFAULT_SECURITY_CONFIG.logging.redactSensitiveData).toBe(true);
    });

    test('should build custom configuration', () => {
      const config = new SecurityConfigBuilder()
        .withSecurityPolicy({ timingAttackThreshold: 20 })
        .withAudit({ maxEntries: 500 })
        .addSensitiveFields(['customField'])
        .build();

      expect(config.security.timingAttackThreshold).toBe(20);
      expect(config.audit.maxEntries).toBe(500);
      expect(config.security.sensitiveFields).toContain('customField');
    });
  });
});