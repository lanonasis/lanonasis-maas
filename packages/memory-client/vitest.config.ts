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
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.spec.ts',
        'src/**/index.ts',
        'src/react/**',
        'src/vue/**',
        'src/node/**',
        'src/presets/**'
      ],
      thresholds: {
        statements: 70,
        branches: 60,
        functions: 70,
        lines: 70
      }
    },
    testTimeout: 10000,
    hookTimeout: 10000
  }
});
