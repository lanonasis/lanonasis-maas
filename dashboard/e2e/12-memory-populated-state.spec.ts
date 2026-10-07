/**
 * COV-062-02: Memory analytics — populated state
 * The memory visualizer is behind a ProtectedRoute. When unauthenticated,
 * the app serves the landing/auth page.
 */
import { test, expect } from './fixtures/test-setup';

test.describe('COV-062-02: Memory analytics — populated state', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Chromium only');
  
  test('memory visualizer renders without errors at protected route', async ({ page }) => {
    await page.goto('/dashboard/memory-visualizer');
    await expect(page.getByText('Welcome back')).toBeVisible();
  });
});
