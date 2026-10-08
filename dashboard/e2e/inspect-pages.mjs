import { chromium } from '@playwright/test';

(async () => {
  // Use system Chrome via channel config
  const browser = await chromium.launch({
    channel: 'chrome',
  });
  const page = await browser.newPage();
  
  try {
    // 1. Check auth login page
    console.log('=== /auth/login ===');
    await page.goto('http://localhost:3005/auth/login');
    await page.waitForLoadState('networkidle');
    
    const headings = await page.locator('h1, h2, h3').allTextContents();
    console.log('Headings:', headings);
    
    const labels = await page.locator('label').allTextContents();
    console.log('Labels:', labels);
    
    const buttons = await page.locator('button').allTextContents();
    console.log('Buttons:', buttons.slice(0, 10));
    
    // Check validation errors
    await page.getByRole('button', { name: /Sign in/i }).click();
    await page.waitForTimeout(1000);
    const errorTexts = await page.locator('[class*="text-destructive"]').allTextContents();
    console.log('Error texts after submit:', errorTexts);
    
    // 2. Check memory visualizer page
    console.log('\n=== /dashboard/memory-visualizer ===');
    await page.goto('http://localhost:3005/dashboard/memory-visualizer');
    await page.waitForLoadState('networkidle');
    const memHeadings = await page.locator('h1, h2, h3').allTextContents();
    console.log('Headings:', memHeadings);
    const allText = await page.locator('body').textContent();
    console.log('Body text (first 800):', (allText || '').substring(0, 800));
    
    // 3. Check MCP extensions page
    console.log('\n=== /dashboard/extensions ===');
    await page.goto('http://localhost:3005/dashboard/extensions');
    await page.waitForLoadState('networkidle');
    const mcpHeadings = await page.locator('h1, h2, h3').allTextContents();
    console.log('Headings:', mcpHeadings);
    const mcpTabs = await page.locator('[role="tab"]').allTextContents();
    console.log('Tabs:', mcpTabs);
    
    // 4. Check API analytics page
    console.log('\n=== /api-analytics ===');
    await page.goto('http://localhost:3005/api-analytics');
    await page.waitForLoadState('networkidle');
    const apiHeadings = await page.locator('h1, h2, h3').allTextContents();
    console.log('Headings:', apiHeadings);
    const selects = await page.locator('[role="combobox"]').allTextContents();
    console.log('Comboboxes:', selects);
    
    // 5. Check dashboard page for API Key Manager button
    console.log('\n=== /dashboard ===');
    await page.goto('http://localhost:3005/dashboard');
    await page.waitForLoadState('networkidle');
    const dashButtons = await page.locator('button').allTextContents();
    console.log('Buttons:', dashButtons.slice(0, 15));
    const dashHeadings = await page.locator('h1, h2, h3').allTextContents();
    console.log('Headings:', dashHeadings);
    
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await browser.close();
  }
})();
