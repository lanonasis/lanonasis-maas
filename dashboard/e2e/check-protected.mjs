
import { chromium } from '@playwright/test';

(async () => {
  const browser = await chromium.launch({ channel: 'chrome' });
  const page = await browser.newPage();
  
  const tests = [
    { name: '/auth/login', url: 'http://localhost:3005/auth/login' },
    { name: '/dashboard', url: 'http://localhost:3005/dashboard' },
    { name: '/dashboard/memory-visualizer', url: 'http://localhost:3005/dashboard/memory-visualizer' },
    { name: '/dashboard/extensions', url: 'http://localhost:3005/dashboard/extensions' },
    { name: '/auth/forgot-password', url: 'http://localhost:3005/auth/forgot-password' },
  ];
  
  for (const t of tests) {
    console.log('\n=== ' + t.name + ' ===');
    await page.goto(t.url);
    await page.waitForLoadState('networkidle');
    
    // Get page title
    const title = await page.title();
    console.log('  Title:', title);
    
    // Get all headings
    const headings = await page.locator('h1, h2, h3').allTextContents();
    console.log('  Headings:', headings);
    
    // Get all labels
    const labels = await page.locator('label').allTextContents();
    console.log('  Labels:', labels);
    
    // Get all buttons
    const buttons = await page.locator('button').allTextContents();
    console.log('  Buttons:', buttons.slice(0, 8));
    
    // Check for auth form elements
    const hasEmailLabel = await page.getByLabel('Email').isVisible({ timeout: 1000 }).catch(() => false);
    const hasPasswordLabel = await page.getByLabel('Password').isVisible({ timeout: 1000 }).catch(() => false);
    const hasSignInBtn = await page.getByRole('button', { name: /Sign in/i }).isVisible({ timeout: 1000 }).catch(() => false);
    const hasWelcomeHeading = await page.getByRole('heading', { name: 'Welcome back' }).isVisible({ timeout: 1000 }).catch(() => false);
    
    console.log('  Has Email label:', hasEmailLabel);
    console.log('  Has Password label:', hasPasswordLabel);
    console.log('  Has Sign in button:', hasSignInBtn);
    console.log('  Has Welcome back heading:', hasWelcomeHeading);
  }
  
  await browser.close();
})();
