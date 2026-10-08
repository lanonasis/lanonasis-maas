/**
 * Base test fixture extending Playwright's test with auth helpers.
 *
 * Provides `loginAs` for navigating through the auth flow and returning
 * a filled page object ready for authenticated interactions.
 */
import { test as base } from '@playwright/test';

export interface AuthPage {
  page: import('@playwright/test').Page;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export const test = base.extend<{}>({
  // No browser-level fixtures needed; each test navigates through auth.
});

export { expect } from '@playwright/test';

/**
 * Navigate to the login page and fill in credentials.
 *
 * @param page - Playwright page
 * @param email - Test user email
 * @param password - Test user password
 *
 * NOTE: This function navigates through the login form fields. The dashboard
 * uses Supabase auth, so successful login depends on a running Supabase
 * instance with test users. In CI these tests will be skipped unless
 * SUPABASE_URL / SUPABASE_SERVICE_KEY env vars point to a live instance.
 */
export async function fillLoginForm(
  page: import('@playwright/test').Page,
  email: string,
  password: string,
) {
  await page.goto('/auth/login');

  // Wait for the login form to be visible
  await page.getByRole('heading', { name: 'Welcome back' }).waitFor({ state: 'visible' });

  // Fill email
  await page.getByLabel('Email').fill(email);

  // Fill password
  await page.getByLabel('Password').fill(password);

  // Click sign-in button
  await page.getByRole('button', { name: 'Sign in' }).click();

  // Wait for redirect to dashboard
  await page.waitForURL('/dashboard', { timeout: 15000 });
}

/**
 * Navigate to the register page and fill in credentials.
 */
export async function fillRegisterForm(
  page: import('@playwright/test').Page,
  email: string,
  password: string,
  name: string,
) {
  await page.goto('/auth/register');

  await page.getByRole('heading', { name: 'Create an account' }).waitFor({ state: 'visible' });

  await page.getByLabel('Name').fill(name);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByLabel('Confirm Password').fill(password);

  await page.getByRole('button', { name: 'Create account' }).click();
}

/**
 * Navigate to the forgot password page.
 */
export async function navigateToForgotPassword(page: import('@playwright/test').Page) {
  await page.goto('/auth/forgot-password');
  await page.getByRole('heading', { name: 'Reset your password' }).waitFor({ state: 'visible' });
}
