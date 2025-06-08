// Simple test to verify Playwright installation and basic functionality
const { test, expect } = require('@playwright/test');

test('basic playwright test', async ({ page }) => {
  console.log('Test is running...');
  // Just create a page and close it
  await page.goto('data:text/html,<h1>Test Page</h1>');
  await expect(page.locator('h1')).toHaveText('Test Page');
  console.log('Test completed successfully!');
});
