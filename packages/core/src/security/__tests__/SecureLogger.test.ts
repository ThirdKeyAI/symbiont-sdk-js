import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SecureLogger, LogLevel } from '../SecureLogger';
import { DEFAULT_SECURITY_CONFIG } from '../SecurityConfig';

describe('SecureLogger - Comprehensive Tests', () => {
  let logger: SecureLogger;
  let consoleSpy: { [key: string]: any };

  beforeEach(() => {
    // Use debug level config to allow all log levels
    const debugConfig = {
      ...DEFAULT_SECURITY_CONFIG.logging,
      level: 'debug' as const
    };
    logger = new SecureLogger(debugConfig);
    
    // Setup console spies
    consoleSpy = {
      debug: vi.spyOn(console, 'debug').mockImplementation(() => {}),
      info: vi.spyOn(console, 'info').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {})
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Basic Logging', () => {
    it('should log debug messages', () => {
      logger.debug('Debug message', { test: 'data' });

      expect(consoleSpy.debug).toHaveBeenCalled();
      const logOutput = consoleSpy.debug.mock.calls[0][0];
      expect(logOutput).toContain('DEBUG: Debug message');
    });

    it('should log info messages', () => {
      logger.info('Info message', { test: 'data' });

      expect(consoleSpy.info).toHaveBeenCalled();
      const logOutput = consoleSpy.info.mock.calls[0][0];
      expect(logOutput).toContain('INFO: Info message');
    });

    it('should log warning messages', () => {
      logger.warn('Warning message', { test: 'data' });

      expect(consoleSpy.warn).toHaveBeenCalled();
      const logOutput = consoleSpy.warn.mock.calls[0][0];
      expect(logOutput).toContain('WARN: Warning message');
    });

    it('should log error messages', () => {
      logger.error('Error message', { test: 'data' });

      expect(consoleSpy.error).toHaveBeenCalled();
      const logOutput = consoleSpy.error.mock.calls[0][0];
      expect(logOutput).toContain('ERROR: Error message');
    });

    it('should respect log level configuration', () => {
      const errorOnlyConfig = {
        ...DEFAULT_SECURITY_CONFIG.logging,
        level: 'error' as const
      };
      const errorLogger = new SecureLogger(errorOnlyConfig);

      errorLogger.debug('Debug message');
      errorLogger.info('Info message');
      errorLogger.warn('Warning message');
      errorLogger.error('Error message');

      expect(consoleSpy.debug).not.toHaveBeenCalled();
      expect(consoleSpy.info).not.toHaveBeenCalled();
      expect(consoleSpy.warn).not.toHaveBeenCalled();
      expect(consoleSpy.error).toHaveBeenCalled();
    });
  });

  describe('Data Sanitization', () => {
    it('should redact sensitive fields from objects', () => {
      const sensitiveData = {
        username: 'testuser',
        password: 'secret123',
        token: 'jwt-token-here',
        email: 'test@example.com',
        normalField: 'visible data'
      };

      logger.info('Test log', sensitiveData);

      const logOutput = consoleSpy.info.mock.calls[0][0];
      expect(logOutput).toContain('[REDACTED');
      expect(logOutput).not.toContain('secret123');
      expect(logOutput).not.toContain('jwt-token-here');
      expect(logOutput).toContain('visible data');
    });

    it('should redact sensitive patterns in messages', () => {
      const messageWithJWT = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

      logger.warn(messageWithJWT);

      const logOutput = consoleSpy.warn.mock.calls[0][0];
      expect(logOutput).toContain('[REDACTED]');
      expect(logOutput).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
    });

    it('should redact API keys in messages', () => {
      const messageWithApiKey = 'Using API key: sk-1234567890abcdef1234567890abcdef';

      logger.info(messageWithApiKey);

      const logOutput = consoleSpy.info.mock.calls[0][0];
      expect(logOutput).toContain('[REDACTED]');
      expect(logOutput).not.toContain('sk-1234567890abcdef1234567890abcdef');
    });

    it('should redact passwords in URLs', () => {
      const messageWithPassword = 'Connecting to https://user:secret@example.com/db?password=mysecret';

      logger.info(messageWithPassword);

      const logOutput = consoleSpy.info.mock.calls[0][0];
      expect(logOutput).toContain('[REDACTED]');
      expect(logOutput).not.toContain('secret');
      expect(logOutput).not.toContain('mysecret');
    });

    it('should redact credit card numbers', () => {
      const messageWithCC = 'Payment with card 4111-1111-1111-1111';

      logger.info(messageWithCC);

      const logOutput = consoleSpy.info.mock.calls[0][0];
      expect(logOutput).toContain('[REDACTED]');
      expect(logOutput).not.toContain('4111-1111-1111-1111');
    });

    it('should partially redact email addresses', () => {
      const messageWithEmail = 'User email: user@example.com';

      logger.info(messageWithEmail);

      const logOutput = consoleSpy.info.mock.calls[0][0];
      expect(logOutput).toContain('[REDACTED]');
      expect(logOutput).not.toContain('user@example.com');
    });

    it('should detect and redact sensitive-looking strings', () => {
      const sensitiveData = {
        normalField: 'regular data',
        suspiciousField: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.signature',
        hexString: 'deadbeefcafebabe1234567890abcdef1234567890abcdef',
        base64String: 'VGhpcyBpcyBhIGJhc2U2NCBzdHJpbmcgdGhhdCBtaWdodCBiZSBzZW5zaXRpdmU='
      };

      logger.info('Test log', sensitiveData);

      const logOutput = consoleSpy.info.mock.calls[0][0];
      expect(logOutput).toContain('regular data');
      expect(logOutput).toContain('[REDACTED');
      expect(logOutput).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
      expect(logOutput).not.toContain('deadbeefcafebabe');
    });
  });

  describe('Nested Object Sanitization', () => {
    it('should sanitize nested objects recursively', () => {
      const nestedData = {
        user: {
          name: 'John Doe',
          credentials: {
            password: 'secret123',
            apiKey: 'sk-abcdef1234567890'
          }
        },
        metadata: {
          session: {
            token: 'jwt-token-here'
          }
        }
      };

      logger.info('Nested data', nestedData);

      const logOutput = consoleSpy.info.mock.calls[0][0];
      expect(logOutput).toContain('John Doe');
      expect(logOutput).toContain('[REDACTED');
      expect(logOutput).not.toContain('secret123');
      expect(logOutput).not.toContain('sk-abcdef1234567890');
      expect(logOutput).not.toContain('jwt-token-here');
    });

    it('should sanitize arrays of objects', () => {
      const arrayData = [
        { name: 'User1', password: 'secret1' },
        { name: 'User2', token: 'token123' }
      ];

      logger.info('Array data', arrayData);

      const logOutput = consoleSpy.info.mock.calls[0][0];
      expect(logOutput).toContain('User1');
      expect(logOutput).toContain('User2');
      expect(logOutput).toContain('[REDACTED');
      expect(logOutput).not.toContain('secret1');
      expect(logOutput).not.toContain('token123');
    });
  });

  describe('Special Logging Methods', () => {
    it('should log security events with sanitization', () => {
      const eventData = {
        userId: 'user123',
        action: 'login_attempt',
        password: 'secret123',
        timestamp: new Date().toISOString()
      };

      logger.logSecurityEvent('authentication_failure', eventData);

      expect(consoleSpy.warn).toHaveBeenCalled();
      const logOutput = consoleSpy.warn.mock.calls[0][0];
      expect(logOutput).toContain('Security Event: authentication_failure');
      expect(logOutput).toContain('user123');
      expect(logOutput).toContain('login_attempt');
      expect(logOutput).not.toContain('secret123');
    });

    it('should log authentication events with user ID hashing', () => {
      logger.logAuthEvent('login', 'user123', true, { ip: '192.168.1.1' });

      expect(consoleSpy.info).toHaveBeenCalled();
      const logOutput = consoleSpy.info.mock.calls[0][0];
      expect(logOutput).toContain('Auth Event: login');
      expect(logOutput).toContain('[HASH:');
      expect(logOutput).not.toContain('user123');
    });

    it('should log failed authentication events as warnings', () => {
      logger.logAuthEvent('login_failed', 'user123', false, { reason: 'invalid_password' });

      expect(consoleSpy.warn).toHaveBeenCalled();
      const logOutput = consoleSpy.warn.mock.calls[0][0];
      expect(logOutput).toContain('Auth Event: login_failed');
    });

    it('should log API calls with URL sanitization', () => {
      const url = 'https://api.example.com/users?token=secret123&key=apikey456';

      logger.logApiCall('GET', url, 200, 150);

      expect(consoleSpy.info).toHaveBeenCalled();
      const logOutput = consoleSpy.info.mock.calls[0][0];
      expect(logOutput).toContain('API Call: GET');
      expect(logOutput).toContain('[REDACTED]');
      expect(logOutput).not.toContain('secret123');
      expect(logOutput).not.toContain('apikey456');
    });

    it('should log API errors appropriately', () => {
      logger.logApiCall('POST', '/api/users', 500, 1000, 'Internal server error');

      expect(consoleSpy.error).toHaveBeenCalled();
      const logOutput = consoleSpy.error.mock.calls[0][0];
      expect(logOutput).toContain('"statusCode": 500');
    });
  });

  describe('Log Buffer Management', () => {
    it('should store logs in buffer', () => {
      logger.info('Test message 1');
      logger.error('Test message 2');

      const recentLogs = logger.getRecentLogs(10);
      expect(recentLogs.length).toBe(2);
      expect(recentLogs[0].message).toContain('Test message 1');
      expect(recentLogs[1].message).toContain('Test message 2');
    });

    it('should limit buffer size', () => {
      // Fill buffer beyond max size
      for (let i = 0; i < 1100; i++) {
        logger.info(`Message ${i}`);
      }

      const recentLogs = logger.getRecentLogs(2000);
      expect(recentLogs.length).toBeLessThanOrEqual(1000);
    });

    it('should clear buffer', () => {
      logger.info('Test message');
      expect(logger.getRecentLogs().length).toBe(1);

      logger.clearBuffer();
      expect(logger.getRecentLogs().length).toBe(0);
    });

    it('should return limited number of recent logs', () => {
      for (let i = 0; i < 10; i++) {
        logger.info(`Message ${i}`);
      }

      const recentLogs = logger.getRecentLogs(5);
      expect(recentLogs.length).toBe(5);
      expect(recentLogs[0].message).toContain('Message 5');
      expect(recentLogs[4].message).toContain('Message 9');
    });
  });

  describe('Log Statistics', () => {
    it('should track log statistics by level', () => {
      logger.debug('Debug message');
      logger.info('Info message 1');
      logger.info('Info message 2');
      logger.warn('Warning message');
      logger.error('Error message 1');
      logger.error('Error message 2');
      logger.error('Error message 3');

      const stats = logger.getLogStats();
      expect(stats.totalEntries).toBe(7);
      expect(stats.debugCount).toBe(1);
      expect(stats.infoCount).toBe(2);
      expect(stats.warnCount).toBe(1);
      expect(stats.errorCount).toBe(3);
    });

    it('should handle empty log buffer', () => {
      const stats = logger.getLogStats();
      expect(stats.totalEntries).toBe(0);
      expect(stats.debugCount).toBe(0);
      expect(stats.infoCount).toBe(0);
      expect(stats.warnCount).toBe(0);
      expect(stats.errorCount).toBe(0);
    });
  });

  describe('Configuration-based Behavior', () => {
    it('should respect redactSensitiveData setting', () => {
      const noRedactionConfig = {
        ...DEFAULT_SECURITY_CONFIG.logging,
        redactSensitiveData: false
      };
      const noRedactionLogger = new SecureLogger(noRedactionConfig);
      const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

      noRedactionLogger.info('Password: secret123');

      const logOutput = consoleSpy.mock.calls[0][0];
      expect(logOutput).toContain('secret123');
      expect(logOutput).not.toContain('[REDACTED]');

      consoleSpy.mockRestore();
    });

    it('should respect maxLogLength setting', () => {
      const shortLogConfig = {
        ...DEFAULT_SECURITY_CONFIG.logging,
        maxLogLength: 50
      };
      const shortLogger = new SecureLogger(shortLogConfig);
      const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

      // Create data that will be long when JSON stringified but not trigger redaction
      const longData = {
        field1: 'This is a very long string that will make the JSON exceed maxLogLength',
        field2: 'Another long string to ensure JSON length exceeds the limit',
        field3: 'More content to pad the JSON',
        field4: 'Even more content',
        field5: 'Additional padding content'
      };
      shortLogger.info('Test message', longData);

      const logOutput = consoleSpy.mock.calls[0][0];
      expect(logOutput).toContain('[TRUNCATED');

      consoleSpy.mockRestore();
    });

    it('should handle invalid JSON in data gracefully', () => {
      const circularObj: any = { name: 'test' };
      circularObj.self = circularObj;

      logger.info('Circular reference test', circularObj);

      const logOutput = consoleSpy.info.mock.calls[0][0];
      // Circular references are handled gracefully with [CIRCULAR] substitution
      expect(logOutput).toContain('[CIRCULAR]');
    });
  });

  describe('URL Sanitization', () => {
    it('should sanitize sensitive query parameters', () => {
      const urls = [
        'https://api.example.com/data?token=secret123',
        'https://example.com/login?key=apikey456',
        'https://service.com/auth?secret=mysecret&password=pass123'
      ];

      urls.forEach((url, index) => {
        logger.info(`Request ${index}`, { url });
        
        const logOutput = consoleSpy.info.mock.calls[index][0];
        expect(logOutput).toContain('[REDACTED]');
        expect(logOutput).not.toContain('secret123');
        expect(logOutput).not.toContain('apikey456');
        expect(logOutput).not.toContain('mysecret');
        expect(logOutput).not.toContain('pass123');
      });
    });

    it('should handle malformed URLs gracefully', () => {
      const malformedUrl = 'not-a-valid-url-with-password=secret';

      logger.info('Malformed URL test', { url: malformedUrl });

      const logOutput = consoleSpy.info.mock.calls[0][0];
      // The URL sanitization should handle this malformed URL
      expect(logOutput).toContain('password=[REDACTED]');
    });
  });

  describe('Error Message Sanitization', () => {
    it('should sanitize file paths in error messages', () => {
      const errorMessage = 'Error reading file /home/user/secrets/config.json: permission denied';

      logger.logApiCall('GET', '/api/config', 500, 100, errorMessage);

      const logOutput = consoleSpy.error.mock.calls[0][0];
      expect(logOutput).toContain('[PATH]');
      expect(logOutput).not.toContain('/home/user/secrets/config.json');
    });

    it('should truncate stack traces', () => {
      const errorWithStack = `Error: Something went wrong
        at Object.method (/path/to/file.js:123:45)
        at another.method (/path/to/another.js:67:89)
        at process.nextTick (/path/to/system.js:12:34)`;

      logger.logApiCall('POST', '/api/action', 500, 200, errorWithStack);

      const logOutput = consoleSpy.error.mock.calls[0][0];
      expect(logOutput).not.toContain('at Object.method');
      expect(logOutput).not.toContain('at another.method');
    });
  });

  describe('Value Redaction Strategies', () => {
    it('should provide metadata for redacted string values', () => {
      const data = {
        shortPassword: 'abc',
        longPassword: 'this-is-a-very-long-password-string',
        emptySecret: '',
        token: 'jwt-token-here'
      };

      logger.info('Password test', data);

      const logOutput = consoleSpy.info.mock.calls[0][0];
      expect(logOutput).toContain('[REDACTED]');
      expect(logOutput).toContain('[EMPTY]');
      expect(logOutput).toMatch(/\[REDACTED:\d+chars\]/);
    });

    it('should hash user IDs for correlation', () => {
      logger.logAuthEvent('login', 'user123', true);
      logger.logAuthEvent('logout', 'user123', true);

      const log1 = consoleSpy.info.mock.calls[0][0];
      const log2 = consoleSpy.info.mock.calls[1][0];

      // Extract hash from both logs
      const hashRegex = /\[HASH:([^\]]+)\]/;
      const hash1 = log1.match(hashRegex)?.[1];
      const hash2 = log2.match(hashRegex)?.[1];

      expect(hash1).toBeDefined();
      expect(hash2).toBeDefined();
      expect(hash1).toBe(hash2); // Same user should have same hash
    });

    it('should handle empty user ID gracefully', () => {
      logger.logAuthEvent('login', '', true);

      const logOutput = consoleSpy.info.mock.calls[0][0];
      expect(logOutput).toContain('[EMPTY]');
    });
  });
});