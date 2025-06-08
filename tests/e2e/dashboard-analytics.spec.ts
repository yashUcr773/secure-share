// End-to-end tests for dashboard and analytics features
import { test, expect, Page } from '@playwright/test';

const TEST_USER = {
  email: 'dashboard@example.com',
  password: 'SecurePassword123!',
  name: 'Dashboard Test User',
};

class DashboardHelper {
  constructor(private page: Page) {}

  async loginUser() {
    await this.page.goto('/auth/login');
    await this.page.fill('[data-testid="email-input"]', TEST_USER.email);
    await this.page.fill('[data-testid="password-input"]', TEST_USER.password);
    await this.page.click('[data-testid="login-button"]');
    await this.page.waitForURL('/dashboard');
  }

  async navigateToDashboard() {
    await this.page.goto('/dashboard');
    await this.page.waitForSelector('[data-testid="dashboard-container"]');
  }

  async navigateToAnalytics() {
    await this.page.click('[data-testid="analytics-nav"]');
    await this.page.waitForSelector('[data-testid="analytics-container"]');
  }

  async waitForChartLoad(chartId: string) {
    await this.page.waitForSelector(`[data-testid="${chartId}"]`);
    await this.page.waitForFunction(
      (id) => document.querySelector(`[data-testid="${id}"] canvas`) !== null,
      chartId
    );
  }

  async selectDateRange(startDate: string, endDate: string) {
    await this.page.click('[data-testid="date-range-picker"]');
    await this.page.fill('[data-testid="start-date"]', startDate);
    await this.page.fill('[data-testid="end-date"]', endDate);
    await this.page.click('[data-testid="apply-date-range"]');
  }

  async exportAnalytics(format: 'csv' | 'pdf' | 'excel') {
    await this.page.click('[data-testid="export-dropdown"]');
    await this.page.click(`[data-testid="export-${format}"]`);
    return await this.page.waitForEvent('download');
  }

  async getMetricValue(metricId: string): Promise<string> {
    return await this.page.locator(`[data-testid="metric-${metricId}"]`).textContent() || '';
  }

  async verifyRealtimeUpdate(elementId: string, oldValue: string) {
    await this.page.waitForFunction(
      (id, old) => {
        const element = document.querySelector(`[data-testid="${id}"]`);
        return element && element.textContent !== old;
      },
      elementId,
      oldValue
    );
  }
}

test.describe('Dashboard and Analytics E2E Tests', () => {
  let helper: DashboardHelper;

  test.beforeEach(async ({ page }) => {
    helper = new DashboardHelper(page);
    await helper.loginUser();
  });

  test.describe('📊 Dashboard Overview', () => {
    test('should display main dashboard metrics', async ({ page }) => {
      await helper.navigateToDashboard();

      // Verify key metrics are displayed
      await expect(page.locator('[data-testid="metric-total-files"]')).toBeVisible();
      await expect(page.locator('[data-testid="metric-storage-used"]')).toBeVisible();
      await expect(page.locator('[data-testid="metric-total-shares"]')).toBeVisible();
      await expect(page.locator('[data-testid="metric-recent-activity"]')).toBeVisible();

      // Verify metrics have values
      const totalFiles = await helper.getMetricValue('total-files');
      const storageUsed = await helper.getMetricValue('storage-used');
      
      expect(totalFiles).toMatch(/^\d+/);
      expect(storageUsed).toMatch(/^\d+(\.\d+)?\s*(B|KB|MB|GB)/);
    });

    test('should show recent activity feed', async ({ page }) => {
      await helper.navigateToDashboard();

      // Verify activity feed is present
      await expect(page.locator('[data-testid="activity-feed"]')).toBeVisible();
      
      // Check for activity items
      const activityItems = page.locator('[data-testid^="activity-item-"]');
      const count = await activityItems.count();
      expect(count).toBeGreaterThan(0);

      // Verify activity item structure
      const firstActivity = activityItems.first();
      await expect(firstActivity.locator('[data-testid="activity-timestamp"]')).toBeVisible();
      await expect(firstActivity.locator('[data-testid="activity-description"]')).toBeVisible();
    });

    test('should display storage usage breakdown', async ({ page }) => {
      await helper.navigateToDashboard();

      // Verify storage chart is displayed
      await helper.waitForChartLoad('storage-usage-chart');
      
      // Verify storage breakdown by file type
      await expect(page.locator('[data-testid="storage-breakdown"]')).toBeVisible();
      await expect(page.locator('[data-testid="storage-documents"]')).toBeVisible();
      await expect(page.locator('[data-testid="storage-images"]')).toBeVisible();
      await expect(page.locator('[data-testid="storage-videos"]')).toBeVisible();
      await expect(page.locator('[data-testid="storage-other"]')).toBeVisible();
    });

    test('should show quick actions panel', async ({ page }) => {
      await helper.navigateToDashboard();

      // Verify quick actions are available
      await expect(page.locator('[data-testid="quick-actions"]')).toBeVisible();
      await expect(page.locator('[data-testid="quick-upload"]')).toBeVisible();
      await expect(page.locator('[data-testid="quick-create-folder"]')).toBeVisible();
      await expect(page.locator('[data-testid="quick-share-link"]')).toBeVisible();

      // Test quick upload action
      await page.click('[data-testid="quick-upload"]');
      await expect(page.locator('[data-testid="upload-modal"]')).toBeVisible();
    });

    test('should display recent files widget', async ({ page }) => {
      await helper.navigateToDashboard();

      // Verify recent files widget
      await expect(page.locator('[data-testid="recent-files"]')).toBeVisible();
      
      const recentFiles = page.locator('[data-testid^="recent-file-"]');
      const fileCount = await recentFiles.count();
      
      if (fileCount > 0) {
        // Verify file structure
        const firstFile = recentFiles.first();
        await expect(firstFile.locator('[data-testid="file-name"]')).toBeVisible();
        await expect(firstFile.locator('[data-testid="file-modified"]')).toBeVisible();
        await expect(firstFile.locator('[data-testid="file-size"]')).toBeVisible();
      }
    });
  });

  test.describe('📈 Analytics Dashboard', () => {
    test('should display usage analytics over time', async ({ page }) => {
      await helper.navigateToAnalytics();

      // Verify main analytics charts
      await helper.waitForChartLoad('uploads-over-time');
      await helper.waitForChartLoad('downloads-over-time');
      await helper.waitForChartLoad('storage-growth');

      // Verify chart legends and data
      await expect(page.locator('[data-testid="uploads-legend"]')).toBeVisible();
      await expect(page.locator('[data-testid="downloads-legend"]')).toBeVisible();
      await expect(page.locator('[data-testid="storage-legend"]')).toBeVisible();
    });

    test('should filter analytics by date range', async ({ page }) => {
      await helper.navigateToAnalytics();

      // Get initial metric values
      const initialUploads = await helper.getMetricValue('total-uploads');
      
      // Apply date filter for last 7 days
      await helper.selectDateRange('2024-01-01', '2024-01-07');
      
      // Wait for charts to update
      await helper.waitForChartLoad('uploads-over-time');
      
      // Verify metrics updated
      const filteredUploads = await helper.getMetricValue('total-uploads');
      expect(filteredUploads).not.toBe(initialUploads);
    });

    test('should show file type distribution', async ({ page }) => {
      await helper.navigateToAnalytics();

      // Verify file type chart
      await helper.waitForChartLoad('file-type-distribution');
      
      // Check breakdown statistics
      await expect(page.locator('[data-testid="filetype-documents"]')).toBeVisible();
      await expect(page.locator('[data-testid="filetype-images"]')).toBeVisible();
      await expect(page.locator('[data-testid="filetype-videos"]')).toBeVisible();
      await expect(page.locator('[data-testid="filetype-other"]')).toBeVisible();

      // Verify percentages add up
      const documentPercent = parseFloat(await page.locator('[data-testid="filetype-documents-percent"]').textContent() || '0');
      const imagePercent = parseFloat(await page.locator('[data-testid="filetype-images-percent"]').textContent() || '0');
      const videoPercent = parseFloat(await page.locator('[data-testid="filetype-videos-percent"]').textContent() || '0');
      const otherPercent = parseFloat(await page.locator('[data-testid="filetype-other-percent"]').textContent() || '0');
      
      const total = documentPercent + imagePercent + videoPercent + otherPercent;
      expect(total).toBeCloseTo(100, 1);
    });

    test('should display user activity heatmap', async ({ page }) => {
      await helper.navigateToAnalytics();

      // Navigate to activity analytics
      await page.click('[data-testid="activity-analytics-tab"]');
      
      // Verify heatmap is displayed
      await expect(page.locator('[data-testid="activity-heatmap"]')).toBeVisible();
      
      // Check heatmap controls
      await expect(page.locator('[data-testid="heatmap-hourly"]')).toBeVisible();
      await expect(page.locator('[data-testid="heatmap-daily"]')).toBeVisible();
      await expect(page.locator('[data-testid="heatmap-weekly"]')).toBeVisible();

      // Test switching heatmap views
      await page.click('[data-testid="heatmap-daily"]');
      await expect(page.locator('[data-testid="daily-heatmap"]')).toBeVisible();
    });

    test('should show sharing analytics', async ({ page }) => {
      await helper.navigateToAnalytics();

      // Navigate to sharing analytics
      await page.click('[data-testid="sharing-analytics-tab"]');
      
      // Verify sharing metrics
      await expect(page.locator('[data-testid="metric-total-shares"]')).toBeVisible();
      await expect(page.locator('[data-testid="metric-public-links"]')).toBeVisible();
      await expect(page.locator('[data-testid="metric-shared-users"]')).toBeVisible();

      // Verify sharing chart
      await helper.waitForChartLoad('sharing-over-time');
      
      // Check top shared files
      await expect(page.locator('[data-testid="top-shared-files"]')).toBeVisible();
    });

    test('should export analytics reports', async ({ page }) => {
      await helper.navigateToAnalytics();

      // Test CSV export
      const csvDownload = await helper.exportAnalytics('csv');
      expect(csvDownload.suggestedFilename()).toContain('.csv');

      // Test PDF export
      const pdfDownload = await helper.exportAnalytics('pdf');
      expect(pdfDownload.suggestedFilename()).toContain('.pdf');

      // Test Excel export
      const excelDownload = await helper.exportAnalytics('excel');
      expect(excelDownload.suggestedFilename()).toMatch(/\.(xlsx|xls)$/);
    });
  });

  test.describe('🔄 Real-time Updates', () => {
    test('should update metrics in real-time', async ({ page }) => {
      await helper.navigateToDashboard();

      // Get initial total files count
      const initialFiles = await helper.getMetricValue('total-files');
      
      // Simulate file upload via API or another tab
      await page.evaluate(() => {
        // Simulate websocket message for new file upload
        window.dispatchEvent(new CustomEvent('file-uploaded', {
          detail: { fileCount: 1 }
        }));
      });

      // Verify real-time update
      await helper.verifyRealtimeUpdate('metric-total-files', initialFiles);
    });

    test('should show live activity notifications', async ({ page }) => {
      await helper.navigateToDashboard();

      // Simulate real-time activity
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('new-activity', {
          detail: {
            type: 'file-shared',
            description: 'document.pdf was shared with user@example.com',
            timestamp: new Date().toISOString()
          }
        }));
      });

      // Verify activity appears in feed
      await expect(page.locator('[data-testid="activity-notification"]')).toBeVisible();
      await expect(page.locator('[data-testid="activity-notification"]')).toContainText('document.pdf was shared');
    });

    test('should handle real-time storage updates', async ({ page }) => {
      await helper.navigateToDashboard();

      const initialStorage = await helper.getMetricValue('storage-used');
      
      // Simulate storage change
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('storage-updated', {
          detail: { newSize: '150.5 MB' }
        }));
      });

      // Verify storage update
      await helper.verifyRealtimeUpdate('metric-storage-used', initialStorage);
    });
  });

  test.describe('📱 Responsive Design', () => {
    test('should adapt dashboard layout for mobile', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await helper.navigateToDashboard();

      // Verify mobile layout
      await expect(page.locator('[data-testid="mobile-menu-toggle"]')).toBeVisible();
      await expect(page.locator('[data-testid="desktop-sidebar"]')).not.toBeVisible();

      // Test mobile navigation
      await page.click('[data-testid="mobile-menu-toggle"]');
      await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
    });

    test('should adapt analytics charts for tablet', async ({ page }) => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });
      await helper.navigateToAnalytics();

      // Verify tablet layout
      await expect(page.locator('[data-testid="tablet-chart-grid"]')).toBeVisible();
      
      // Check chart responsiveness
      await helper.waitForChartLoad('uploads-over-time');
      const chartWidth = await page.locator('[data-testid="uploads-over-time"] canvas').evaluate(el => el.width);
      expect(chartWidth).toBeLessThan(768);
    });
  });

  test.describe('⚙️ Dashboard Customization', () => {
    test('should allow widget customization', async ({ page }) => {
      await helper.navigateToDashboard();

      // Enter customization mode
      await page.click('[data-testid="customize-dashboard"]');
      await expect(page.locator('[data-testid="customization-mode"]')).toBeVisible();

      // Hide a widget
      await page.click('[data-testid="hide-recent-files"]');
      await expect(page.locator('[data-testid="recent-files"]')).not.toBeVisible();

      // Save customization
      await page.click('[data-testid="save-customization"]');
      
      // Verify customization persisted
      await page.reload();
      await expect(page.locator('[data-testid="recent-files"]')).not.toBeVisible();
    });

    test('should allow dashboard theme customization', async ({ page }) => {
      await helper.navigateToDashboard();

      // Open theme settings
      await page.click('[data-testid="theme-settings"]');
      
      // Switch to dark theme
      await page.click('[data-testid="dark-theme"]');
      
      // Verify theme applied
      await expect(page.locator('body')).toHaveClass(/dark/);
      await expect(page.locator('[data-testid="dashboard-container"]')).toHaveClass(/dark/);
    });

    test('should save user preferences', async ({ page }) => {
      await helper.navigateToDashboard();

      // Change dashboard settings
      await page.click('[data-testid="dashboard-settings"]');
      await page.click('[data-testid="compact-view"]');
      await page.click('[data-testid="auto-refresh"]');
      await page.click('[data-testid="save-preferences"]');

      // Reload and verify settings persisted
      await page.reload();
      await page.click('[data-testid="dashboard-settings"]');
      
      await expect(page.locator('[data-testid="compact-view"]')).toBeChecked();
      await expect(page.locator('[data-testid="auto-refresh"]')).toBeChecked();
    });
  });

  test.describe('🔔 Notifications and Alerts', () => {
    test('should show storage limit warnings', async ({ page }) => {
      // Mock high storage usage
      await page.route('**/api/dashboard/analytics', route => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            storageUsed: '950MB',
            storageLimit: '1GB',
            storagePercentage: 95
          }),
        });
      });

      await helper.navigateToDashboard();

      // Verify storage warning
      await expect(page.locator('[data-testid="storage-warning"]')).toBeVisible();
      await expect(page.locator('[data-testid="storage-warning"]')).toContainText('95%');
    });

    test('should display security alerts', async ({ page }) => {
      // Mock security alert
      await page.route('**/api/dashboard/analytics', route => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            securityAlerts: [{
              id: 'alert-1',
              type: 'suspicious-login',
              message: 'Unusual login attempt detected',
              timestamp: new Date().toISOString()
            }]
          }),
        });
      });

      await helper.navigateToDashboard();

      // Verify security alert
      await expect(page.locator('[data-testid="security-alert"]')).toBeVisible();
      await expect(page.locator('[data-testid="security-alert"]')).toContainText('Unusual login attempt');
    });

    test('should handle notification preferences', async ({ page }) => {
      await helper.navigateToDashboard();

      // Open notification settings
      await page.click('[data-testid="notification-settings"]');
      
      // Toggle notification types
      await page.click('[data-testid="email-notifications"]');
      await page.click('[data-testid="push-notifications"]');
      await page.click('[data-testid="save-notification-preferences"]');

      // Verify settings saved
      await expect(page.locator('[data-testid="preferences-saved"]')).toBeVisible();
    });
  });

  test.describe('🎯 Performance and Loading', () => {
    test('should load dashboard efficiently', async ({ page }) => {
      const startTime = Date.now();
      
      await helper.navigateToDashboard();
      
      // Verify dashboard loads within reasonable time
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(3000); // 3 seconds max

      // Verify all critical elements loaded
      await expect(page.locator('[data-testid="metric-total-files"]')).toBeVisible();
      await expect(page.locator('[data-testid="activity-feed"]')).toBeVisible();
    });

    test('should handle large datasets in analytics', async ({ page }) => {
      // Mock large dataset
      await page.route('**/api/dashboard/analytics', route => {
        const largeData = {
          uploadsOverTime: Array.from({ length: 365 }, (_, i) => ({
            date: new Date(2024, 0, i + 1),
            uploads: Math.floor(Math.random() * 100)
          }))
        };
        
        route.fulfill({
          status: 200,
          body: JSON.stringify(largeData),
        });
      });

      await helper.navigateToAnalytics();
      
      // Verify chart loads with large dataset
      await helper.waitForChartLoad('uploads-over-time');
      await expect(page.locator('[data-testid="data-points-count"]')).toContainText('365');
    });

    test('should implement progressive loading', async ({ page }) => {
      await helper.navigateToDashboard();

      // Verify skeleton loaders appear first
      await expect(page.locator('[data-testid="skeleton-metrics"]')).toBeVisible();
      
      // Wait for content to load
      await expect(page.locator('[data-testid="skeleton-metrics"]')).not.toBeVisible();
      await expect(page.locator('[data-testid="metric-total-files"]')).toBeVisible();
    });
  });

  test.describe('🔍 Search and Filtering', () => {
    test('should search through activity feed', async ({ page }) => {
      await helper.navigateToDashboard();

      // Search activity feed
      await page.fill('[data-testid="activity-search"]', 'upload');
      
      // Verify filtered results
      const activityItems = page.locator('[data-testid^="activity-item-"]');
      const visibleItems = await activityItems.filter({ hasText: 'upload' }).count();
      
      expect(visibleItems).toBeGreaterThan(0);
    });

    test('should filter analytics by file type', async ({ page }) => {
      await helper.navigateToAnalytics();

      // Apply file type filter
      await page.click('[data-testid="filter-documents"]');
      
      // Verify chart updates
      await helper.waitForChartLoad('uploads-over-time');
      
      // Check filter indication
      await expect(page.locator('[data-testid="active-filter-documents"]')).toBeVisible();
    });
  });
});
