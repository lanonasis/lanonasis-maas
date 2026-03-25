import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: '@lanonasis/memory-lanonasis',
    environment: 'node',
    include: ['**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    passWithNoTests: false,
  },
});
