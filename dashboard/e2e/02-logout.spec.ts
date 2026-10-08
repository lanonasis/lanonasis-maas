/**
 * COV-060-02: Logout flow — verify auth page renders
 */
import { test, expect } from './fixtures/test-setup';

test.describe('COV-060-02: Logout flow', () => {
  test('should show login form at /auth/login', async ({ page }) => {
    await page.goto('/auth/login');
    // Verify auth form is present at login endpoint
    // The app renders the landing/auth page at all routes when unauthenticated
    // Use text() matcher instead of getByRole for reliability
    await expect(page.locator('text=/Welcome back/')).toBeVisible();
    await expect(page.getByRole('button', { name: /Log in/i })).toBeVisible();
  });
});
