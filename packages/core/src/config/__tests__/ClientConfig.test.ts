import { describe, it, expect } from 'vitest';
import { 
  ClientConfigSchema, 
  RetryConfigSchema, 
  CacheConfigSchema, 
  defaultClientConfig 
} from '../ClientConfig';
import { z } from 'zod';

describe('ClientConfig', () => {
  describe('RetryConfigSchema', () => {
    it('should validate valid retry configuration', () => {
      const validConfig = {
        maxRetries: 3,
        initialDelayMs: 1000,
        maxDelayMs: 30000,
        backoffMultiplier: 2
      };

      const result = RetryConfigSchema.parse(validConfig);
      expect(result).toEqual(validConfig);
    });

    it('should apply default values', () => {
      const result = RetryConfigSchema.parse({});
      
      expect(result).toEqual({
        maxRetries: 3,
        initialDelayMs: 1000,
        maxDelayMs: 30000,
        backoffMultiplier: 2
      });
    });

    it('should reject negative maxRetries', () => {
      expect(() => {
        RetryConfigSchema.parse({ maxRetries: -1 });
      }).toThrow();
    });

    it('should reject negative delays', () => {
      expect(() => {
        RetryConfigSchema.parse({ initialDelayMs: -500 });
      }).toThrow();

      expect(() => {
        RetryConfigSchema.parse({ maxDelayMs: -1000 });
      }).toThrow();
    });

    it('should reject backoff multiplier less than 1', () => {
      expect(() => {
        RetryConfigSchema.parse({ backoffMultiplier: 0.5 });
      }).toThrow();
    });

    it('should accept zero delays', () => {
      const config = {
        maxRetries: 0,
        initialDelayMs: 0,
        maxDelayMs: 0,
        backoffMultiplier: 1
      };

      const result = RetryConfigSchema.parse(config);
      expect(result).toEqual(config);
    });

    it('should handle partial configurations', () => {
      const partial = { maxRetries: 5 };
      const result = RetryConfigSchema.parse(partial);
      
      expect(result.maxRetries).toBe(5);
      expect(result.initialDelayMs).toBe(1000); // Default
      expect(result.maxDelayMs).toBe(30000); // Default
      expect(result.backoffMultiplier).toBe(2); // Default
    });
  });

  describe('CacheConfigSchema', () => {
    it('should validate valid cache configuration', () => {
      const validConfig = {
        enabled: true,
        defaultTtlMs: 300000,
        maxSize: 1000
      };

      const result = CacheConfigSchema.parse(validConfig);
      expect(result).toEqual(validConfig);
    });

    it('should apply default values', () => {
      const result = CacheConfigSchema.parse({});
      
      expect(result).toEqual({
        enabled: true,
        defaultTtlMs: 300000,
        maxSize: 1000
      });
    });

    it('should reject negative TTL', () => {
      expect(() => {
        CacheConfigSchema.parse({ defaultTtlMs: -1000 });
      }).toThrow();
    });

    it('should reject negative max size', () => {
      expect(() => {
        CacheConfigSchema.parse({ maxSize: -100 });
      }).toThrow();
    });

    it('should accept zero values', () => {
      const config = {
        enabled: false,
        defaultTtlMs: 0,
        maxSize: 0
      };

      const result = CacheConfigSchema.parse(config);
      expect(result).toEqual(config);
    });

    it('should handle boolean enabled field', () => {
      expect(CacheConfigSchema.parse({ enabled: true }).enabled).toBe(true);
      expect(CacheConfigSchema.parse({ enabled: false }).enabled).toBe(false);
    });

    it('should handle partial configurations', () => {
      const partial = { enabled: false };
      const result = CacheConfigSchema.parse(partial);
      
      expect(result.enabled).toBe(false);
      expect(result.defaultTtlMs).toBe(300000); // Default
      expect(result.maxSize).toBe(1000); // Default
    });
  });

  describe('ClientConfigSchema', () => {
    it('should validate complete valid configuration', () => {
      const validConfig = {
        runtimeApiUrl: 'https://api.example.com',
        toolReviewApiUrl: 'https://review.example.com',
        timeout: 30000,
        retryConfig: {
          maxRetries: 3,
          initialDelayMs: 1000,
          maxDelayMs: 30000,
          backoffMultiplier: 2
        },
        cacheConfig: {
          enabled: true,
          defaultTtlMs: 300000,
          maxSize: 1000
        },
        userAgent: 'SymbiontSDK/1.0',
        maxConcurrentRequests: 10,
        requestInterceptors: [],
        responseInterceptors: []
      };

      const result = ClientConfigSchema.parse(validConfig);
      expect(result).toEqual(validConfig);
    });

    it('should apply default values for optional fields', () => {
      const result = ClientConfigSchema.parse({});
      
      expect(result.timeout).toBe(30000);
      expect(result.maxConcurrentRequests).toBe(10);
      expect(result.requestInterceptors).toEqual([]);
      expect(result.responseInterceptors).toEqual([]);
    });

    it('should validate URL fields', () => {
      const validUrls = [
        'https://api.example.com',
        'http://localhost:3000',
        'https://api.example.com:8080/path'
      ];

      validUrls.forEach(url => {
        expect(() => {
          ClientConfigSchema.parse({ runtimeApiUrl: url });
        }).not.toThrow();

        expect(() => {
          ClientConfigSchema.parse({ toolReviewApiUrl: url });
        }).not.toThrow();
      });
    });

    it('should reject invalid URLs', () => {
      const invalidUrls = [
        'not-a-url',
        'ftp://invalid-protocol.com',
        'relative/path',
        ''
      ];

      invalidUrls.forEach(url => {
        expect(() => {
          ClientConfigSchema.parse({ runtimeApiUrl: url });
        }).toThrow();

        expect(() => {
          ClientConfigSchema.parse({ toolReviewApiUrl: url });
        }).toThrow();
      });
    });

    it('should reject negative timeout', () => {
      expect(() => {
        ClientConfigSchema.parse({ timeout: -1000 });
      }).toThrow();
    });

    it('should accept zero timeout', () => {
      const result = ClientConfigSchema.parse({ timeout: 0 });
      expect(result.timeout).toBe(0);
    });

    it('should reject invalid maxConcurrentRequests', () => {
      expect(() => {
        ClientConfigSchema.parse({ maxConcurrentRequests: 0 });
      }).toThrow();

      expect(() => {
        ClientConfigSchema.parse({ maxConcurrentRequests: -5 });
      }).toThrow();
    });

    it('should accept minimum valid maxConcurrentRequests', () => {
      const result = ClientConfigSchema.parse({ maxConcurrentRequests: 1 });
      expect(result.maxConcurrentRequests).toBe(1);
    });

    it('should handle nested configurations', () => {
      const config = {
        retryConfig: {
          maxRetries: 5,
          initialDelayMs: 2000
        },
        cacheConfig: {
          enabled: false,
          maxSize: 500
        }
      };

      const result = ClientConfigSchema.parse(config);
      
      expect(result.retryConfig).toEqual({
        maxRetries: 5,
        initialDelayMs: 2000,
        maxDelayMs: 30000, // Default
        backoffMultiplier: 2 // Default
      });

      expect(result.cacheConfig).toEqual({
        enabled: false,
        defaultTtlMs: 300000, // Default
        maxSize: 500
      });
    });

    it('should handle optional nested configurations', () => {
      const result = ClientConfigSchema.parse({
        timeout: 15000
      });

      expect(result.timeout).toBe(15000);
      expect(result.retryConfig).toBeUndefined();
      expect(result.cacheConfig).toBeUndefined();
    });

    it('should preserve interceptor arrays', () => {
      const mockInterceptor = () => {};
      const config = {
        requestInterceptors: [mockInterceptor],
        responseInterceptors: [mockInterceptor, mockInterceptor]
      };

      const result = ClientConfigSchema.parse(config);
      
      expect(result.requestInterceptors).toHaveLength(1);
      expect(result.responseInterceptors).toHaveLength(2);
    });

    it('should handle string user agent', () => {
      const userAgent = 'CustomAgent/2.0 (Platform; Version)';
      const result = ClientConfigSchema.parse({ userAgent });
      
      expect(result.userAgent).toBe(userAgent);
    });

    it('should handle undefined optional fields', () => {
      const result = ClientConfigSchema.parse({
        timeout: 20000
      });

      expect(result.runtimeApiUrl).toBeUndefined();
      expect(result.toolReviewApiUrl).toBeUndefined();
      expect(result.userAgent).toBeUndefined();
      expect(result.retryConfig).toBeUndefined();
      expect(result.cacheConfig).toBeUndefined();
    });
  });

  describe('defaultClientConfig', () => {
    it('should provide sensible defaults', () => {
      expect(defaultClientConfig).toEqual({
        timeout: 30000,
        retryConfig: {
          maxRetries: 3,
          initialDelayMs: 1000,
          maxDelayMs: 30000,
          backoffMultiplier: 2,
        },
        cacheConfig: {
          enabled: true,
          defaultTtlMs: 300000,
          maxSize: 1000,
        },
        maxConcurrentRequests: 10,
        requestInterceptors: [],
        responseInterceptors: [],
      });
    });

    it('should be valid according to schema', () => {
      expect(() => {
        ClientConfigSchema.parse(defaultClientConfig);
      }).not.toThrow();
    });

    it('should provide working retry configuration', () => {
      expect(defaultClientConfig.retryConfig?.maxRetries).toBeGreaterThan(0);
      expect(defaultClientConfig.retryConfig?.initialDelayMs).toBeGreaterThanOrEqual(0);
      expect(defaultClientConfig.retryConfig?.maxDelayMs).toBeGreaterThanOrEqual(
        defaultClientConfig.retryConfig?.initialDelayMs || 0
      );
      expect(defaultClientConfig.retryConfig?.backoffMultiplier).toBeGreaterThanOrEqual(1);
    });

    it('should provide working cache configuration', () => {
      expect(typeof defaultClientConfig.cacheConfig?.enabled).toBe('boolean');
      expect(defaultClientConfig.cacheConfig?.defaultTtlMs).toBeGreaterThan(0);
      expect(defaultClientConfig.cacheConfig?.maxSize).toBeGreaterThan(0);
    });

    it('should provide reasonable timeout', () => {
      expect(defaultClientConfig.timeout).toBeGreaterThan(0);
      expect(defaultClientConfig.timeout).toBeLessThanOrEqual(60000); // Not too long
    });

    it('should provide reasonable concurrency limit', () => {
      expect(defaultClientConfig.maxConcurrentRequests).toBeGreaterThan(0);
      expect(defaultClientConfig.maxConcurrentRequests).toBeLessThanOrEqual(100); // Not too high
    });

    it('should provide empty interceptor arrays', () => {
      expect(Array.isArray(defaultClientConfig.requestInterceptors)).toBe(true);
      expect(Array.isArray(defaultClientConfig.responseInterceptors)).toBe(true);
      expect(defaultClientConfig.requestInterceptors).toHaveLength(0);
      expect(defaultClientConfig.responseInterceptors).toHaveLength(0);
    });
  });

  describe('Type Safety', () => {
    it('should enforce type safety at compile time', () => {
      // These tests mainly ensure TypeScript compilation
      const config: z.infer<typeof ClientConfigSchema> = {
        timeout: 30000,
        maxConcurrentRequests: 5,
        requestInterceptors: [],
        responseInterceptors: []
      };

      expect(config.timeout).toBe(30000);
      expect(config.maxConcurrentRequests).toBe(5);
    });

    it('should infer correct types for retry config', () => {
      const retryConfig: z.infer<typeof RetryConfigSchema> = {
        maxRetries: 3,
        initialDelayMs: 1000,
        maxDelayMs: 30000,
        backoffMultiplier: 2
      };

      expect(typeof retryConfig.maxRetries).toBe('number');
      expect(typeof retryConfig.initialDelayMs).toBe('number');
      expect(typeof retryConfig.maxDelayMs).toBe('number');
      expect(typeof retryConfig.backoffMultiplier).toBe('number');
    });

    it('should infer correct types for cache config', () => {
      const cacheConfig: z.infer<typeof CacheConfigSchema> = {
        enabled: true,
        defaultTtlMs: 300000,
        maxSize: 1000
      };

      expect(typeof cacheConfig.enabled).toBe('boolean');
      expect(typeof cacheConfig.defaultTtlMs).toBe('number');
      expect(typeof cacheConfig.maxSize).toBe('number');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large numbers', () => {
      const config = {
        timeout: Number.MAX_SAFE_INTEGER,
        maxConcurrentRequests: 1000000
      };

      expect(() => {
        ClientConfigSchema.parse(config);
      }).not.toThrow();
    });

    it('should handle floating point numbers for timing', () => {
      const retryConfig = {
        maxRetries: 3,
        initialDelayMs: 1500.5,
        maxDelayMs: 30000.75,
        backoffMultiplier: 1.5
      };

      const result = RetryConfigSchema.parse(retryConfig);
      expect(result.initialDelayMs).toBe(1500.5);
      expect(result.maxDelayMs).toBe(30000.75);
      expect(result.backoffMultiplier).toBe(1.5);
    });

    it('should handle empty interceptor arrays', () => {
      const config = {
        requestInterceptors: [],
        responseInterceptors: []
      };

      const result = ClientConfigSchema.parse(config);
      expect(result.requestInterceptors).toEqual([]);
      expect(result.responseInterceptors).toEqual([]);
    });

    it('should handle complex URL patterns', () => {
      const complexUrls = [
        'https://api-v2.example.com:8443/graphql',
        'http://192.168.1.100:3000/api/v1',
        'https://subdomain.example.co.uk/path/to/api'
      ];

      complexUrls.forEach(url => {
        expect(() => {
          ClientConfigSchema.parse({ runtimeApiUrl: url });
        }).not.toThrow();
      });
    });
  });
});