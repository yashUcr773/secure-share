import { test, expect } from '@playwright/test';
import { TestHelpers, CustomAssertions } from '../helpers/test-helpers';

/**
 * Dashboard E2E Tests
 * Tests complete dashboard functionality, navigation, and user interactions
 */
test.describe('Dashboard Functionality', () => {
  let helpers: TestHelpers;
  let assertions: CustomAssertions;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    assertions = new CustomAssertions(page);
    
    // Login before each test
    await helpers.login();
  });

  test.describe('Dashboard Navigation', () => {
    test('should display dashboard overview correctly', async ({ page }) => {
      await helpers.navigateAndWait('/dashboard');
      
      // Check main dashboard elements
      await assertions.expectElementToBeVisible('[data-testid="dashboard-header"]');
      await assertions.expectElementToBeVisible('[data-testid="file-stats"]');
      await assertions.expectElementToBeVisible('[data-testid="recent-files"]');
      await assertions.expectElementToBeVisible('[data-testid="storage-usage"]');
      
      // Verify navigation menu
      await assertions.expectElementToBeVisible('[data-testid="nav-files"]');
      await assertions.expectElementToBeVisible('[data-testid="nav-shared"]');
      await assertions.expectElementToBeVisible('[data-testid="nav-settings"]');
      
      // Check user profile section
      await assertions.expectElementToBeVisible('[data-testid="user-profile"]');
      await assertions.expectElementToBeVisible('[data-testid="user-menu"]');
    });

    test('should navigate between dashboard sections', async ({ page }) => {
      await helpers.navigateAndWait('/dashboard');
      
      // Navigate to Files section
      await page.click('[data-testid="nav-files"]');
      await helpers.waitForUrl('/dashboard/files');
      await assertions.expectElementToBeVisible('[data-testid="files-section"]');
      
      // Navigate to Shared section
      await page.click('[data-testid="nav-shared"]');
      await helpers.waitForUrl('/dashboard/shared');
      await assertions.expectElementToBeVisible('[data-testid="shared-section"]');
      
      // Navigate to Settings section
      await page.click('[data-testid="nav-settings"]');
      await helpers.waitForUrl('/dashboard/settings');
      await assertions.expectElementToBeVisible('[data-testid="settings-section"]');
      
      // Navigate back to main dashboard
      await page.click('[data-testid="nav-dashboard"]');
      await helpers.waitForUrl('/dashboard');
      await assertions.expectElementToBeVisible('[data-testid="dashboard-overview"]');
    });

    test('should handle responsive navigation on mobile', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await helpers.navigateAndWait('/dashboard');
      
      // Check mobile navigation elements
      await assertions.expectElementToBeVisible('[data-testid="mobile-menu-toggle"]');
      
      // Toggle mobile menu
      await page.click('[data-testid="mobile-menu-toggle"]');
      await assertions.expectElementToBeVisible('[data-testid="mobile-nav-menu"]');
      
      // Navigate using mobile menu
      await page.click('[data-testid="mobile-nav-files"]');
      await helpers.waitForUrl('/dashboard/files');
      
      // Menu should close after navigation
      await assertions.expectElementToBeHidden('[data-testid="mobile-nav-menu"]');
    });
  });

  test.describe('Dashboard Analytics', () => {
    test('should display file statistics correctly', async ({ page }) => {
      await helpers.navigateAndWait('/dashboard');
      
      // Check file statistics
      const totalFiles = page.locator('[data-testid="total-files-count"]');
      const totalSize = page.locator('[data-testid="total-size"]');
      const sharedFiles = page.locator('[data-testid="shared-files-count"]');
      
      await expect(totalFiles).toBeVisible();
      await expect(totalSize).toBeVisible();
      await expect(sharedFiles).toBeVisible();
      
      // Verify numeric values
      const filesCount = await totalFiles.textContent();
      const sizeText = await totalSize.textContent();
      const sharedCount = await sharedFiles.textContent();
      
      expect(filesCount).toMatch(/^\d+$/);
      expect(sizeText).toMatch(/^\d+(\.\d+)?\s*(B|KB|MB|GB)$/);
      expect(sharedCount).toMatch(/^\d+$/);
    });

    test('should display storage usage visualization', async ({ page }) => {
      await helpers.navigateAndWait('/dashboard');
      
      // Check storage usage components
      await assertions.expectElementToBeVisible('[data-testid="storage-chart"]');
      await assertions.expectElementToBeVisible('[data-testid="storage-progress"]');
      await assertions.expectElementToBeVisible('[data-testid="storage-breakdown"]');
      
      // Verify storage breakdown by file type
      const fileTypeBreakdown = page.locator('[data-testid="file-type-breakdown"]');
      await expect(fileTypeBreakdown).toBeVisible();
      
      // Check for common file types
      await assertions.expectElementToBeVisible('[data-testid="pdf-files-count"]');
      await assertions.expectElementToBeVisible('[data-testid="image-files-count"]');
      await assertions.expectElementToBeVisible('[data-testid="document-files-count"]');
    });

    test('should show recent activity timeline', async ({ page }) => {
      await helpers.navigateAndWait('/dashboard');
      
      // Check recent activity section
      await assertions.expectElementToBeVisible('[data-testid="recent-activity"]');
      await assertions.expectElementToBeVisible('[data-testid="activity-timeline"]');
      
      // Verify activity items
      const activityItems = page.locator('[data-testid="activity-item"]');
      await expect(activityItems.first()).toBeVisible();
      
      // Check activity item structure
      const firstItem = activityItems.first();
      await expect(firstItem.locator('[data-testid="activity-icon"]')).toBeVisible();
      await expect(firstItem.locator('[data-testid="activity-description"]')).toBeVisible();
      await expect(firstItem.locator('[data-testid="activity-timestamp"]')).toBeVisible();
    });
  });

  test.describe('Quick Actions', () => {
    test('should provide quick upload functionality', async ({ page }) => {
      await helpers.navigateAndWait('/dashboard');
      
      // Check quick upload section
      await assertions.expectElementToBeVisible('[data-testid="quick-upload"]');
      await assertions.expectElementToBeVisible('[data-testid="upload-dropzone"]');
      
      // Test drag and drop area
      const dropzone = page.locator('[data-testid="upload-dropzone"]');
      await expect(dropzone).toContainText('Drag files here or click to upload');
      
      // Test click to upload
      await dropzone.click();
      await assertions.expectElementToBeVisible('[data-testid="file-input"]');
    });

    test('should provide quick folder creation', async ({ page }) => {
      await helpers.navigateAndWait('/dashboard');
      
      // Check quick actions
      await assertions.expectElementToBeVisible('[data-testid="quick-actions"]');
      await page.click('[data-testid="create-folder-quick"]');
      
      // Verify folder creation modal
      await assertions.expectElementToBeVisible('[data-testid="create-folder-modal"]');
      await assertions.expectElementToBeVisible('[data-testid="folder-name-input"]');
      
      // Create folder
      await page.fill('[data-testid="folder-name-input"]', 'Quick Test Folder');
      await page.click('[data-testid="create-folder-confirm"]');
      
      // Verify success
      await assertions.expectToast('Folder created successfully');
    });

    test('should provide search functionality', async ({ page }) => {
      await helpers.navigateAndWait('/dashboard');
      
      // Check search functionality
      await assertions.expectElementToBeVisible('[data-testid="search-input"]');
      
      // Perform search
      await page.fill('[data-testid="search-input"]', 'test');
      await page.press('[data-testid="search-input"]', 'Enter');
      
      // Verify search results
      await helpers.waitForElement('[data-testid="search-results"]');
      await assertions.expectElementToBeVisible('[data-testid="search-results-count"]');
    });
  });

  test.describe('File Management Integration', () => {
    test('should display recent files correctly', async ({ page }) => {
      // Upload a test file first
      const testFilePath = await helpers.createTestFile('Recent file content', 'recent-test.pdf');
      await helpers.uploadFile(testFilePath, 'recent-test.pdf');
      
      await helpers.navigateAndWait('/dashboard');
      
      // Check recent files section
      await assertions.expectElementToBeVisible('[data-testid="recent-files"]');
      
      const recentFilesList = page.locator('[data-testid="recent-files-list"]');
      await expect(recentFilesList).toBeVisible();
      
      // Verify the uploaded file appears in recent files
      const recentFile = recentFilesList.locator('[data-testid="recent-file-item"]').filter({ hasText: 'recent-test.pdf' });
      await expect(recentFile).toBeVisible();
      
      // Check file metadata
      await expect(recentFile.locator('[data-testid="file-name"]')).toBeVisible();
      await expect(recentFile.locator('[data-testid="file-size"]')).toBeVisible();
      await expect(recentFile.locator('[data-testid="file-date"]')).toBeVisible();
    });

    test('should handle file operations from dashboard', async ({ page }) => {
      // Upload a test file
      const testFilePath = await helpers.createTestFile('Dashboard operations test', 'dashboard-ops.pdf');
      await helpers.uploadFile(testFilePath, 'dashboard-ops.pdf');
      
      await helpers.navigateAndWait('/dashboard');
      
      // Find the file in recent files
      const fileItem = page.locator('[data-testid="recent-file-item"]').filter({ hasText: 'dashboard-ops.pdf' });
      await expect(fileItem).toBeVisible();
      
      // Test quick actions on file
      await fileItem.hover();
      await assertions.expectElementToBeVisible('[data-testid="file-quick-actions"]');
      
      // Test download
      await fileItem.locator('[data-testid="quick-download"]').click();
      const download = await assertions.expectFileDownload('dashboard-ops.pdf');
      expect(download).toBeTruthy();
      
      // Test share
      await fileItem.locator('[data-testid="quick-share"]').click();
      await assertions.expectElementToBeVisible('[data-testid="share-modal"]');
      await page.click('[data-testid="close-share-modal"]');
    });
  });

  test.describe('Settings Integration', () => {
    test('should allow access to user settings', async ({ page }) => {
      await helpers.navigateAndWait('/dashboard');
      
      // Click user menu
      await page.click('[data-testid="user-menu"]');
      await assertions.expectElementToBeVisible('[data-testid="user-dropdown"]');
      
      // Navigate to settings
      await page.click('[data-testid="settings-link"]');
      await helpers.waitForUrl('/dashboard/settings');
      
      // Verify settings page
      await assertions.expectElementToBeVisible('[data-testid="settings-header"]');
      await assertions.expectElementToBeVisible('[data-testid="user-profile-settings"]');
      await assertions.expectElementToBeVisible('[data-testid="security-settings"]');
      await assertions.expectElementToBeVisible('[data-testid="notification-settings"]');
    });

    test('should handle logout functionality', async ({ page }) => {
      await helpers.navigateAndWait('/dashboard');
      
      // Click user menu
      await page.click('[data-testid="user-menu"]');
      await assertions.expectElementToBeVisible('[data-testid="user-dropdown"]');
      
      // Click logout
      await page.click('[data-testid="logout-button"]');
      
      // Should redirect to login page
      await helpers.waitForUrl('/login');
      await assertions.expectElementToBeVisible('[data-testid="login-form"]');
      
      // Verify session is cleared
      await helpers.navigateAndWait('/dashboard');
      await helpers.waitForUrl('/login'); // Should redirect back to login
    });
  });

  test.describe('Dashboard Performance', () => {
    test('should load dashboard within acceptable time', async ({ page }) => {
      const startTime = Date.now();
      
      await helpers.navigateAndWait('/dashboard');
      
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(3000); // Should load within 3 seconds
      
      // Check that all critical elements are loaded
      await assertions.expectElementToBeVisible('[data-testid="dashboard-header"]');
      await assertions.expectElementToBeVisible('[data-testid="file-stats"]');
      await assertions.expectElementToBeVisible('[data-testid="recent-files"]');
    });

    test('should handle large datasets efficiently', async ({ page }) => {
      // Mock large dataset
      await helpers.mockApiResponse('/api/dashboard/stats', {
        totalFiles: 10000,
        totalSize: 1073741824, // 1GB
        sharedFiles: 500,
        storageUsed: 80, // 80%
      });
      
      await helpers.navigateAndWait('/dashboard');
      
      // Verify statistics display correctly
      const totalFiles = await page.locator('[data-testid="total-files-count"]').textContent();
      expect(totalFiles).toBe('10,000');
      
      const storageUsed = page.locator('[data-testid="storage-progress"]');
      await expect(storageUsed).toHaveAttribute('aria-valuenow', '80');
    });

    test('should be responsive across different screen sizes', async ({ page }) => {
      const viewports = [
        { width: 1920, height: 1080, name: 'Desktop Large' },
        { width: 1366, height: 768, name: 'Desktop Medium' },
        { width: 768, height: 1024, name: 'Tablet' },
        { width: 375, height: 667, name: 'Mobile' },
      ];
      
      for (const viewport of viewports) {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await helpers.navigateAndWait('/dashboard');
        
        // Check critical elements are visible and properly arranged
        await assertions.expectElementToBeVisible('[data-testid="dashboard-header"]');
        
        if (viewport.width >= 768) {
          // Desktop/tablet layout
          await assertions.expectElementToBeVisible('[data-testid="sidebar"]');
          await assertions.expectElementToBeVisible('[data-testid="main-content"]');
        } else {
          // Mobile layout
          await assertions.expectElementToBeVisible('[data-testid="mobile-menu-toggle"]');
        }
        
        // Test navigation works
        await page.click('[data-testid="nav-files"]');
        await helpers.waitForUrl('/dashboard/files');
      }
    });
  });

  test.describe('Error Handling', () => {
    test('should handle API errors gracefully', async ({ page }) => {
      // Mock API error
      await helpers.mockApiResponse('/api/dashboard/stats', 
        { error: 'Internal server error' }, 500
      );
      
      await helpers.navigateAndWait('/dashboard');
      
      // Should show error message
      await assertions.expectElementToBeVisible('[data-testid="dashboard-error"]');
      await expect(page.locator('[data-testid="dashboard-error"]'))
        .toContainText('Unable to load dashboard data');
      
      // Should provide retry option
      await assertions.expectElementToBeVisible('[data-testid="retry-button"]');
    });

    test('should handle network connectivity issues', async ({ page }) => {
      await helpers.navigateAndWait('/dashboard');
      
      // Simulate network offline
      await page.context().setOffline(true);
      
      // Try to refresh
      await page.reload();
      
      // Should show offline message
      await assertions.expectElementToBeVisible('[data-testid="offline-message"]');
      
      // Restore connectivity
      await page.context().setOffline(false);
      
      // Should recover automatically
      await helpers.waitForElement('[data-testid="dashboard-header"]');
    });

    test('should handle unauthorized access', async ({ page }) => {
      await helpers.navigateAndWait('/dashboard');
      
      // Mock unauthorized response
      await helpers.mockApiResponse('/api/dashboard/stats', 
        { error: 'Unauthorized' }, 401
      );
      
      // Refresh page to trigger API call
      await page.reload();
      
      // Should redirect to login
      await helpers.waitForUrl('/login');
      await assertions.expectElementToBeVisible('[data-testid="login-form"]');
    });
  });

  test.describe('Accessibility', () => {
    test('should meet accessibility standards', async ({ page }) => {
      await helpers.navigateAndWait('/dashboard');
      
      // Check for proper ARIA labels
      const navigation = page.locator('[data-testid="main-navigation"]');
      await expect(navigation).toHaveAttribute('role', 'navigation');
      
      // Check for keyboard navigation
      await page.keyboard.press('Tab');
      const focusedElement = await page.locator(':focus').first();
      await expect(focusedElement).toBeVisible();
      
      // Check color contrast and text readability
      const header = page.locator('[data-testid="dashboard-header"]');
      await expect(header).toHaveCSS('color', /rgb\(\d+,\s*\d+,\s*\d+\)/);
    });

    test('should support screen readers', async ({ page }) => {
      await helpers.navigateAndWait('/dashboard');
      
      // Check for proper heading hierarchy
      const h1 = page.locator('h1');
      await expect(h1).toBeVisible();
      
      // Check for alt texts on images
      const images = page.locator('img');
      const imageCount = await images.count();
      
      for (let i = 0; i < imageCount; i++) {
        const img = images.nth(i);
        const altText = await img.getAttribute('alt');
        expect(altText).toBeTruthy();
      }
      
      // Check for proper form labels
      const inputs = page.locator('input');
      const inputCount = await inputs.count();
      
      for (let i = 0; i < inputCount; i++) {
        const input = inputs.nth(i);
        const label = await input.getAttribute('aria-label') || 
                     await page.locator(`label[for="${await input.getAttribute('id')}"]`).textContent();
        expect(label).toBeTruthy();
      }
    });
  });
});
