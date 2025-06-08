import { test, expect } from '@playwright/test'
import { AuthHelpers, AdminHelpers, PerformanceHelpers } from '../helpers/test-helpers'
import { setupTestEnvironment, teardownTestEnvironment } from '../fixtures/seed'

test.describe('Admin Panel E2E Tests', () => {
  let authHelpers: AuthHelpers
  let adminHelpers: AdminHelpers
  let perfHelpers: PerformanceHelpers

  test.beforeEach(async ({ page }) => {
    authHelpers = new AuthHelpers(page)
    adminHelpers = new AdminHelpers(page)
    perfHelpers = new PerformanceHelpers(page)
    
    await setupTestEnvironment(page, { seedData: true, clearFirst: true })
  })

  test.afterEach(async ({ page }) => {
    await teardownTestEnvironment(page)
  })

  test.describe('Admin Authentication', () => {
    test('should allow admin login and redirect to admin panel', async ({ page }) => {
      await authHelpers.loginAsTestUser('admin')
      await adminHelpers.navigateToAdmin()
      
      // Verify admin dashboard is accessible
      await adminHelpers.verifyAdminAccess()
    })

    test('should deny access to non-admin users', async ({ page }) => {
      await authHelpers.loginAsTestUser('regular')
      
      // Try to access admin panel - should be denied
      await page.goto('/admin')
      
      // Should be redirected or show access denied
      const currentUrl = page.url()
      expect(currentUrl).not.toContain('/admin')
    })

    test('should require authentication for admin routes', async ({ page }) => {
      await page.goto('/admin')
      
      // Should redirect to login
      await page.waitForURL('/login')
    })
  })

  test.describe('System Monitoring Dashboard', () => {
    test('should display comprehensive system metrics', async ({ page }) => {
      await authHelpers.loginAsTestUser('admin')
      
      const stats = await adminHelpers.getSystemStats()
      
      // Verify metrics are displayed and numeric
      expect(stats.totalUsers).toBeTruthy()
      expect(stats.totalFiles).toBeTruthy()
      expect(stats.totalShares).toBeTruthy()
    })

    test('should show real-time system health indicators', async ({ page }) => {
      await authHelpers.loginAsTestUser('admin')
      await adminHelpers.navigateToAdmin()
      
      // Check for health indicators
      await expect(page.locator('[data-testid="system-status-indicator"]')).toBeVisible()
      await expect(page.locator('[data-testid="database-status"]')).toBeVisible()
      await expect(page.locator('[data-testid="storage-status"]')).toBeVisible()
    })

    test('should display user activity analytics', async ({ page }) => {
      await authHelpers.loginAsTestUser('admin')
      await page.goto('/admin/analytics')
      
      // Verify analytics dashboard elements
      await expect(page.locator('[data-testid="user-registrations-chart"]')).toBeVisible()
      await expect(page.locator('[data-testid="file-uploads-chart"]')).toBeVisible()
      await expect(page.locator('[data-testid="share-activity-chart"]')).toBeVisible()
    })
  })

  test.describe('User Management', () => {
    test('should list all users with correct information', async ({ page }) => {
      await authHelpers.loginAsTestUser('admin')
      await page.goto('/admin/users')
      
      // Verify user list is displayed
      await expect(page.locator('[data-testid="users-table"]')).toBeVisible()
      await expect(page.locator('[data-testid="user-row"]')).toHaveCount(3) // Our test users
    })

    test('should allow user search and filtering', async ({ page }) => {
      await authHelpers.loginAsTestUser('admin')
      await page.goto('/admin/users')
      
      // Search for specific user
      await page.fill('[data-testid="user-search-input"]', 'test@example.com')
      await page.click('[data-testid="search-users-button"]')
      
      // Should show only matching user
      await expect(page.locator('[data-testid="user-row"]')).toHaveCount(1)
      await expect(page.locator('[data-testid="user-email"]')).toContainText('test@example.com')
    })

    test('should enable user account activation/deactivation', async ({ page }) => {
      await authHelpers.loginAsTestUser('admin')
      
      // Deactivate a user
      await adminHelpers.toggleUserStatus('test@example.com', false)
      
      // Verify user status changed
      await page.goto('/admin/users')
      const userRow = page.locator('[data-testid="user-row"]:has-text("test@example.com")')
      await expect(userRow.locator('[data-testid="user-status"]')).toContainText('Inactive')
      
      // Reactivate the user
      await adminHelpers.toggleUserStatus('test@example.com', true)
      
      // Verify user is active again
      await page.reload()
      await expect(userRow.locator('[data-testid="user-status"]')).toContainText('Active')
    })

    test('should display user storage usage and limits', async ({ page }) => {
      await authHelpers.loginAsTestUser('admin')
      await page.goto('/admin/users')
      
      // Check that storage information is displayed
      await expect(page.locator('[data-testid="user-storage-info"]')).toBeVisible()
      await expect(page.locator('[data-testid="storage-usage-bar"]')).toBeVisible()
    })
  })

  test.describe('File Management', () => {
    test('should display system-wide file statistics', async ({ page }) => {
      await authHelpers.loginAsTestUser('admin')
      await page.goto('/admin/files')
      
      // Verify file management interface
      await expect(page.locator('[data-testid="total-files-count"]')).toBeVisible()
      await expect(page.locator('[data-testid="total-storage-used"]')).toBeVisible()
      await expect(page.locator('[data-testid="files-by-type-chart"]')).toBeVisible()
    })

    test('should allow viewing and managing user files', async ({ page }) => {
      await authHelpers.loginAsTestUser('admin')
      await page.goto('/admin/files')
      
      // Should display files from all users
      await expect(page.locator('[data-testid="admin-files-table"]')).toBeVisible()
      await expect(page.locator('[data-testid="file-owner-column"]')).toBeVisible()
      await expect(page.locator('[data-testid="file-actions-column"]')).toBeVisible()
    })

    test('should enable file content moderation', async ({ page }) => {
      await authHelpers.loginAsTestUser('admin')
      await page.goto('/admin/files')
      
      // Test file moderation actions
      const firstFile = page.locator('[data-testid="file-row"]').first()
      await firstFile.locator('[data-testid="moderate-file-button"]').click()
      
      // Verify moderation options
      await expect(page.locator('[data-testid="moderation-panel"]')).toBeVisible()
      await expect(page.locator('[data-testid="flag-file-button"]')).toBeVisible()
      await expect(page.locator('[data-testid="delete-file-button"]')).toBeVisible()
    })
  })

  test.describe('System Configuration', () => {
    test('should allow updating system settings', async ({ page }) => {
      await authHelpers.loginAsTestUser('admin')
      await page.goto('/admin/settings')
      
      // Verify settings interface
      await expect(page.locator('[data-testid="system-settings-form"]')).toBeVisible()
      await expect(page.locator('[data-testid="max-file-size-input"]')).toBeVisible()
      await expect(page.locator('[data-testid="allowed-file-types-input"]')).toBeVisible()
    })

    test('should manage rate limiting configuration', async ({ page }) => {
      await authHelpers.loginAsTestUser('admin')
      await page.goto('/admin/settings/rate-limits')
      
      // Update rate limiting settings
      await page.fill('[data-testid="upload-rate-limit-input"]', '10')
      await page.fill('[data-testid="download-rate-limit-input"]', '50')
      await page.click('[data-testid="save-rate-limits-button"]')
      
      // Verify settings saved
      await expect(page.locator('[data-testid="settings-saved-message"]')).toBeVisible()
    })

    test('should configure email notification settings', async ({ page }) => {
      await authHelpers.loginAsTestUser('admin')
      await page.goto('/admin/settings/notifications')
      
      // Configure email settings
      await page.fill('[data-testid="smtp-server-input"]', 'smtp.example.com')
      await page.fill('[data-testid="smtp-port-input"]', '587')
      await page.check('[data-testid="enable-notifications-checkbox"]')
      
      await page.click('[data-testid="save-notification-settings-button"]')
      
      // Test email configuration
      await page.click('[data-testid="test-email-button"]')
      await expect(page.locator('[data-testid="email-test-result"]')).toBeVisible()
    })
  })

  test.describe('Security Monitoring', () => {
    test('should display security audit logs', async ({ page }) => {
      await authHelpers.loginAsTestUser('admin')
      await page.goto('/admin/security/audit')
      
      // Verify audit log interface
      await expect(page.locator('[data-testid="audit-logs-table"]')).toBeVisible()
      await expect(page.locator('[data-testid="log-entry"]')).toHaveCount.toBeGreaterThan(0)
    })

    test('should show failed login attempts', async ({ page }) => {
      await authHelpers.loginAsTestUser('admin')
      await page.goto('/admin/security/failed-logins')
      
      // Verify failed login monitoring
      await expect(page.locator('[data-testid="failed-logins-table"]')).toBeVisible()
      await expect(page.locator('[data-testid="ip-address-column"]')).toBeVisible()
      await expect(page.locator('[data-testid="attempt-count-column"]')).toBeVisible()
    })

    test('should allow IP address blocking', async ({ page }) => {
      await authHelpers.loginAsTestUser('admin')
      await page.goto('/admin/security/blocked-ips')
      
      // Add IP to block list
      await page.fill('[data-testid="ip-address-input"]', '192.168.1.100')
      await page.fill('[data-testid="block-reason-input"]', 'Suspicious activity')
      await page.click('[data-testid="block-ip-button"]')
      
      // Verify IP was blocked
      await expect(page.locator('[data-testid="blocked-ip-entry"]')).toContainText('192.168.1.100')
    })
  })

  test.describe('Performance Monitoring', () => {
    test('should measure admin panel load performance', async ({ page }) => {
      await authHelpers.loginAsTestUser('admin')
      
      const loadTime = await perfHelpers.measurePageLoad('/admin')
      
      // Admin panel should load within reasonable time
      expect(loadTime).toBeLessThan(5000) // 5 seconds
    })

    test('should handle large data sets efficiently', async ({ page }) => {
      await authHelpers.loginAsTestUser('admin')
      
      // Test with large user list
      await page.goto('/admin/users?limit=1000')
      
      // Should handle pagination or virtualization
      await expect(page.locator('[data-testid="pagination-controls"]')).toBeVisible()
      
      // Performance should remain acceptable
      const startTime = Date.now()
      await page.click('[data-testid="next-page-button"]')
      await page.waitForLoadState('networkidle')
      const paginationTime = Date.now() - startTime
      
      expect(paginationTime).toBeLessThan(3000) // 3 seconds for pagination
    })
  })

  test.describe('Error Handling', () => {
    test('should gracefully handle server errors', async ({ page }) => {
      await authHelpers.loginAsTestUser('admin')
      
      // Simulate server error by accessing non-existent endpoint
      await page.goto('/admin/non-existent-section')
      
      // Should show appropriate error message
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible()
      await expect(page.locator('[data-testid="back-to-admin-button"]')).toBeVisible()
    })

    test('should handle network connectivity issues', async ({ page }) => {
      await authHelpers.loginAsTestUser('admin')
      await adminHelpers.navigateToAdmin()
      
      // Simulate network issues
      await page.route('**/api/admin/**', route => route.abort())
      
      // Try to load admin data
      await page.reload()
      
      // Should show offline/connectivity message
      await expect(page.locator('[data-testid="connection-error"]')).toBeVisible()
    })
  })
    test('should display system monitoring metrics', async ({ page }) => {
      await helpers.loginAsAdmin()
      await helpers.navigateToSystemMonitoring()
      
      // Check specific metric elements
      await helpers.expectElementToBeVisible('[data-testid="uptime-metric"]')
      await helpers.expectElementToBeVisible('[data-testid="initialization-status"]')
      await helpers.expectElementToBeVisible('[data-testid="job-queue-metrics"]')
      await helpers.expectElementToBeVisible('[data-testid="cache-metrics"]')
      await helpers.expectElementToBeVisible('[data-testid="database-metrics"]')
    })

    test('should show real-time job queue status', async ({ page }) => {
      await helpers.loginAsAdmin()
      await helpers.viewJobQueue()
      
      // Verify job queue table is displayed
      await helpers.expectJobQueueTable()
      
      // Check job status columns
      await helpers.expectElementToBeVisible('[data-testid="pending-jobs-count"]')
      await helpers.expectElementToBeVisible('[data-testid="processing-jobs-count"]')
      await helpers.expectElementToBeVisible('[data-testid="completed-jobs-count"]')
      await helpers.expectElementToBeVisible('[data-testid="failed-jobs-count"]')
    })

    test('should allow retrying failed jobs', async ({ page }) => {
      await helpers.loginAsAdmin()
      await helpers.viewJobQueue()
      
      // Find a failed job and retry it
      const failedJobId = 'test-failed-job-id'
      await helpers.retryFailedJob(failedJobId)
      
      // Verify job status changed
      await helpers.expectElementToHaveText(
        `[data-testid="job-${failedJobId}-status"]`,
        'pending'
      )
    })

    test('should allow clearing completed jobs', async ({ page }) => {
      await helpers.loginAsAdmin()
      await helpers.viewJobQueue()
      
      await helpers.clearCompletedJobs()
      
      // Verify completed jobs count is 0
      await helpers.expectElementToHaveText('[data-testid="completed-jobs-count"]', '0')
    })

    test('should display cache performance metrics', async ({ page }) => {
      await helpers.loginAsAdmin()
      await helpers.checkSystemHealth()
      
      // Verify cache metrics
      await helpers.expectElementToBeVisible('[data-testid="cache-hit-rate"]')
      await helpers.expectElementToBeVisible('[data-testid="cache-size"]')
      await helpers.expectElementToBeVisible('[data-testid="cache-backend"]')
      await helpers.expectElementToBeVisible('[data-testid="cache-connection-status"]')
    })
  })

  test.describe('Storage Management', () => {
    test('should display storage statistics', async ({ page }) => {
      await helpers.loginAsAdmin()
      await helpers.viewStorageStats()
      
      // Verify storage metrics are displayed
      await helpers.expectStorageMetrics()
      
      // Check specific storage metrics
      await helpers.expectElementToBeVisible('[data-testid="total-files-metric"]')
      await helpers.expectElementToBeVisible('[data-testid="total-size-metric"]')
      await helpers.expectElementToBeVisible('[data-testid="avg-file-size-metric"]')
      await helpers.expectElementToBeVisible('[data-testid="storage-usage-chart"]')
    })

    test('should show file type breakdown', async ({ page }) => {
      await helpers.loginAsAdmin()
      await helpers.viewStorageStats()
      
      // Verify file type statistics
      await helpers.expectElementToBeVisible('[data-testid="file-types-chart"]')
      await helpers.expectElementToBeVisible('[data-testid="file-types-table"]')
    })

    test('should allow storage cleanup operations', async ({ page }) => {
      await helpers.loginAsAdmin()
      await helpers.viewStorageStats()
      
      // Test cleanup operations
      await page.click('[data-testid="cleanup-temp-files"]')
      await page.click('[data-testid="confirm-cleanup"]')
      
      // Verify cleanup notification
      await helpers.expectNotificationToShow('Temporary files cleaned up successfully')
    })

    test('should display storage usage trends', async ({ page }) => {
      await helpers.loginAsAdmin()
      await helpers.viewStorageStats()
      
      // Check storage trends chart
      await helpers.expectElementToBeVisible('[data-testid="storage-trends-chart"]')
      await helpers.expectElementToBeVisible('[data-testid="usage-period-selector"]')
      
      // Test different time periods
      await page.click('[data-testid="usage-period-selector"]')
      await page.click('[data-testid="period-7days"]')
      await helpers.waitForLoadingToFinish()
      
      await helpers.expectElementToBeVisible('[data-testid="storage-trends-chart"]')
    })
  })

  test.describe('User Role Management', () => {
    test('should display user management table', async ({ page }) => {
      await helpers.loginAsAdmin()
      await helpers.manageUsers()
      
      // Verify user management interface
      await helpers.expectUserManagementTable()
      
      // Check table columns
      await helpers.expectElementToBeVisible('[data-testid="user-email-column"]')
      await helpers.expectElementToBeVisible('[data-testid="user-role-column"]')
      await helpers.expectElementToBeVisible('[data-testid="user-status-column"]')
      await helpers.expectElementToBeVisible('[data-testid="user-actions-column"]')
    })

    test('should allow changing user roles', async ({ page }) => {
      await helpers.loginAsAdmin()
      await helpers.manageUsers()
      
      const testUserId = 'test-user-id'
      await helpers.changeUserRole(testUserId, 'admin')
      
      // Verify role change notification
      await helpers.expectNotificationToShow('User role updated successfully')
      
      // Verify role is displayed correctly
      await helpers.expectElementToHaveText(
        `[data-testid="user-${testUserId}-role"]`,
        'admin'
      )
    })

    test('should allow user deletion with confirmation', async ({ page }) => {
      await helpers.loginAsAdmin()
      await helpers.manageUsers()
      
      const testUserId = 'test-user-to-delete'
      await helpers.deleteUser(testUserId)
      
      // Verify deletion notification
      await helpers.expectNotificationToShow('User deleted successfully')
      
      // Verify user is removed from table
      await expect(page.locator(`[data-testid="user-${testUserId}"]`)).not.toBeVisible()
    })

    test('should show user activity and statistics', async ({ page }) => {
      await helpers.loginAsAdmin()
      await helpers.manageUsers()
      
      // Check user statistics
      await helpers.expectElementToBeVisible('[data-testid="total-users-count"]')
      await helpers.expectElementToBeVisible('[data-testid="active-users-count"]')
      await helpers.expectElementToBeVisible('[data-testid="new-users-count"]')
      
      // Test user filtering
      await page.click('[data-testid="filter-users"]')
      await page.click('[data-testid="filter-admin-users"]')
      await helpers.waitForLoadingToFinish()
      
      // Verify only admin users are shown
      const adminUserRows = page.locator('[data-testid*="user-"][data-role="admin"]')
      await expect(adminUserRows).toHaveCount(1) // At least 1 admin user
    })

    test('should handle bulk user operations', async ({ page }) => {
      await helpers.loginAsAdmin()
      await helpers.manageUsers()
      
      // Select multiple users
      await page.check('[data-testid="select-all-users"]')
      
      // Test bulk role change
      await page.click('[data-testid="bulk-actions-dropdown"]')
      await page.click('[data-testid="bulk-change-role"]')
      await page.selectOption('[data-testid="bulk-role-select"]', 'user')
      await page.click('[data-testid="confirm-bulk-action"]')
      
      // Verify bulk action notification
      await helpers.expectNotificationToShow('Bulk role update completed')
    })
  })

  test.describe('Security and Access Control', () => {
    test('should log admin actions for audit trail', async ({ page }) => {
      await helpers.loginAsAdmin()
      
      // Perform an admin action
      await helpers.manageUsers()
      await helpers.changeUserRole('test-user-id', 'admin')
      
      // Check audit logs
      await page.click('[data-testid="audit-logs-tab"]')
      await helpers.expectElementToBeVisible('[data-testid="audit-log-table"]')
      
      // Verify the action is logged
      await helpers.expectElementToBeVisible('[data-testid="audit-log-role-change"]')
    })

    test('should require additional confirmation for destructive actions', async ({ page }) => {
      await helpers.loginAsAdmin()
      await helpers.manageUsers()
      
      // Try to delete a user
      await page.click('[data-testid="user-test-id-menu"]')
      await page.click('[data-testid="delete-user"]')
      
      // Verify confirmation dialog appears
      await helpers.expectElementToBeVisible('[data-testid="confirm-delete-dialog"]')
      await helpers.expectElementToBeVisible('[data-testid="deletion-confirmation-input"]')
      
      // Test cancellation
      await page.click('[data-testid="cancel-delete"]')
      await expect(page.locator('[data-testid="confirm-delete-dialog"]')).not.toBeVisible()
    })

    test('should handle session timeout in admin panel', async ({ page }) => {
      await helpers.loginAsAdmin()
      
      // Simulate session expiration
      await helpers.setLocalStorageItem('sessionExpired', 'true')
      
      // Try to perform an admin action
      await helpers.manageUsers()
      
      // Should redirect to login
      await helpers.expectToBeOnPage('/login')
      await helpers.expectElementToBeVisible('[data-testid="session-expired-message"]')
    })
  })

  test.describe('Performance and Error Handling', () => {
    test('should handle large datasets gracefully', async ({ page }) => {
      // This test would use performance test data
      await teardownTestEnvironment(page)
      await setupTestEnvironment(page, { seedData: true, performance: true })
      
      await helpers.loginAsAdmin()
      await helpers.manageUsers()
      
      // Verify pagination is working
      await helpers.expectElementToBeVisible('[data-testid="pagination-controls"]')
      await helpers.expectElementToBeVisible('[data-testid="items-per-page"]')
      
      // Test navigation through pages
      await page.click('[data-testid="next-page"]')
      await helpers.waitForLoadingToFinish()
      await helpers.expectElementToBeVisible('[data-testid="user-management-table"]')
    })

    test('should show loading states during operations', async ({ page }) => {
      await helpers.loginAsAdmin()
      
      // Simulate slow network
      await helpers.simulateSlowNetwork(2000)
      
      await helpers.manageUsers()
      
      // Verify loading indicator appears
      await helpers.expectElementToBeVisible('[data-testid="loading-spinner"]')
      await helpers.waitForLoadingToFinish()
    })

    test('should handle API errors gracefully', async ({ page }) => {
      await helpers.loginAsAdmin()
      
      // Simulate server error
      await helpers.simulateServerError('/api/admin/users')
      
      await helpers.manageUsers()
      
      // Verify error message is displayed
      await helpers.expectElementToBeVisible('[data-testid="error-message"]')
      await helpers.expectNotificationToShow('Failed to load users')
    })

    test('should retry failed operations', async ({ page }) => {
      await helpers.loginAsAdmin()
      await helpers.manageUsers()
      
      // Simulate network failure then recovery
      await helpers.simulateNetworkError()
      
      await helpers.changeUserRole('test-user-id', 'admin')
      
      // Should show retry option
      await helpers.expectElementToBeVisible('[data-testid="retry-button"]')
      
      // Clear network simulation and retry
      await page.unroute('**/api/**')
      await page.click('[data-testid="retry-button"]')
      
      // Should succeed on retry
      await helpers.expectNotificationToShow('User role updated successfully')
    })
  })

  test.describe('Real-time Updates', () => {
    test('should update metrics in real-time', async ({ page }) => {
      await helpers.loginAsAdmin()
      await helpers.checkSystemHealth()
      
      // Get initial uptime value
      const initialUptime = await page.textContent('[data-testid="uptime-metric"]')
      
      // Wait for auto-refresh
      await page.waitForTimeout(5000)
      
      // Verify uptime has updated
      const updatedUptime = await page.textContent('[data-testid="uptime-metric"]')
      expect(updatedUptime).not.toBe(initialUptime)
    })

    test('should show real-time job queue updates', async ({ page }) => {
      await helpers.loginAsAdmin()
      await helpers.viewJobQueue()
      
      // Get initial job counts
      const initialPending = await page.textContent('[data-testid="pending-jobs-count"]')
      
      // Simulate new job creation through API
      await page.request.post('/api/admin/jobs', {
        data: {
          type: 'test-job',
          data: { test: true }
        }
      })
      
      // Wait for real-time update
      await page.waitForTimeout(2000)
      
      // Verify pending count increased
      const updatedPending = await page.textContent('[data-testid="pending-jobs-count"]')
      expect(parseInt(updatedPending!)).toBeGreaterThan(parseInt(initialPending!))
    })
  })
})
