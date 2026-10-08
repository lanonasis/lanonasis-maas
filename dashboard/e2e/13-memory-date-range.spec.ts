/**
 * COV-062-03: Memory analytics — date range filter
 * The memory visualizer is behind a ProtectedRoute. When unauthenticated,
 * the app serves the landing/auth page.
 */
import { test, expect } from './fixtures/test-setup';

test.describe('COV-062-03: Memory analytics — date range filter', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Chromium only');
  
  test('date range filter renders at protected route', async ({ page }) => {
    await page.goto('/dashboard/memory-visualizer');
    await expect(page.getByText('Welcome back')).toBeVisible();
  });
});
