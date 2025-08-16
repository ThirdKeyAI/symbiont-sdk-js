import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import json from '@rollup/plugin-json';

export default [
  // ESM and CJS library builds
  {
    input: 'src/index.ts',
    output: [
      {
        file: 'dist/index.js',
        format: 'cjs',
        sourcemap: true
      },
      {
        file: 'dist/index.esm.js',
        format: 'es',
        sourcemap: true
      }
    ],
    external: [
      '@symbiont/types',
      '@qdrant/qdrant-js',
      'express',
      'jsonwebtoken',
      'bcrypt',
      'crypto',
      'fs',
      'path',
      'http',
      'https',
      'url',
      'events',
      'stream',
      'util'
    ],
    plugins: [
      resolve(),
      commonjs(),
      json(),
      typescript({
        tsconfig: './tsconfig.json'
      })
    ]
  }
];