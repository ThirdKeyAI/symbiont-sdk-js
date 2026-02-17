import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';

const external = [
  // Node.js built-ins
  'fs', 'path', 'os', 'util', 'events', 'stream', 'crypto',
  // Dependencies that should remain external
  '@symbi/core', '@symbi/agent', '@symbi/policy', 
  '@symbi/secrets', '@symbi/tool-review', '@symbi/types',
  'commander', 'inquirer', 'chalk'
];

export default [
  // Main library build
  {
    input: 'src/index.ts',
    output: [
      {
        file: 'dist/index.js',
        format: 'cjs',
        sourcemap: true,
        exports: 'named'
      },
      {
        file: 'dist/index.esm.js',
        format: 'esm',
        sourcemap: true
      }
    ],
    external,
    plugins: [
      resolve({ 
        preferBuiltins: true,
        exportConditions: ['node']
      }),
      commonjs(),
      json(),
      typescript({
        tsconfig: './tsconfig.json',
        sourceMap: true,
        declaration: true,
        declarationDir: 'dist',
        rootDir: 'src'
      })
    ]
  },
  // CLI executable build
  {
    input: 'src/cli.ts',
    output: {
      file: 'dist/cli.js',
      format: 'cjs',
      sourcemap: true
    },
    external,
    plugins: [
      resolve({ 
        preferBuiltins: true,
        exportConditions: ['node']
      }),
      commonjs(),
      json(),
      typescript({
        tsconfig: './tsconfig.json',
        sourceMap: true,
        declaration: false
      })
    ]
  }
];