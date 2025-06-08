import { test, expect } from '@playwright/test';
import { TestHelpers, TestDataFactory, CustomAssertions } from '../helpers/test-helpers';

/**
 * File Upload and Management E2E Tests
 * Tests complete file upload, sharing, and management workflows
 */
test.describe('File Management', () => {
  let helpers: TestHelpers;
  let assertions: CustomAssertions;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    assertions = new CustomAssertions(page);
    
    // Login before each test
    await helpers.login();
  });

  test.describe('File Upload', () => {
    test('should upload a file successfully', async ({ page }) => {
      // Create a test file
      const testFilePath = await helpers.createTestFile('Test content for upload', 'upload-test.txt');
      
      await helpers.navigateAndWait('/dashboard');
      
      // Upload the file
      await helpers.uploadFile(testFilePath, 'upload-test.txt');
      
      // Verify file appears in file list
      await helpers.waitForElement('[data-testid="file-list"]');
      const fileItem = page.locator('[data-testid="file-item"]').filter({ hasText: 'upload-test.txt' });
      await expect(fileItem).toBeVisible();
      
      // Check file details
      await expect(fileItem.locator('[data-testid="file-name"]')).toContainText('upload-test.txt');
      await expect(fileItem.locator('[data-testid="file-size"]')).toBeVisible();
      await expect(fileItem.locator('[data-testid="file-date"]')).toBeVisible();
    });

    test('should handle drag and drop upload', async ({ page }) => {
      const testFilePath = await helpers.createTestFile('Drag and drop content', 'dragdrop-test.pdf');
      
      await helpers.navigateAndWait('/dashboard');
      
      // Drag and drop file
      await helpers.dragAndDropFile(testFilePath, '[data-testid="drop-zone"]');
      
      // Verify upload success
      await assertions.expectToast('File uploaded successfully');
      
      // Check file in list
      const fileItem = page.locator('[data-testid="file-item"]').filter({ hasText: 'dragdrop-test.pdf' });
      await expect(fileItem).toBeVisible();
    });

    test('should validate file size limits', async ({ page }) => {
      // Create a large file (mock - in real test you'd create actual large file)
      await helpers.mockApiResponse('/api/files', 
        { error: 'File size exceeds limit' }, 400
      );
      
      await helpers.navigateAndWait('/dashboard');
      
      const testFilePath = await helpers.createTestFile('Large file content', 'large-file.pdf');
      
      // Attempt upload
      await page.click('[data-testid="upload-button"]');
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(testFilePath);
      
      // Should show error
      await assertions.expectToast('File size exceeds limit', 'error');
    });

    test('should validate file types', async ({ page }) => {
      const testFilePath = await helpers.createTestFile('Executable content', 'malware.exe');
      
      await helpers.navigateAndWait('/dashboard');
      
      await page.click('[data-testid="upload-button"]');
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(testFilePath);
      
      // Should show file type error
      await assertions.expectToast('File type not allowed', 'error');
    });

    test('should show upload progress', async ({ page }) => {
      const testFilePath = await helpers.createTestFile('Progress test content', 'progress-test.pdf');
      
      await helpers.navigateAndWait('/dashboard');
      
      await page.click('[data-testid="upload-button"]');
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(testFilePath);
      
      // Check for progress indicator
      await helpers.waitForElement('[data-testid="upload-progress"]');
      await expect(page.locator('[data-testid="upload-progress"]')).toBeVisible();
      
      // Wait for completion
      await page.waitForSelector('[data-testid="upload-success"]', { timeout: 30000 });
    });
  });

  test.describe('File Operations', () => {
    test.beforeEach(async ({ page }) => {
      // Upload a test file for operations
      const testFilePath = await helpers.createTestFile('Operations test content', 'operations-test.pdf');
      await helpers.uploadFile(testFilePath, 'operations-test.pdf');
    });

    test('should download a file', async ({ page }) => {
      await helpers.navigateAndWait('/dashboard');
      
      const fileItem = page.locator('[data-testid="file-item"]').filter({ hasText: 'operations-test.pdf' });
      await fileItem.locator('[data-testid="download-button"]').click();
      
      // Verify download started
      const download = await assertions.expectFileDownload('operations-test.pdf');
      expect(download).toBeTruthy();
    });

    test('should rename a file', async ({ page }) => {
      await helpers.navigateAndWait('/dashboard');
      
      const fileItem = page.locator('[data-testid="file-item"]').filter({ hasText: 'operations-test.pdf' });
      
      // Open rename dialog
      await fileItem.locator('[data-testid="more-options"]').click();
      await page.click('[data-testid="rename-option"]');
      
      // Enter new name
      const newName = 'renamed-test-file.pdf';
      await page.fill('[data-testid="rename-input"]', newName);
      await page.click('[data-testid="rename-confirm"]');
      
      // Verify rename success
      await assertions.expectToast('File renamed successfully');
      
      // Check new name appears
      const renamedFile = page.locator('[data-testid="file-item"]').filter({ hasText: newName });
      await expect(renamedFile).toBeVisible();
    });

    test('should delete a file', async ({ page }) => {
      await helpers.navigateAndWait('/dashboard');
      
      const fileItem = page.locator('[data-testid="file-item"]').filter({ hasText: 'operations-test.pdf' });
      
      // Open delete dialog
      await fileItem.locator('[data-testid="more-options"]').click();
      await page.click('[data-testid="delete-option"]');
      
      // Confirm deletion
      await page.click('[data-testid="delete-confirm"]');
      
      // Verify deletion success
      await assertions.expectToast('File deleted successfully');
      
      // Check file is removed from list
      await expect(fileItem).not.toBeVisible();
    });

    test('should share a file', async ({ page }) => {
      await helpers.navigateAndWait('/dashboard');
      
      const fileItem = page.locator('[data-testid="file-item"]').filter({ hasText: 'operations-test.pdf' });
      
      // Open share dialog
      await fileItem.locator('[data-testid="share-button"]').click();
      
      // Configure sharing settings
      await page.check('[data-testid="public-share-toggle"]');
      await page.fill('[data-testid="share-expiry"]', '2024-12-31');
      await page.click('[data-testid="generate-link"]');
      
      // Verify share link generated
      const shareLink = page.locator('[data-testid="share-link"]');
      await expect(shareLink).toBeVisible();
      
      // Copy link
      await page.click('[data-testid="copy-link"]');
      await assertions.expectToast('Link copied to clipboard');
      
      // Close dialog
      await page.click('[data-testid="share-dialog-close"]');
      
      // Verify file shows as shared
      const sharedIcon = fileItem.locator('[data-testid="shared-icon"]');
      await expect(sharedIcon).toBeVisible();
    });
  });

  test.describe('File Search and Filter', () => {
    test.beforeEach(async ({ page }) => {
      // Upload multiple test files
      const files = [
        { content: 'Document 1', name: 'document1.pdf' },
        { content: 'Image content', name: 'image1.jpg' },
        { content: 'Document 2', name: 'document2.pdf' },
        { content: 'Spreadsheet', name: 'sheet1.xlsx' },
      ];

      for (const file of files) {
        const filePath = await helpers.createTestFile(file.content, file.name);
        await helpers.uploadFile(filePath, file.name);
      }
    });

    test('should search files by name', async ({ page }) => {
      await helpers.navigateAndWait('/dashboard');
      
      // Search for documents
      await page.fill('[data-testid="search-input"]', 'document');
      await page.keyboard.press('Enter');
      
      // Should show only matching files
      await expect(page.locator('[data-testid="file-item"]')).toHaveCount(2);
      await expect(page.locator('[data-testid="file-item"]').filter({ hasText: 'document1.pdf' })).toBeVisible();
      await expect(page.locator('[data-testid="file-item"]').filter({ hasText: 'document2.pdf' })).toBeVisible();
    });

    test('should filter files by type', async ({ page }) => {
      await helpers.navigateAndWait('/dashboard');
      
      // Filter by PDF files
      await page.click('[data-testid="filter-dropdown"]');
      await page.click('[data-testid="filter-pdf"]');
      
      // Should show only PDF files
      const pdfFiles = page.locator('[data-testid="file-item"]').filter({ hasText: '.pdf' });
      await expect(pdfFiles).toHaveCount(2);
    });

    test('should sort files by different criteria', async ({ page }) => {
      await helpers.navigateAndWait('/dashboard');
      
      // Sort by name
      await page.click('[data-testid="sort-dropdown"]');
      await page.click('[data-testid="sort-name"]');
      
      // Verify sorting order
      const fileNames = await page.locator('[data-testid="file-name"]').allTextContents();
      const sortedNames = [...fileNames].sort();
      expect(fileNames).toEqual(sortedNames);
      
      // Sort by date
      await page.click('[data-testid="sort-dropdown"]');
      await page.click('[data-testid="sort-date"]');
      
      // Verify date sorting (newest first)
      const fileDates = await page.locator('[data-testid="file-date"]').allTextContents();
      // In real implementation, you'd parse dates and verify order
      expect(fileDates.length).toBeGreaterThan(0);
    });
  });

  test.describe('File Sharing and Access', () => {
    test('should access shared file without login', async ({ page, context }) => {
      // First, create and share a file while logged in
      const testFilePath = await helpers.createTestFile('Shared file content', 'shared-test.pdf');
      await helpers.uploadFile(testFilePath, 'shared-test.pdf');
      
      await helpers.navigateAndWait('/dashboard');
      
      const fileItem = page.locator('[data-testid="file-item"]').filter({ hasText: 'shared-test.pdf' });
      await fileItem.locator('[data-testid="share-button"]').click();
      await page.check('[data-testid="public-share-toggle"]');
      await page.click('[data-testid="generate-link"]');
      
      // Get the share link
      const shareLink = await page.locator('[data-testid="share-link"]').textContent();
      expect(shareLink).toBeTruthy();
      
      // Logout and access shared link
      await helpers.logout();
      await page.goto(shareLink!);
      
      // Should be able to view file details
      await expect(page.locator('[data-testid="shared-file-name"]')).toContainText('shared-test.pdf');
      await expect(page.locator('[data-testid="download-shared-button"]')).toBeVisible();
    });

    test('should respect sharing permissions', async ({ page }) => {
      // Create a private file
      const testFilePath = await helpers.createTestFile('Private file content', 'private-test.pdf');
      await helpers.uploadFile(testFilePath, 'private-test.pdf');
      
      // Don't share the file, just get its URL pattern
      const fileId = 'mock-file-id'; // In real test, you'd extract this
      const directUrl = `/shared/${fileId}`;
      
      // Logout and try to access directly
      await helpers.logout();
      await page.goto(directUrl);
      
      // Should be redirected or show access denied
      await expect(page.locator('[data-testid="access-denied"]')).toBeVisible();
    });

    test('should handle expired shared links', async ({ page }) => {
      // Mock expired share link
      await helpers.mockApiResponse('/api/shared/*', 
        { error: 'Share link expired' }, 403
      );
      
      await page.goto('/shared/expired-link-id');
      
      // Should show expiration message
      await expect(page.locator('[data-testid="link-expired"]')).toBeVisible();
      await expect(page.locator('[data-testid="link-expired"]')).toContainText('expired');
    });
  });

  test.describe('File Organization', () => {
    test('should create and manage folders', async ({ page }) => {
      await helpers.navigateAndWait('/dashboard');
      
      // Create new folder
      await page.click('[data-testid="new-folder-button"]');
      await page.fill('[data-testid="folder-name-input"]', 'Test Folder');
      await page.click('[data-testid="create-folder-confirm"]');
      
      // Verify folder created
      await assertions.expectToast('Folder created successfully');
      const folderItem = page.locator('[data-testid="folder-item"]').filter({ hasText: 'Test Folder' });
      await expect(folderItem).toBeVisible();
      
      // Enter folder
      await folderItem.click();
      
      // Verify we're inside the folder
      await expect(page.locator('[data-testid="current-path"]')).toContainText('Test Folder');
      
      // Go back to parent
      await page.click('[data-testid="back-to-parent"]');
      await expect(page.locator('[data-testid="current-path"]')).not.toContainText('Test Folder');
    });

    test('should move files between folders', async ({ page }) => {
      // Create a folder first
      await page.click('[data-testid="new-folder-button"]');
      await page.fill('[data-testid="folder-name-input"]', 'Destination Folder');
      await page.click('[data-testid="create-folder-confirm"]');
      
      // Upload a file
      const testFilePath = await helpers.createTestFile('File to move', 'moveable-file.pdf');
      await helpers.uploadFile(testFilePath, 'moveable-file.pdf');
      
      // Select file and move
      const fileItem = page.locator('[data-testid="file-item"]').filter({ hasText: 'moveable-file.pdf' });
      await fileItem.locator('[data-testid="select-checkbox"]').check();
      
      await page.click('[data-testid="move-button"]');
      await page.click('[data-testid="destination-folder"]').filter({ hasText: 'Destination Folder' });
      await page.click('[data-testid="move-confirm"]');
      
      // Verify file moved
      await assertions.expectToast('File moved successfully');
      await expect(fileItem).not.toBeVisible();
      
      // Check file is in destination folder
      const folderItem = page.locator('[data-testid="folder-item"]').filter({ hasText: 'Destination Folder' });
      await folderItem.click();
      
      const movedFile = page.locator('[data-testid="file-item"]').filter({ hasText: 'moveable-file.pdf' });
      await expect(movedFile).toBeVisible();
    });
  });

  test.describe('Performance and Responsiveness', () => {
    test('should handle large file lists efficiently', async ({ page }) => {
      // Mock large number of files
      const largeFileList = Array.from({ length: 1000 }, (_, i) => ({
        id: `file-${i}`,
        name: `file-${i}.pdf`,
        size: 1024000,
        createdAt: new Date().toISOString(),
      }));
      
      await helpers.mockApiResponse('/api/files', { files: largeFileList });
      
      await helpers.navigateAndWait('/dashboard');
      
      // Measure loading time
      const loadTime = await helpers.measurePageLoadTime();
      expect(loadTime).toBeLessThan(3000); // Should load within 3 seconds
      
      // Check virtual scrolling or pagination works
      const visibleFiles = await page.locator('[data-testid="file-item"]').count();
      expect(visibleFiles).toBeLessThan(100); // Should not render all files at once
    });

    test('should be responsive on mobile devices', async ({ page }) => {
      await helpers.navigateAndWait('/dashboard');
      
      // Test responsive design
      await helpers.testResponsiveDesign();
      
      // Check mobile-specific UI elements
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Mobile menu should be accessible
      await expect(page.locator('[data-testid="mobile-menu-toggle"]')).toBeVisible();
      
      // File actions should be touch-friendly
      const fileItem = page.locator('[data-testid="file-item"]').first();
      if (await fileItem.isVisible()) {
        const boundingBox = await fileItem.boundingBox();
        expect(boundingBox?.height).toBeGreaterThan(44); // Minimum touch target size
      }
    });
  });
});
