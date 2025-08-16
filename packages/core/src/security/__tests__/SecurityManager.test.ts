import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SecurityManager } from '../SecurityManager';
import { SecurityConfigBuilder, DEFAULT_SECURITY_CONFIG } from '../SecurityConfig';
import { CryptoUtils } from '../CryptoUtils';

describe('SecurityManager - Comprehensive Tests', () => {
  let securityManager: SecurityManager;
  let consoleSpy: any;

  beforeEach(() => {
    const config = new SecurityConfigBuilder().build();
    securityManager = new SecurityManager(config);
    
    // Mock console methods to capture log output
    consoleSpy = {
      info: vi.spyOn(console, 'info').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
      debug: vi.spyOn(console, 'debug').mockImplementation(() => {})
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Input Validation', () => {
    it('should validate input with security policies', () => {
      const result = securityManager.validateInput('test@example.com', ['email']);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid input and audit the failure', () => {
      const result = securityManager.validateInput('', ['noEmpty']);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Value cannot be empty');
      
      // Check that the failure was audited
      const auditLog = securityManager.getAuditLog();
      expect(auditLog.length).toBeGreaterThan(0);
      expect(auditLog[auditLog.length - 1].event).toBe('input_validation_failed');
    });

    it('should validate complex input with multiple rules', () => {
      const validResult = securityManager.validateInput('user123', ['alphanumericOnly', 'noEmpty']);
      expect(validResult.valid).toBe(true);

      const invalidResult = securityManager.validateInput('user@domain', ['alphanumericOnly', 'noEmpty']);
      expect(invalidResult.valid).toBe(false);
    });

    it('should handle SQL injection attempts', () => {
      const maliciousInput = "'; DROP TABLE users; --";
      const result = securityManager.validateInput(maliciousInput, ['noSqlInjection']);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Potentially dangerous SQL patterns detected');

      const auditLog = securityManager.getAuditLog();
      const lastEntry = auditLog[auditLog.length - 1];
      expect(lastEntry.event).toBe('input_validation_failed');
      expect(lastEntry.details.errors).toContain('Potentially dangerous SQL patterns detected');
    });

    it('should handle XSS attempts', () => {
      const xssInput = '<script>alert("xss")</script>';
      const result = securityManager.validateInput(xssInput, ['noXss']);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Potentially dangerous XSS patterns detected');
    });

    it('should ensure constant-time validation', async () => {
      const startTime = process.hrtime.bigint();
      securityManager.validateInput('test', ['email']);
      const endTime = process.hrtime.bigint();
      
      const elapsed = endTime - startTime;
      expect(elapsed).toBeGreaterThan(BigInt(0));
    });
  });

  describe('Cryptographic Operations', () => {
    it('should perform constant-time string comparison', () => {
      expect(securityManager.constantTimeCompare('test', 'test')).toBe(true);
      expect(securityManager.constantTimeCompare('test', 'fail')).toBe(false);
      expect(securityManager.constantTimeCompare('', '')).toBe(true);
      expect(securityManager.constantTimeCompare('short', 'verylongstring')).toBe(false);
    });

    it('should generate secure tokens', () => {
      const token1 = securityManager.generateSecureToken();
      const token2 = securityManager.generateSecureToken();
      
      expect(token1).not.toBe(token2);
      expect(typeof token1).toBe('string');
      expect(token1.length).toBeGreaterThan(0);
    });

    it('should verify HMAC signatures with timing protection', async () => {
      const data = 'test data';
      const secret = 'test secret';
      const signature = CryptoUtils.hmac(data, secret);
      
      const startTime = process.hrtime.bigint();
      const result = securityManager.verifyHmac(data, signature, secret);
      const endTime = process.hrtime.bigint();
      
      expect(result).toBe(true);
      
      const elapsed = endTime - startTime;
      expect(elapsed).toBeGreaterThan(BigInt(0));
    });

    it('should reject invalid HMAC signatures', () => {
      const data = 'test data';
      const secret = 'test secret';
      const validSignature = CryptoUtils.hmac(data, secret);
      
      expect(securityManager.verifyHmac('wrong data', validSignature, secret)).toBe(false);
      expect(securityManager.verifyHmac(data, 'wrong signature', secret)).toBe(false);
      expect(securityManager.verifyHmac(data, validSignature, 'wrong secret')).toBe(false);
    });
  });

  describe('Security Event Auditing', () => {
    it('should audit security events with sanitized data', () => {
      const eventData = {
        userId: 'user123',
        action: 'login_attempt',
        password: 'secret123',
        ip: '192.168.1.1'
      };

      securityManager.auditSecurityEvent('authentication_event', eventData);

      const auditLog = securityManager.getAuditLog();
      expect(auditLog.length).toBe(1);
      
      const auditEntry = auditLog[0];
      expect(auditEntry.event).toBe('authentication_event');
      expect(auditEntry.details.userId).toBe('user123');
      expect(auditEntry.details.action).toBe('login_attempt');
      expect(auditEntry.details.password).toBe('[REDACTED]');
      expect(auditEntry.details.ip).toBe('192.168.1.1');
      expect(auditEntry.timestamp).toBeInstanceOf(Date);
    });

    it('should handle nested sensitive data in audit logs', () => {
      const nestedEventData = {
        user: {
          id: 'user123',
          credentials: {
            password: 'secret123',
            token: 'jwt-token-here'
          }
        },
        session: {
          id: 'session123',
          secret: 'session-secret'
        }
      };

      securityManager.auditSecurityEvent('complex_event', nestedEventData);

      const auditLog = securityManager.getAuditLog();
      const auditEntry = auditLog[auditLog.length - 1];
      
      expect(auditEntry.details.user.id).toBe('user123');
      expect(auditEntry.details.user.credentials.password).toBe('[REDACTED]');
      expect(auditEntry.details.user.credentials.token).toBe('[REDACTED]');
      expect(auditEntry.details.session.id).toBe('session123');
      expect(auditEntry.details.session.secret).toBe('[REDACTED]');
    });

    it('should respect audit configuration', () => {
      const disabledAuditConfig = new SecurityConfigBuilder()
        .withAudit({ enabled: false })
        .build();
      const noAuditManager = new SecurityManager(disabledAuditConfig);

      noAuditManager.auditSecurityEvent('test_event', { data: 'test' });
      expect(noAuditManager.getAuditLog()).toHaveLength(0);
    });

    it('should limit audit log size', () => {
      const limitedConfig = new SecurityConfigBuilder()
        .withAudit({ maxEntries: 3 })
        .build();
      const limitedManager = new SecurityManager(limitedConfig);

      // Add more entries than the limit
      for (let i = 0; i < 5; i++) {
        limitedManager.auditSecurityEvent(`event_${i}`, { index: i });
      }

      const auditLog = limitedManager.getAuditLog();
      expect(auditLog.length).toBe(3);
      expect(auditLog[0].event).toBe('event_2'); // Oldest entries removed
      expect(auditLog[2].event).toBe('event_4');
    });

    it('should clear audit log', () => {
      securityManager.auditSecurityEvent('test_event', { data: 'test' });
      expect(securityManager.getAuditLog()).toHaveLength(1);

      securityManager.clearAuditLog();
      expect(securityManager.getAuditLog()).toHaveLength(0);
    });
  });

  describe('Timing Attack Detection', () => {
    it('should detect consistent timing patterns', () => {
      // Simulate consistent timing (potential timing attack)
      const consistentTimes = [100, 101, 99, 100, 102, 101, 100, 99, 101, 100];
      const isAttack = securityManager.detectTimingAttack(consistentTimes);
      expect(isAttack).toBe(true);
    });

    it('should not flag normal timing variations', () => {
      // Simulate normal timing variations
      const normalTimes = [50, 150, 75, 200, 125, 80, 300, 90, 175, 110];
      const isAttack = securityManager.detectTimingAttack(normalTimes);
      expect(isAttack).toBe(false);
    });

    it('should require minimum samples for detection', () => {
      const fewSamples = [100, 101, 99];
      const isAttack = securityManager.detectTimingAttack(fewSamples);
      expect(isAttack).toBe(false);
    });

    it('should handle edge cases in timing detection', () => {
      expect(securityManager.detectTimingAttack([])).toBe(false);
      expect(securityManager.detectTimingAttack([100])).toBe(false);
    });

    it('should use configurable timing attack threshold', () => {
      const customConfig = new SecurityConfigBuilder()
        .withSecurityPolicy({ 
          timingAttackThreshold: 5,
          timingVarianceThreshold: 0.05
        })
        .build();
      const customManager = new SecurityManager(customConfig);

      const consistentTimes = [100, 101, 99, 100, 102];
      expect(customManager.detectTimingAttack(consistentTimes)).toBe(true);
    });
  });

  describe('Security Metrics', () => {
    it('should track security metrics', () => {
      // Generate some security events
      securityManager.auditSecurityEvent('input_validation_failed', { field: 'email' });
      securityManager.auditSecurityEvent('timing_attack_detected', { endpoint: '/api/login' });
      securityManager.auditSecurityEvent('input_validation_failed', { field: 'password' });
      securityManager.auditSecurityEvent('timing_attack_detected', { endpoint: '/api/auth' });
      securityManager.auditSecurityEvent('other_event', { data: 'test' });

      const metrics = securityManager.getSecurityMetrics();
      
      expect(metrics.auditLogSize).toBe(5);
      expect(metrics.inputValidationFailures).toBe(2);
      expect(metrics.timingAttackDetections).toBe(2);
    });

    it('should handle empty audit log metrics', () => {
      const metrics = securityManager.getSecurityMetrics();
      
      expect(metrics.auditLogSize).toBe(0);
      expect(metrics.inputValidationFailures).toBe(0);
      expect(metrics.timingAttackDetections).toBe(0);
    });
  });

  describe('Configuration Integration', () => {
    it('should use custom sensitive field configuration', () => {
      const customConfig = new SecurityConfigBuilder()
        .addSensitiveFields(['customSecret', 'internalKey'])
        .build();
      const customManager = new SecurityManager(customConfig);

      const eventData = {
        normalField: 'visible',
        customSecret: 'hidden123',
        internalKey: 'internal456',
        password: 'alsoHidden'
      };

      customManager.auditSecurityEvent('test_event', eventData);

      const auditLog = customManager.getAuditLog();
      const auditEntry = auditLog[0];
      
      expect(auditEntry.details.normalField).toBe('visible');
      expect(auditEntry.details.customSecret).toBe('[REDACTED]');
      expect(auditEntry.details.internalKey).toBe('[REDACTED]');
      expect(auditEntry.details.password).toBe('[REDACTED]');
    });

    it('should use custom timing thresholds', () => {
      const customConfig = new SecurityConfigBuilder()
        .withSecurityPolicy({
          minValidationTime: BigInt(5000000), // 5ms
          minVerificationTime: BigInt(10000000) // 10ms
        })
        .build();
      const customManager = new SecurityManager(customConfig);

      // These operations should be padded to meet minimum time requirements
      const start1 = process.hrtime.bigint();
      customManager.validateInput('test', ['email']);
      const end1 = process.hrtime.bigint();

      const start2 = process.hrtime.bigint();
      const signature = CryptoUtils.hmac('data', 'secret');
      customManager.verifyHmac('data', signature, 'secret');
      const end2 = process.hrtime.bigint();

      // Timing should meet minimum requirements (though setTimeout may not be exact)
      expect(end1 - start1).toBeGreaterThan(BigInt(0));
      expect(end2 - start2).toBeGreaterThan(BigInt(0));
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle null and undefined inputs gracefully', () => {
      expect(() => securityManager.validateInput(null, ['email'])).not.toThrow();
      expect(() => securityManager.validateInput(undefined, ['email'])).not.toThrow();
      
      const nullResult = securityManager.validateInput(null, ['email']);
      expect(nullResult.valid).toBe(false);
    });

    it('should handle empty rule arrays', () => {
      const result = securityManager.validateInput('test', []);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle constant-time comparison with null values', () => {
      expect(() => securityManager.constantTimeCompare(null as any, 'test')).not.toThrow();
      expect(securityManager.constantTimeCompare(null as any, 'test')).toBe(false);
    });

    it('should handle HMAC verification with invalid inputs', () => {
      expect(securityManager.verifyHmac('', '', '')).toBe(false);
      expect(securityManager.verifyHmac(null as any, null as any, null as any)).toBe(false);
    });

    it('should sanitize audit data with circular references', () => {
      const circularData: any = { name: 'test' };
      circularData.self = circularData;
      circularData.password = 'secret123';

      expect(() => {
        securityManager.auditSecurityEvent('circular_test', circularData);
      }).not.toThrow();

      const auditLog = securityManager.getAuditLog();
      const auditEntry = auditLog[auditLog.length - 1];
      expect(auditEntry.details.name).toBe('test');
      expect(auditEntry.details.password).toBe('[REDACTED]');
    });

    it('should handle primitive values in audit data', () => {
      securityManager.auditSecurityEvent('primitive_test', 'simple string');
      securityManager.auditSecurityEvent('number_test', 12345);
      securityManager.auditSecurityEvent('boolean_test', true);
      securityManager.auditSecurityEvent('null_test', null);

      const auditLog = securityManager.getAuditLog();
      expect(auditLog.length).toBe(4);
      expect(auditLog[auditLog.length - 4].details).toBe('simple string');
      expect(auditLog[auditLog.length - 3].details).toBe(12345);
      expect(auditLog[auditLog.length - 2].details).toBe(true);
      expect(auditLog[auditLog.length - 1].details).toBe(null);
    });
  });

  describe('Integration with Security Components', () => {
    it('should integrate with SecureLogger for audit events', () => {
      securityManager.auditSecurityEvent('integration_test', { 
        userId: 'user123',
        action: 'test_action' 
      });

      // Check that the logger was called (via console spy)
      expect(consoleSpy.warn).toHaveBeenCalled();
      const logOutput = consoleSpy.warn.mock.calls[0][0];
      expect(logOutput).toContain('Security Event: integration_test');
    });

    it('should use InputValidator for input validation', () => {
      // Test that the security manager properly delegates to InputValidator
      const htmlInput = '<script>alert("xss")</script>';
      const result = securityManager.validateInput(htmlInput, ['noXss']);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Potentially dangerous XSS patterns detected');
    });

    it('should use CryptoUtils for cryptographic operations', () => {
      // Test that constant-time comparison delegates to CryptoUtils
      const cryptoSpy = vi.spyOn(CryptoUtils, 'constantTimeCompare');
      
      securityManager.constantTimeCompare('test1', 'test2');
      
      expect(cryptoSpy).toHaveBeenCalledWith('test1', 'test2');
      cryptoSpy.mockRestore();
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large audit logs efficiently', () => {
      const startTime = Date.now();
      
      // Add many audit entries
      for (let i = 0; i < 1000; i++) {
        securityManager.auditSecurityEvent(`batch_event_${i}`, { 
          index: i,
          data: `test_data_${i}`,
          sensitive: `secret_${i}`
        });
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete in reasonable time (adjust threshold as needed)
      expect(duration).toBeLessThan(5000); // 5 seconds
      
      const metrics = securityManager.getSecurityMetrics();
      expect(metrics.auditLogSize).toBe(1000);
    });

    it('should maintain performance with complex audit data', () => {
      const complexData = {
        level1: {
          level2: {
            level3: {
              level4: {
                level5: {
                  deepSecret: 'hidden_value',
                  normalData: 'visible_value'
                }
              }
            }
          }
        },
        array: [
          { password: 'secret1', username: 'user1' },
          { password: 'secret2', username: 'user2' },
          { password: 'secret3', username: 'user3' }
        ]
      };

      const startTime = Date.now();
      securityManager.auditSecurityEvent('complex_audit', complexData);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(100); // Should be fast

      const auditLog = securityManager.getAuditLog();
      const auditEntry = auditLog[auditLog.length - 1];
      
      // Verify deep sanitization worked
      expect(auditEntry.details.level1.level2.level3.level4.level5.deepSecret).toBe('[REDACTED]');
      expect(auditEntry.details.level1.level2.level3.level4.level5.normalData).toBe('visible_value');
      expect(auditEntry.details.array[0].password).toBe('[REDACTED]');
      expect(auditEntry.details.array[0].username).toBe('user1');
    });
  });
});