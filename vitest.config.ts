import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

const rootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(rootDir, 'src'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['tests/setup.ts'],
    include: [
      'src/**/__tests__/**/*.test.ts',
      'tests/unit/**/*.test.ts',
      'tests/conformance/**/*.test.ts',
    ],
    exclude: [
      'node_modules',
      'dist',
      'coverage',
      'tests/integration/**',
      '**/*.skip',
      '**/*.skip.*',
    ],
    coverage: {
      provider: 'v8',
      reportsDirectory: 'coverage',
      reporter: ['text', 'text-summary', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.d.ts',
        'src/server.ts',
        'src/db/migrate.ts',
        'src/db/seed.ts',
      ],
      thresholds: {
        branches: 25,
        functions: 25,
        lines: 25,
        statements: 25,
      },
    },
    testTimeout: 30000,
    hookTimeout: 30000,
    passWithNoTests: false,
  },
});
