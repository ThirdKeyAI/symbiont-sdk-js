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
      '@symbi/types': resolve(__dirname, 'packages/types/src'),
      '@symbi/core': resolve(__dirname, 'packages/core/src'),
      '@symbi/agent': resolve(__dirname, 'packages/agent/src'),
      '@symbi/secrets': resolve(__dirname, 'packages/secrets/src'),
      '@symbi/testing': resolve(__dirname, 'packages/testing/src'),
      '@symbi/tool-review': resolve(__dirname, 'packages/tool-review/src'),
      '@symbi/mcp': resolve(__dirname, 'packages/mcp/src'),
      '@symbi/policy': resolve(__dirname, 'packages/policy/src')
    }
  }
});