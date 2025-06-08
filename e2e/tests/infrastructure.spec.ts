import { test, expect } from '@playwright/test';

test.describe('E2E Infrastructure Test', () => {
  test('should verify Playwright is working', async ({ page }) => {
    console.log('🧪 Testing Playwright infrastructure...');
    
    // Test basic page functionality
    await page.goto('data:text/html,<h1>E2E Infrastructure Test</h1><p>Playwright is working!</p>');
    
    // Test element selection
    await expect(page.locator('h1')).toHaveText('E2E Infrastructure Test');
    await expect(page.locator('p')).toHaveText('Playwright is working!');
    
    console.log('✅ Playwright infrastructure test passed!');
  });

  test('should verify test environment variables', async ({ page }) => {
    console.log('🧪 Testing environment variables...');
    
    // This test verifies that our test environment can access Node.js APIs
    const nodeEnv = process.env.NODE_ENV;
    console.log('NODE_ENV:', nodeEnv);
    
    // Create a simple page to test browser functionality
    await page.goto('data:text/html,<div id="env-test">Environment Test</div>');
    await expect(page.locator('#env-test')).toBeVisible();
    
    console.log('✅ Environment test passed!');
  });

  test('should verify browser capabilities', async ({ page }) => {
    console.log('🧪 Testing browser capabilities...');
    
    // Test JavaScript execution in browser
    await page.goto('data:text/html,<div id="js-test"></div><script>document.getElementById("js-test").textContent = "JavaScript works!";</script>');
    
    await expect(page.locator('#js-test')).toHaveText('JavaScript works!');
    
    // Test page evaluation
    const result = await page.evaluate(() => {
      return { 
        userAgent: navigator.userAgent,
        title: document.title 
      };
    });
    
    console.log('Browser user agent:', result.userAgent.substring(0, 50) + '...');
    
    console.log('✅ Browser capabilities test passed!');
  });
});
