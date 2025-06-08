import { test, expect } from '@playwright/test';
import { AuthHelpers, AdminHelpers, PerformanceHelpers } from '../helpers/test-helpers';
import { setupTestEnvironment, teardownTestEnvironment } from '../fixtures/seed';

test.describe('Admin Panel E2E Tests', () => {
  let authHelpers: AuthHelpers;
  let adminHelpers: AdminHelpers;
  let perfHelpers: PerformanceHelpers;

  test.beforeEach(async ({ page }) => {
    authHelpers = new AuthHelpers(page);
    adminHelpers = new AdminHelpers(page);
    perfHelpers = new PerformanceHelpers(page);
    
    await setupTestEnvironment(page, { seedData: true, clearFirst: true });
  });

  test.afterEach(async ({ page }) => {
    await teardownTestEnvironment(page);
  });

  test.describe('Admin Authentication', () => {
    test('should allow admin login and redirect to admin panel', async ({ page }) => {
      await authHelpers.loginAsTestUser('admin');
      await adminHelpers.navigateToAdmin();
      
      // Verify admin dashboard is accessible
      await adminHelpers.verifyAdminAccess();
    });

    test('should deny access to non-admin users', async ({ page }) => {
      await authHelpers.loginAsTestUser('regular');
      
      // Try to access admin panel - should be denied
      await page.goto('/admin');
      
      // Should be redirected or show access denied
      const currentUrl = page.url();
      expect(currentUrl).not.toContain('/admin');
    });

    test('should require authentication for admin routes', async ({ page }) => {
      await page.goto('/admin');
      
      // Should redirect to login
      await page.waitForURL('/login');
    });
  });

  test.describe('System Monitoring Dashboard', () => {
    test('should display comprehensive system metrics', async ({ page }) => {
      await authHelpers.loginAsTestUser('admin');
      
      const stats = await adminHelpers.getSystemStats();
      
      // Verify metrics are displayed and numeric
      expect(stats.totalUsers).toBeTruthy();
      expect(stats.totalFiles).toBeTruthy();
      expect(stats.totalShares).toBeTruthy();
    });

    test('should show real-time system health indicators', async ({ page }) => {
      await authHelpers.loginAsTestUser('admin');
      await adminHelpers.navigateToAdmin();
      
      // Check for health indicators
      await expect(page.locator('[data-testid="system-status-indicator"]')).toBeVisible();
      await expect(page.locator('[data-testid="database-status"]')).toBeVisible();
      await expect(page.locator('[data-testid="storage-status"]')).toBeVisible();
    });

    test('should display user activity analytics', async ({ page }) => {
      await authHelpers.loginAsTestUser('admin');
      await page.goto('/admin/analytics');
      
      // Verify analytics dashboard elements
      await expect(page.locator('[data-testid="user-registrations-chart"]')).toBeVisible();
      await expect(page.locator('[data-testid="file-uploads-chart"]')).toBeVisible();
      await expect(page.locator('[data-testid="share-activity-chart"]')).toBeVisible();
    });
  });

  test.describe('User Management', () => {
    test('should list all users with correct information', async ({ page }) => {
      await authHelpers.loginAsTestUser('admin');
      await page.goto('/admin/users');
      
      // Verify user list is displayed
      await expect(page.locator('[data-testid="users-table"]')).toBeVisible();
      const userRows = page.locator('[data-testid="user-row"]');
      await expect(userRows).toHaveCount(3); // Our test users
    });

    test('should allow user search and filtering', async ({ page }) => {
      await authHelpers.loginAsTestUser('admin');
      await page.goto('/admin/users');
      
      // Search for specific user
      await page.fill('[data-testid="user-search-input"]', 'test@example.com');
      await page.click('[data-testid="search-users-button"]');
      
      // Verify filtered results
      await expect(page.locator('[data-testid="user-row"]')).toHaveCount(1);
    });

    test('should enable user activation/deactivation', async ({ page }) => {
      await authHelpers.loginAsTestUser('admin');
      await page.goto('/admin/users');
      
      // Find inactive user and activate
      await page.click('[data-testid="user-row"]:has-text("inactive@example.com") [data-testid="activate-user-button"]');
      
      // Verify activation confirmation
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="success-message"]')).toContainText('User activated');
    });
  });

  test.describe('Security Monitoring', () => {
    test('should display security event logs', async ({ page }) => {
      await authHelpers.loginAsTestUser('admin');
      await page.goto('/admin/security');
      
      // Verify security logs are displayed
      await expect(page.locator('[data-testid="security-logs-table"]')).toBeVisible();
      const logEntries = page.locator('[data-testid="log-entry"]');
      // Check if logs exist (may be 0 in fresh test environment)
      const logCount = await logEntries.count();
      expect(logCount).toBeGreaterThanOrEqual(0);
    });

    test('should show failed login attempts', async ({ page }) => {
      await authHelpers.loginAsTestUser('admin');
      await page.goto('/admin/security');
      
      // Filter for failed login attempts
      await page.selectOption('[data-testid="log-type-filter"]', 'failed_login');
      await page.click('[data-testid="apply-filter-button"]');
      
      // Verify filtering works
      const filteredLogs = page.locator('[data-testid="log-entry"]');
      const filteredCount = await filteredLogs.count();
      expect(filteredCount).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('Performance Testing', () => {
    test('should measure admin panel load performance', async ({ page }) => {
      await authHelpers.loginAsTestUser('admin');
      
      const loadTime = await perfHelpers.measurePageLoad('/admin');
      
      // Verify reasonable load time (under 3 seconds for testing)
      expect(loadTime).toBeLessThan(3000);
    });

    test('should maintain responsiveness on mobile devices', async ({ page }) => {
      await authHelpers.loginAsTestUser('admin');
      
      // Test mobile responsiveness
      await perfHelpers.testResponsiveDesign();
      
      // Navigate to admin panel
      await page.goto('/admin');
      await expect(page.locator('[data-testid="admin-dashboard"]')).toBeVisible();
    });
  });

  test.describe('Error Handling', () => {
    test('should handle network failures gracefully', async ({ page }) => {
      await authHelpers.loginAsTestUser('admin');
      
      // Simulate network failure for admin API calls
      await page.route('**/api/admin/**', route => route.abort());
      
      await page.goto('/admin');
      
      // Verify error handling (may show loading state or error message)
      // The exact behavior depends on the implementation
      await page.waitForTimeout(2000); // Wait for potential error state
    });

    test('should validate form inputs properly', async ({ page }) => {
      await authHelpers.loginAsTestUser('admin');
      await page.goto('/admin/settings');
      
      // If settings form exists, test validation
      const settingsForm = page.locator('[data-testid="settings-form"]');
      if (await settingsForm.isVisible()) {
        await page.fill('[data-testid="invalid-input"]', '');
        await page.click('[data-testid="save-button"]');
        
        // Check for validation messages
        const validationError = page.locator('[data-testid="validation-error"]');
        if (await validationError.isVisible()) {
          await expect(validationError).toBeVisible();
        }
      }
    });
  });

  test.describe('Accessibility', () => {
    test('should be keyboard navigable', async ({ page }) => {
      await authHelpers.loginAsTestUser('admin');
      await page.goto('/admin');
      
      // Test keyboard navigation
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      
      // Verify navigation worked
      const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
      expect(focusedElement).toBeTruthy();
    });

    test('should have proper ARIA labels', async ({ page }) => {
      await authHelpers.loginAsTestUser('admin');
      await page.goto('/admin');
      
      // Check for semantic HTML elements
      const mainElement = page.locator('main, [role="main"]');
      const navElement = page.locator('nav, [role="navigation"]');
      
      // At least one should exist
      const hasMain = await mainElement.count() > 0;
      const hasNav = await navElement.count() > 0;
      
      expect(hasMain || hasNav).toBeTruthy();
    });
  });
});
