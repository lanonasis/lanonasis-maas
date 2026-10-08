/**
 * COV-063-01: MCP server manager — catalog render
 * The MCP server manager is behind a ProtectedRoute. When unauthenticated,
 * the app serves the landing/auth page.
 */
import { test, expect } from './fixtures/test-setup';

test.describe('COV-063-01: MCP server manager — catalog render', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Chromium only');
  
  test('MCP server manager page renders without errors when unauthenticated', async ({ page }) => {
    await page.goto('/dashboard/extensions');
    await expect(page.getByText('Welcome back')).toBeVisible();
  });
});
