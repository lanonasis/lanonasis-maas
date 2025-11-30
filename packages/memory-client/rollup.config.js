import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import dts from 'rollup-plugin-dts';
import { readFileSync } from 'fs';

const packageJson = JSON.parse(readFileSync('./package.json', 'utf-8'));

/**
 * Universal SDK Rollup Configuration
 *
 * Builds separate bundles for each environment:
 * - core: Browser-safe client (NO Node.js deps)
 * - node: Node.js-specific features (CLI integration)
 * - react: React hooks and provider
 * - vue: Vue composables and plugin
 * - presets: Configuration presets
 * - index: Main entry with auto-detection
 */

export default [
  // ========================================
  // Core Bundle (Browser-Safe)
  // ========================================
  {
    input: 'src/core/index.ts',
    output: [
      {
        file: 'dist/core/index.js',
        format: 'esm',
        sourcemap: true,
      }
    ],
    plugins: [
      resolve({
        browser: true, // Browser-first resolution
        preferBuiltins: false, // Don't prefer Node.js builtins
      }),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false,
        declarationMap: false,
        outDir: 'dist/core',
        rootDir: 'src/core'
      }),
    ],
    external: ['zod'], // Only zod is external
  },

  // Core Type Definitions
  {
    input: 'src/core/index.ts',
    output: {
      file: 'dist/core/index.d.ts',
      format: 'esm',
    },
    plugins: [dts()],
    external: ['zod'],
  },

  // ========================================
  // Node Bundle (with CLI Integration)
  // ========================================
  {
    input: 'src/node/index.ts',
    output: [
      {
        file: 'dist/node/index.js',
        format: 'esm',
        sourcemap: true,
      }
    ],
    plugins: [
      resolve({
        browser: false,
        preferBuiltins: true, // Prefer Node.js builtins
      }),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false,
        declarationMap: false,
        outDir: 'dist/node',
        rootDir: 'src/node'
      }),
    ],
    external: ['zod', 'child_process', 'util', 'fs', 'os', '../core/client', '../core/types'],
  },

  // Node Type Definitions
  {
    input: 'src/node/index.ts',
    output: {
      file: 'dist/node/index.d.ts',
      format: 'esm',
    },
    plugins: [dts()],
    external: ['zod', 'child_process', 'util', 'fs', 'os', '../core/client', '../core/types'],
  },

  // ========================================
  // React Bundle
  // ========================================
  {
    input: 'src/react/index.ts',
    output: [
      {
        file: 'dist/react/index.js',
        format: 'esm',
        sourcemap: true,
      }
    ],
    plugins: [
      resolve({
        browser: true,
        preferBuiltins: false,
      }),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false,
        declarationMap: false,
        outDir: 'dist/react',
        rootDir: 'src/react'
      }),
    ],
    external: ['react', 'zod', '../core/client', '../core/types'],
  },

  // React Type Definitions
  {
    input: 'src/react/index.ts',
    output: {
      file: 'dist/react/index.d.ts',
      format: 'esm',
    },
    plugins: [dts()],
    external: ['react', 'zod', '../core/client', '../core/types'],
  },

  // ========================================
  // Vue Bundle
  // ========================================
  {
    input: 'src/vue/index.ts',
    output: [
      {
        file: 'dist/vue/index.js',
        format: 'esm',
        sourcemap: true,
      }
    ],
    plugins: [
      resolve({
        browser: true,
        preferBuiltins: false,
      }),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false,
        declarationMap: false,
        outDir: 'dist/vue',
        rootDir: 'src/vue'
      }),
    ],
    external: ['vue', 'zod', '../core/client', '../core/types'],
  },

  // Vue Type Definitions
  {
    input: 'src/vue/index.ts',
    output: {
      file: 'dist/vue/index.d.ts',
      format: 'esm',
    },
    plugins: [dts()],
    external: ['vue', 'zod', '../core/client', '../core/types'],
  },

  // ========================================
  // Presets Bundle
  // ========================================
  {
    input: 'src/presets/index.ts',
    output: [
      {
        file: 'dist/presets/index.js',
        format: 'esm',
        sourcemap: true,
      }
    ],
    plugins: [
      resolve({
        browser: false, // Can be used in both
        preferBuiltins: false,
      }),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false,
        declarationMap: false,
        outDir: 'dist/presets',
        rootDir: 'src/presets'
      }),
    ],
    external: ['zod', '../core/client'],
  },

  // Presets Type Definitions
  {
    input: 'src/presets/index.ts',
    output: {
      file: 'dist/presets/index.d.ts',
      format: 'esm',
    },
    plugins: [dts()],
    external: ['zod', '../core/client'],
  },

  // ========================================
  // Main Entry (Auto-Detection)
  // ========================================
  {
    input: 'src/index.ts',
    output: [
      {
        file: packageJson.main,
        format: 'cjs',
        sourcemap: true,
      },
      {
        file: packageJson.module,
        format: 'esm',
        sourcemap: true,
      },
    ],
    plugins: [
      resolve({
        browser: false,
        preferBuiltins: false,
      }),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false,
        declarationMap: false,
      }),
    ],
    external: ['zod', 'child_process', 'util', 'fs', 'os', 'react', 'vue'],
  },

  // Main Type Definitions
  {
    input: 'src/index.ts',
    output: {
      file: packageJson.types,
      format: 'esm',
    },
    plugins: [dts()],
    external: ['zod', 'child_process', 'util', 'fs', 'os', 'react', 'vue'],
  },
];
