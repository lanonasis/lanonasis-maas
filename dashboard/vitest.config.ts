import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    // Use forks to avoid tinypool thread issues under Bun
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
        isolate: false,
      },
    },
    // Ensure Vitest does not use worker threads (tinypool)
    threads: false,
    // Helpful for stability in JSDOM and URL-related code
    environmentOptions: {
      jsdom: {
        url: 'http://localhost:3000',
      },
    },
    // Force Vite to pre-bundle these so alias/dedupe apply uniformly
    deps: {
      inline: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        'react/jsx-dev-runtime',
        'react-router',
        'react-router-dom',
        '@testing-library/react',
        '@testing-library/user-event'
      ]
    },
    teardownTimeout: 5000,
    isolate: false,
    coverage: {
      enabled: false,
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.d.ts',
        'src/test/**/*',
        'src/__tests__/**/*',
        'src/main.tsx',
        'src/vite-env.d.ts'
      ]
    },
    css: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Force a single React across workspace by resolving to repo root
      react: path.resolve(__dirname, '../../../node_modules/react'),
      'react-dom': path.resolve(__dirname, '../../../node_modules/react-dom'),
      'react/jsx-runtime': path.resolve(__dirname, '../../../node_modules/react/jsx-runtime.js'),
      'react/jsx-dev-runtime': path.resolve(__dirname, '../../../node_modules/react/jsx-dev-runtime.js'),
      'react-router-dom': path.resolve(__dirname, '../../../node_modules/react-router-dom'),
      'react-router': path.resolve(__dirname, '../../../node_modules/react-router'),
    },
    dedupe: ['react', 'react-dom', 'react-router', 'react-router-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime'],
  },
});