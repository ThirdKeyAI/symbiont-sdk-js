import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.d.ts',
        '**/*.test.ts',
        '**/*.spec.ts',
        'coverage/',
        'apps/',
        'tools/',
        'configs/'
      ]
    },
    // Support for workspace packages
    testTimeout: 10000,
    hookTimeout: 10000
  },
  resolve: {
    alias: {
      '@symbiont/types': resolve(__dirname, 'packages/types/src'),
      '@symbiont/core': resolve(__dirname, 'packages/core/src'),
      '@symbiont/agent': resolve(__dirname, 'packages/agent/src'),
      '@symbiont/secrets': resolve(__dirname, 'packages/secrets/src'),
      '@symbiont/testing': resolve(__dirname, 'packages/testing/src'),
      '@symbiont/tool-review': resolve(__dirname, 'packages/tool-review/src'),
      '@symbiont/mcp': resolve(__dirname, 'packages/mcp/src'),
      '@symbiont/policy': resolve(__dirname, 'packages/policy/src')
    }
  }
});