import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import globals from 'globals';

export default [
  js.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      globals: {
        ...globals.node,
        ...globals.browser,
        ...globals.jest,
        fetch: 'readonly',
        AbortSignal: 'readonly',
        RequestInit: 'readonly',
        // TypeScript types / @types/node globals that the base ESLint parser
        // doesn't know about but are always in scope for TS files.
        NodeJS: 'readonly',
        BufferEncoding: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': typescript,
    },
    rules: {
      ...typescript.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/no-require-imports': 'off',
      // TypeScript intentionally allows a value and a type to share a name
      // across its value/type namespaces (e.g.
      // `const Foo = {...} as const; type Foo = typeof Foo[keyof Foo]`),
      // a common enum-like pattern used throughout @symbi/types. Both
      // `no-redeclare` and `@typescript-eslint/no-redeclare` flag this as
      // a false positive; the TypeScript compiler itself catches real
      // redeclares, so disable both rules in TS files.
      'no-redeclare': 'off',
      '@typescript-eslint/no-redeclare': 'off',
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },
  {
    files: ['**/*.js', '**/*.mjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
  },
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      '**/*.d.ts',
      'coverage/**',
      '.next/**',
      '.nuxt/**',
    ],
  },
];