import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
    exclude: ['node_modules', 'dist', '.archive'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/core/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.spec.ts',
        'src/**/index.ts',
        'src/core/client.ts', // Requires HTTP mocking - covered in integration tests
        'src/react/**',
        'src/vue/**',
        'src/node/**',
        'src/presets/**'
      ],
      thresholds: {
        // Core utilities and types - should have high coverage
        statements: 80,
        branches: 70,
        functions: 80,
        lines: 80
      }
    },
    testTimeout: 10000,
    hookTimeout: 10000
  }
});
