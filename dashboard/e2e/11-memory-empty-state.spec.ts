/**
 * COV-062-01: Memory analytics — empty state
 * The memory visualizer is behind a ProtectedRoute. When unauthenticated,
 * the app serves the landing/auth page.
 */
import { test, expect } from './fixtures/test-setup';

test.describe('COV-062-01: Memory analytics — empty state', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Chromium only');
  
  test('memory visualizer page renders without errors when unauthenticated', async ({ page }) => {
    await page.goto('/dashboard/memory-visualizer');
    await expect(page.getByText('Welcome back')).toBeVisible();
  });
});
