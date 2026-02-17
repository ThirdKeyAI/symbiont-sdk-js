import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EnvironmentVariableProvider } from '../../providers/EnvironmentVariableProvider';
import { EnvironmentVariableProviderConfig } from '@symbi/types';

describe('EnvironmentVariableProvider', () => {
  let provider: EnvironmentVariableProvider;
  let config: EnvironmentVariableProviderConfig;

  beforeEach(() => {
    config = {
      name: 'environment',
      priority: 100,
      prefix: 'TEST_'
    };
    
    provider = new EnvironmentVariableProvider(config);
  });

  afterEach(() => {
    // Clean up test environment variables
    Object.keys(process.env).forEach(key => {
      if (key.startsWith('TEST_')) {
        delete process.env[key];
      }
    });
  });

  describe('constructor', () => {
    it('should initialize with config', () => {
      expect(provider.name).toBe('environment');
      expect(provider.priority).toBe(100);
    });

    it('should work without prefix', () => {
      const configWithoutPrefix = {
        name: 'environment' as const,
        priority: 100
      };
      
      const providerWithoutPrefix = new EnvironmentVariableProvider(configWithoutPrefix);
      expect(providerWithoutPrefix.name).toBe('environment');
    });
  });

  describe('isAvailable', () => {
    it('should always return true for environment provider', async () => {
      const available = await provider.isAvailable();
      expect(available).toBe(true);
    });
  });

  describe('getSecret', () => {
    it('should resolve secret with prefix', async () => {
      process.env.TEST_API_KEY = 'test-api-value';
      
      const result = await provider.getSecret('API_KEY');
      
      expect(result.found).toBe(true);
      expect(result.value).toBe('test-api-value');
      expect(result.source).toBe('environment');
    });

    it('should resolve secret without prefix when prefix not configured', async () => {
      const configNoPrefix = {
        name: 'environment' as const,
        priority: 100
      };
      
      const providerNoPrefix = new EnvironmentVariableProvider(configNoPrefix);
      process.env.DIRECT_KEY = 'direct-value';
      
      const result = await providerNoPrefix.getSecret('DIRECT_KEY');
      
      expect(result.found).toBe(true);
      expect(result.value).toBe('direct-value');
      expect(result.source).toBe('environment');
    });

    it('should return not found for non-existent secrets', async () => {
      const result = await provider.getSecret('NON_EXISTENT_KEY');
      
      expect(result.found).toBe(false);
      expect(result.value).toBe('');
      expect(result.source).toBe('environment');
    });

    it('should handle empty string values', async () => {
      process.env.TEST_EMPTY_KEY = '';
      
      const result = await provider.getSecret('EMPTY_KEY');
      
      expect(result.found).toBe(true);
      expect(result.value).toBe('');
      expect(result.source).toBe('environment');
    });

    it('should handle undefined values as not found', async () => {
      // Ensure the key doesn't exist
      delete process.env.TEST_UNDEFINED_KEY;
      
      const result = await provider.getSecret('UNDEFINED_KEY');
      
      expect(result.found).toBe(false);
    });

    it('should prefer exact key match over prefix when both exist', async () => {
      const configNoPrefix = {
        name: 'environment' as const,
        priority: 100
      };
      
      const providerNoPrefix = new EnvironmentVariableProvider(configNoPrefix);
      
      // Set both versions
      process.env.API_KEY = 'direct-value';
      process.env.TEST_API_KEY = 'prefixed-value';
      
      const result = await providerNoPrefix.getSecret('API_KEY');
      
      expect(result.found).toBe(true);
      expect(result.value).toBe('direct-value');
    });
  });

  describe('key transformation', () => {
    it('should correctly transform key with prefix', async () => {
      process.env.TEST_DATABASE_URL = 'postgres://localhost:5432/test';
      
      const result = await provider.getSecret('DATABASE_URL');
      
      expect(result.found).toBe(true);
      expect(result.value).toBe('postgres://localhost:5432/test');
    });

    it('should handle keys with special characters', async () => {
      process.env['TEST_SPECIAL-KEY_WITH.CHARS'] = 'special-value';
      
      const result = await provider.getSecret('SPECIAL-KEY_WITH.CHARS');
      
      expect(result.found).toBe(true);
      expect(result.value).toBe('special-value');
    });

    it('should be case sensitive', async () => {
      process.env.TEST_lower_case = 'lowercase-value';
      process.env.TEST_LOWER_CASE = 'uppercase-value';
      
      const lowerResult = await provider.getSecret('lower_case');
      const upperResult = await provider.getSecret('LOWER_CASE');
      
      expect(lowerResult.value).toBe('lowercase-value');
      expect(upperResult.value).toBe('uppercase-value');
    });
  });


  describe('multiple prefixes and configurations', () => {
    it('should work with custom prefixes', async () => {
      const customConfig = {
        name: 'environment' as const,
        priority: 100,
        prefix: 'CUSTOM_PREFIX_'
      };
      
      const customProvider = new EnvironmentVariableProvider(customConfig);
      process.env.CUSTOM_PREFIX_SECRET_KEY = 'custom-secret';
      
      const result = await customProvider.getSecret('SECRET_KEY');
      
      expect(result.found).toBe(true);
      expect(result.value).toBe('custom-secret');
    });

    it('should work with empty prefix', async () => {
      const emptyPrefixConfig = {
        name: 'environment' as const,
        priority: 100,
        prefix: ''
      };
      
      const emptyPrefixProvider = new EnvironmentVariableProvider(emptyPrefixConfig);
      process.env.NO_PREFIX_KEY = 'no-prefix-value';
      
      const result = await emptyPrefixProvider.getSecret('NO_PREFIX_KEY');
      
      expect(result.found).toBe(true);
      expect(result.value).toBe('no-prefix-value');
    });
  });

  describe('provider metadata', () => {
    it('should have correct name and priority', () => {
      expect(provider.name).toBe('environment');
      expect(provider.priority).toBe(100);
    });

    it('should maintain priority from config', () => {
      const highPriorityConfig = {
        name: 'environment' as const,
        priority: 200,
        prefix: 'HIGH_'
      };
      
      const highPriorityProvider = new EnvironmentVariableProvider(highPriorityConfig);
      expect(highPriorityProvider.priority).toBe(200);
    });
  });
});

describe('EnvironmentVariableProvider Edge Cases', () => {
  it('should handle very long environment variable values', async () => {
    const config = {
      name: 'environment' as const,
      priority: 100,
      prefix: 'TEST_'
    };
    
    const provider = new EnvironmentVariableProvider(config);
    const longValue = 'a'.repeat(10000); // 10KB string
    
    process.env.TEST_LONG_VALUE = longValue;
    
    const result = await provider.getSecret('LONG_VALUE');
    
    expect(result.found).toBe(true);
    expect(result.value).toBe(longValue);
    expect(result.value.length).toBe(10000);
    
    delete process.env.TEST_LONG_VALUE;
  });

  it('should handle Unicode characters in values', async () => {
    const config = {
      name: 'environment' as const,
      priority: 100,
      prefix: 'TEST_'
    };
    
    const provider = new EnvironmentVariableProvider(config);
    const unicodeValue = '🔑 API Key with émojis and accénts 中文';
    
    process.env.TEST_UNICODE_KEY = unicodeValue;
    
    const result = await provider.getSecret('UNICODE_KEY');
    
    expect(result.found).toBe(true);
    expect(result.value).toBe(unicodeValue);
    
    delete process.env.TEST_UNICODE_KEY;
  });

  it('should handle newlines and special characters in values', async () => {
    const config = {
      name: 'environment' as const,
      priority: 100,
      prefix: 'TEST_'
    };
    
    const provider = new EnvironmentVariableProvider(config);
    // Note: Environment variables strip null characters, so we test without them
    const complexValue = 'Line 1\nLine 2\tTabbed\r\nWindows newline';
    
    process.env.TEST_COMPLEX_VALUE = complexValue;
    
    const result = await provider.getSecret('COMPLEX_VALUE');
    
    expect(result.found).toBe(true);
    expect(result.value).toBe(complexValue);
    
    delete process.env.TEST_COMPLEX_VALUE;
  });
});