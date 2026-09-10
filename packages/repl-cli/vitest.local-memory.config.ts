/**
 * Standalone vitest config for the local-memory module. Avoids the
 * package-level vitest.config.ts dependency resolution that requires
 * `chalk`, `ora`, etc. (which aren't installed in this monorepo).
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/local-memory/**/*.test.{ts,tsx}'],
    exclude: ['node_modules', 'dist'],
    passWithNoTests: true,
    environment: 'node',
    testTimeout: 10_000,
  },
});
