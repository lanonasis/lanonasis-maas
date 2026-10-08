import { defineConfig, devices } from '@playwright/test';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Playwright configuration for dashboard E2E tests.
 *
 * Targets the Vite dev server running on localhost:3005 (per vite.config.ts).
 * NOTE: playwright.config.ts uses webServer to auto-manage the vite process.
 * If running manually, start the dev server separately and disable webServer.
 */
export default defineConfig({
  testDir: './e2e',
  testIgnore: '**/fixtures/**',
  testMatch: '**/*.spec.ts',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3005',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    },
  ],
  webServer: {
    command: 'bunx vite --mode development',
    url: 'http://localhost:3005',
    reuseExistingServer: !process.env.CI,
    cwd: __dirname,
  },
});
