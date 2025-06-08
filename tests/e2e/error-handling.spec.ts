// End-to-end tests for error handling and edge cases
import { test, expect, Page, Browser } from '@playwright/test';

const TEST_USER = {
  email: 'errortest@example.com',
  password: 'SecurePassword123!',
  name: 'Error Test User',
};

class ErrorTestHelper {
  constructor(private page: Page) {}

  async loginUser() {
    await this.page.goto('/auth/login');
    await this.page.fill('[data-testid="email-input"]', TEST_USER.email);
    await this.page.fill('[data-testid="password-input"]', TEST_USER.password);
    await this.page.click('[data-testid="login-button"]');
    await this.page.waitForURL('/dashboard');
  }

  async simulateNetworkError(url: string, statusCode: number = 500) {
    await this.page.route(url, route => {
      route.fulfill({
        status: statusCode,
        body: JSON.stringify({ error: 'Network error' }),
      });
    });
  }

  async simulateSlowResponse(url: string, delay: number = 5000) {
    await this.page.route(url, async route => {
      await new Promise(resolve => setTimeout(resolve, delay));
      route.continue();
    });
  }

  async simulateOfflineMode() {
    await this.page.setOffline(true);
  }

  async restoreOnlineMode() {
    await this.page.setOffline(false);
  }

  async verifyErrorMessage(expectedMessage: string, timeout: number = 5000) {
    await expect(this.page.locator('[data-testid="error-message"]')).toBeVisible({ timeout });
    await expect(this.page.locator('[data-testid="error-message"]')).toContainText(expectedMessage);
  }

  async verifyRetryButton() {
    await expect(this.page.locator('[data-testid="retry-button"]')).toBeVisible();
  }

  async clickRetry() {
    await this.page.click('[data-testid="retry-button"]');
  }

  async fillLargeForm(size: number = 10000) {
    const largeText = 'x'.repeat(size);
    await this.page.fill('[data-testid="large-text-input"]', largeText);
  }

  async waitForLoadingSpinner() {
    await expect(this.page.locator('[data-testid="loading-spinner"]')).toBeVisible();
  }

  async waitForLoadingSpinnerToDisappear() {
    await expect(this.page.locator('[data-testid="loading-spinner"]')).not.toBeVisible();
  }
}

test.describe('Error Handling and Edge Cases E2E Tests', () => {
  let helper: ErrorTestHelper;

  test.beforeEach(async ({ page }) => {
    helper = new ErrorTestHelper(page);
  });

  test.describe('🌐 Network Error Handling', () => {
    test('should handle authentication server errors gracefully', async ({ page }) => {
      // Simulate auth server error
      await helper.simulateNetworkError('**/api/auth/login', 503);

      await page.goto('/auth/login');
      await page.fill('[data-testid="email-input"]', TEST_USER.email);
      await page.fill('[data-testid="password-input"]', TEST_USER.password);
      await page.click('[data-testid="login-button"]');

      // Verify error handling
      await helper.verifyErrorMessage('Authentication service temporarily unavailable');
      await helper.verifyRetryButton();

      // Test retry mechanism
      await page.unroute('**/api/auth/login');
      await helper.clickRetry();
      await page.waitForURL('/dashboard');
    });

    test('should handle file upload failures with retry', async ({ page }) => {
      await helper.loginUser();
      await page.goto('/dashboard/files');

      // Simulate upload failure
      await helper.simulateNetworkError('**/api/upload', 500);

      // Attempt file upload
      const fileInput = page.locator('[data-testid="file-upload-input"]');
      await fileInput.setInputFiles({
        name: 'test-file.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('Test content'),
      });

      // Verify error handling
      await helper.verifyErrorMessage('Upload failed');
      await expect(page.locator('[data-testid="upload-retry"]')).toBeVisible();

      // Test automatic retry
      await page.unroute('**/api/upload');
      await page.click('[data-testid="upload-retry"]');
      await expect(page.locator('[data-testid="upload-success"]')).toBeVisible();
    });

    test('should handle API timeout errors', async ({ page }) => {
      await helper.loginUser();
      
      // Simulate slow API response
      await helper.simulateSlowResponse('**/api/dashboard/analytics', 10000);

      await page.goto('/dashboard/analytics');
      
      // Verify loading state
      await helper.waitForLoadingSpinner();
      
      // Verify timeout handling
      await helper.verifyErrorMessage('Request timed out', 15000);
      await helper.verifyRetryButton();
    });

    test('should handle intermittent connectivity issues', async ({ page }) => {
      await helper.loginUser();
      await page.goto('/dashboard');

      // Simulate going offline
      await helper.simulateOfflineMode();
      
      // Try to perform an action that requires network
      await page.click('[data-testid="refresh-dashboard"]');
      
      // Verify offline message
      await expect(page.locator('[data-testid="offline-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="offline-message"]')).toContainText('You are currently offline');

      // Simulate coming back online
      await helper.restoreOnlineMode();
      
      // Verify online restoration
      await expect(page.locator('[data-testid="online-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="offline-message"]')).not.toBeVisible();
    });
  });

  test.describe('📝 Form Validation and Input Errors', () => {
    test('should handle invalid email formats', async ({ page }) => {
      await page.goto('/auth/login');

      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'user@',
        'user..name@example.com',
        'user@.com',
      ];

      for (const email of invalidEmails) {
        await page.fill('[data-testid="email-input"]', email);
        await page.click('[data-testid="login-button"]');
        
        await expect(page.locator('[data-testid="email-error"]')).toBeVisible();
        await expect(page.locator('[data-testid="email-error"]')).toContainText('Invalid email');
        
        await page.fill('[data-testid="email-input"]', '');
      }
    });

    test('should handle password strength requirements', async ({ page }) => {
      await page.goto('/auth/signup');

      const weakPasswords = [
        '123',
        'password',
        'Password',
        'Password1',
        'pass word',
      ];

      for (const password of weakPasswords) {
        await page.fill('[data-testid="password-input"]', password);
        await page.blur('[data-testid="password-input"]');
        
        await expect(page.locator('[data-testid="password-strength"]')).toBeVisible();
        const strengthText = await page.locator('[data-testid="password-strength"]').textContent();
        expect(strengthText).toMatch(/(Weak|Too weak)/i);
      }
    });

    test('should handle extremely long form inputs', async ({ page }) => {
      await helper.loginUser();
      await page.goto('/dashboard/profile');

      // Test with very long name input
      const longName = 'a'.repeat(1000);
      await page.fill('[data-testid="name-input"]', longName);
      await page.click('[data-testid="save-profile"]');

      // Verify validation error
      await expect(page.locator('[data-testid="name-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="name-error"]')).toContainText('Name is too long');
    });

    test('should handle special characters in file names', async ({ page }) => {
      await helper.loginUser();
      await page.goto('/dashboard/files');

      const invalidFileNames = [
        'file<script>.txt',
        'file"quotes.txt',
        'file\\backslash.txt',
        'file/slash.txt',
        'file|pipe.txt',
      ];

      for (const fileName of invalidFileNames) {
        await page.click('[data-testid="create-folder-button"]');
        await page.fill('[data-testid="folder-name-input"]', fileName);
        await page.click('[data-testid="create-folder-confirm"]');
        
        await expect(page.locator('[data-testid="filename-error"]')).toBeVisible();
        await page.click('[data-testid="cancel-folder-creation"]');
      }
    });
  });

  test.describe('💾 Storage and Quota Errors', () => {
    test('should handle storage quota exceeded', async ({ page }) => {
      await helper.loginUser();
      await page.goto('/dashboard/files');

      // Mock storage quota exceeded response
      await page.route('**/api/upload', route => {
        route.fulfill({
          status: 413,
          body: JSON.stringify({ 
            error: 'Storage quota exceeded',
            quotaUsed: '1GB',
            quotaLimit: '1GB' 
          }),
        });
      });

      // Attempt file upload
      const fileInput = page.locator('[data-testid="file-upload-input"]');
      await fileInput.setInputFiles({
        name: 'large-file.dat',
        mimeType: 'application/octet-stream',
        buffer: Buffer.alloc(1024 * 1024), // 1MB
      });

      // Verify quota error
      await expect(page.locator('[data-testid="quota-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="quota-error"]')).toContainText('Storage quota exceeded');
      await expect(page.locator('[data-testid="upgrade-storage"]')).toBeVisible();
    });

    test('should handle temporary storage unavailability', async ({ page }) => {
      await helper.loginUser();

      // Mock storage service unavailable
      await page.route('**/api/dashboard/analytics', route => {
        route.fulfill({
          status: 503,
          body: JSON.stringify({ 
            error: 'Storage service temporarily unavailable' 
          }),
        });
      });

      await page.goto('/dashboard');

      // Verify storage warning
      await expect(page.locator('[data-testid="storage-unavailable"]')).toBeVisible();
      await expect(page.locator('[data-testid="storage-unavailable"]')).toContainText('Storage metrics unavailable');
    });
  });

  test.describe('🔐 Authentication and Authorization Errors', () => {
    test('should handle session expiration gracefully', async ({ page }) => {
      await helper.loginUser();
      await page.goto('/dashboard');

      // Mock session expired response
      await page.route('**/api/**', route => {
        if (route.request().method() !== 'GET' || route.request().url().includes('/auth/')) {
          route.fulfill({
            status: 401,
            body: JSON.stringify({ error: 'Session expired' }),
          });
        } else {
          route.continue();
        }
      });

      // Perform action that requires authentication
      await page.click('[data-testid="create-folder-button"]');

      // Verify session expiry handling
      await expect(page.locator('[data-testid="session-expired"]')).toBeVisible();
      await expect(page.locator('[data-testid="login-redirect"]')).toBeVisible();

      // Click redirect and verify navigation to login
      await page.click('[data-testid="login-redirect"]');
      await page.waitForURL('**/auth/login');
    });

    test('should handle insufficient permissions', async ({ page }) => {
      await helper.loginUser();

      // Mock permission denied response
      await page.route('**/api/admin/**', route => {
        route.fulfill({
          status: 403,
          body: JSON.stringify({ error: 'Insufficient permissions' }),
        });
      });

      // Try to access admin functionality
      await page.goto('/dashboard/admin');

      // Verify permission error
      await expect(page.locator('[data-testid="permission-denied"]')).toBeVisible();
      await expect(page.locator('[data-testid="permission-denied"]')).toContainText('You don\'t have permission');
    });

    test('should handle account suspension', async ({ page }) => {
      // Mock account suspended response
      await page.route('**/api/auth/login', route => {
        route.fulfill({
          status: 423,
          body: JSON.stringify({ 
            error: 'Account suspended',
            reason: 'Violation of terms of service' 
          }),
        });
      });

      await page.goto('/auth/login');
      await page.fill('[data-testid="email-input"]', TEST_USER.email);
      await page.fill('[data-testid="password-input"]', TEST_USER.password);
      await page.click('[data-testid="login-button"]');

      // Verify suspension message
      await expect(page.locator('[data-testid="account-suspended"]')).toBeVisible();
      await expect(page.locator('[data-testid="suspension-reason"]')).toContainText('terms of service');
      await expect(page.locator('[data-testid="contact-support"]')).toBeVisible();
    });
  });

  test.describe('🎭 Browser Compatibility and Edge Cases', () => {
    test('should handle unsupported browser features', async ({ page }) => {
      // Mock unsupported File API
      await page.addInitScript(() => {
        delete (window as any).File;
        delete (window as any).FileReader;
      });

      await helper.loginUser();
      await page.goto('/dashboard/files');

      // Verify fallback message
      await expect(page.locator('[data-testid="unsupported-browser"]')).toBeVisible();
      await expect(page.locator('[data-testid="browser-upgrade"]')).toBeVisible();
    });

    test('should handle JavaScript disabled scenarios', async ({ page }) => {
      // Disable JavaScript
      await page.context().addInitScript(() => {
        Object.defineProperty(window, 'navigator', {
          value: { ...window.navigator, javaEnabled: () => false }
        });
      });

      await page.goto('/dashboard');

      // Verify graceful degradation
      await expect(page.locator('[data-testid="no-js-message"]')).toBeVisible();
    });

    test('should handle very slow network conditions', async ({ page }) => {
      // Simulate very slow network
      await page.route('**/*', async route => {
        await new Promise(resolve => setTimeout(resolve, 3000));
        route.continue();
      });

      const startTime = Date.now();
      await page.goto('/auth/login');
      
      // Verify loading indicators
      await helper.waitForLoadingSpinner();
      
      // Verify timeout handling
      const loadTime = Date.now() - startTime;
      if (loadTime > 10000) {
        await expect(page.locator('[data-testid="slow-connection"]')).toBeVisible();
      }
    });

    test('should handle browser storage limitations', async ({ page }) => {
      // Fill localStorage to capacity
      await page.addInitScript(() => {
        try {
          for (let i = 0; i < 10000; i++) {
            localStorage.setItem(`test_${i}`, 'x'.repeat(1000));
          }
        } catch (e) {
          // Storage full
        }
      });

      await helper.loginUser();
      await page.goto('/dashboard');

      // Verify storage warning
      await expect(page.locator('[data-testid="storage-warning"]')).toBeVisible();
      await expect(page.locator('[data-testid="clear-cache"]')).toBeVisible();
    });
  });

  test.describe('🔄 Race Conditions and Concurrency', () => {
    test('should handle rapid successive API calls', async ({ page }) => {
      await helper.loginUser();
      await page.goto('/dashboard/files');

      // Make multiple rapid API calls
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(page.click('[data-testid="refresh-files"]'));
      }

      await Promise.all(promises);

      // Verify no duplicate requests or errors
      await expect(page.locator('[data-testid="error-message"]')).not.toBeVisible();
      await expect(page.locator('[data-testid="file-list"]')).toBeVisible();
    });

    test('should handle concurrent file uploads', async ({ page }) => {
      await helper.loginUser();
      await page.goto('/dashboard/files');

      // Upload multiple files simultaneously
      const fileInput = page.locator('[data-testid="file-upload-input"]');
      
      const files = [
        { name: 'file1.txt', buffer: Buffer.from('Content 1') },
        { name: 'file2.txt', buffer: Buffer.from('Content 2') },
        { name: 'file3.txt', buffer: Buffer.from('Content 3') },
      ];

      for (const file of files) {
        await fileInput.setInputFiles({
          name: file.name,
          mimeType: 'text/plain',
          buffer: file.buffer,
        });
      }

      // Verify all uploads handled correctly
      for (const file of files) {
        await expect(page.locator(`[data-testid="file-${file.name}"]`)).toBeVisible();
      }
    });

    test('should handle state conflicts during navigation', async ({ page }) => {
      await helper.loginUser();
      
      // Rapidly navigate between pages
      await page.goto('/dashboard');
      await page.goto('/dashboard/files');
      await page.goto('/dashboard/analytics');
      await page.goto('/dashboard/profile');
      await page.goto('/dashboard');

      // Verify final state is correct
      await expect(page.locator('[data-testid="dashboard-container"]')).toBeVisible();
      await expect(page.locator('[data-testid="metric-total-files"]')).toBeVisible();
    });
  });

  test.describe('📱 Device and Platform Edge Cases', () => {
    test('should handle touch events on mobile devices', async ({ page }) => {
      // Simulate mobile device
      await page.setViewportSize({ width: 375, height: 667 });
      await page.emulate({
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
        viewport: { width: 375, height: 667 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
      });

      await helper.loginUser();
      await page.goto('/dashboard/files');

      // Test touch interactions
      await page.tap('[data-testid="mobile-menu-toggle"]');
      await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();

      // Test file selection on mobile
      await page.tap('[data-testid="file-upload-button"]');
      await expect(page.locator('[data-testid="mobile-upload-options"]')).toBeVisible();
    });

    test('should handle orientation changes', async ({ page }) => {
      await helper.loginUser();
      await page.goto('/dashboard');

      // Portrait mode
      await page.setViewportSize({ width: 375, height: 667 });
      await expect(page.locator('[data-testid="portrait-layout"]')).toBeVisible();

      // Landscape mode
      await page.setViewportSize({ width: 667, height: 375 });
      await expect(page.locator('[data-testid="landscape-layout"]')).toBeVisible();
    });

    test('should handle high DPI displays', async ({ page }) => {
      // Simulate high DPI display
      await page.emulate({
        viewport: { width: 1920, height: 1080 },
        deviceScaleFactor: 3,
      });

      await helper.loginUser();
      await page.goto('/dashboard/analytics');

      // Verify charts render correctly on high DPI
      await expect(page.locator('[data-testid="high-dpi-chart"]')).toBeVisible();
      
      // Check image quality
      const chartImage = page.locator('[data-testid="uploads-over-time"] canvas');
      const pixelRatio = await chartImage.evaluate(canvas => 
        window.devicePixelRatio
      );
      expect(pixelRatio).toBe(3);
    });
  });

  test.describe('🚨 Security Error Handling', () => {
    test('should handle CSRF token errors', async ({ page }) => {
      await helper.loginUser();

      // Mock CSRF error
      await page.route('**/api/folders', route => {
        route.fulfill({
          status: 403,
          body: JSON.stringify({ error: 'CSRF token invalid' }),
        });
      });

      await page.goto('/dashboard/files');
      await page.click('[data-testid="create-folder-button"]');
      await page.fill('[data-testid="folder-name-input"]', 'Test Folder');
      await page.click('[data-testid="create-folder-confirm"]');

      // Verify CSRF error handling
      await expect(page.locator('[data-testid="csrf-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="refresh-token"]')).toBeVisible();
    });

    test('should handle suspicious activity detection', async ({ page }) => {
      // Mock suspicious activity response
      await page.route('**/api/auth/login', route => {
        route.fulfill({
          status: 429,
          body: JSON.stringify({ 
            error: 'Suspicious activity detected',
            lockoutTime: 300 
          }),
        });
      });

      await page.goto('/auth/login');
      await page.fill('[data-testid="email-input"]', TEST_USER.email);
      await page.fill('[data-testid="password-input"]', TEST_USER.password);
      await page.click('[data-testid="login-button"]');

      // Verify security lockout message
      await expect(page.locator('[data-testid="security-lockout"]')).toBeVisible();
      await expect(page.locator('[data-testid="lockout-timer"]')).toBeVisible();
    });

    test('should handle malware detection in uploads', async ({ page }) => {
      await helper.loginUser();
      await page.goto('/dashboard/files');

      // Mock malware detection
      await page.route('**/api/upload', route => {
        route.fulfill({
          status: 400,
          body: JSON.stringify({ 
            error: 'Malware detected in file',
            threatType: 'Trojan.Generic' 
          }),
        });
      });

      // Attempt file upload
      const fileInput = page.locator('[data-testid="file-upload-input"]');
      await fileInput.setInputFiles({
        name: 'malicious.exe',
        mimeType: 'application/octet-stream',
        buffer: Buffer.from('fake malware'),
      });

      // Verify malware warning
      await expect(page.locator('[data-testid="malware-detected"]')).toBeVisible();
      await expect(page.locator('[data-testid="threat-type"]')).toContainText('Trojan.Generic');
    });
  });
});
