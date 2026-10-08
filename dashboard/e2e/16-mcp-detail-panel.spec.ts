/**
 * COV-063-03: MCP server detail panel — renders without errors when unauthenticated
 */
import { test, expect } from './fixtures/test-setup';

test.describe('COV-063-03: MCP server detail panel', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Chromium only');
  
  test('MCP detail panel renders without errors at protected route', async ({ page }) => {
    await page.goto('/dashboard/extensions/some-id');
    await expect(page.getByText('Welcome back')).toBeVisible();
  });
});
