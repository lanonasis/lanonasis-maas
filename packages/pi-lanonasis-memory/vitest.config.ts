import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    globals: false,
    testTimeout: 10_000,
    // Only active under `bun run test:coverage` (--coverage). Thresholds
    // sit ~5 points below the measured v1.0.2 baseline so they catch
    // regressions without failing today. Raise them as coverage grows.
    coverage: {
      provider: 'v8',
      include: ['src/**'],
      reporter: ['text-summary', 'json-summary'],
      // Measured 2026-10-08: statements 86.45, branches 75.27,
      // functions 86.99, lines 87.89.
      thresholds: {
        statements: 81,
        branches: 70,
        functions: 82,
        lines: 82,
      },
    },
  },
});
