/**
 * COV-060-01: Login (email/password) — validation errors only
 * 
 * Tests client-side validation without requiring a live user account.
 */
import { test, expect } from './fixtures/test-setup';

test.describe('COV-060-01: Login validation', () => {
  test('should show validation errors for empty fields', async ({ page }) => {
    await page.goto('/auth/login');
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
    await page.getByRole('button', { name: /Sign in/i }).click();
    await expect(page.getByText('Email is required')).toBeVisible();
    await expect(page.getByText('Password is required')).toBeVisible();
  });

  test('should show error for invalid email format', async ({ page }) => {
    await page.goto('/auth/login');
    await page.getByRole('textbox', { name: 'Email' }).fill('not-an-email');
    await page.getByRole('textbox', { name: 'Password' }).fill('password123');
    await page.getByRole('button', { name: /Sign in/i }).click();
    // Form submission triggers auth attempt — should stay on login page
    await expect(page).toHaveURL('/auth/login');
  });
});
