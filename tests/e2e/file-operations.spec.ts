// End-to-end tests for file operations in SecureShare
import { test, expect, Page, Browser } from '@playwright/test';
import path from 'path';
import fs from 'fs';

// Test data and utilities
const TEST_FILES = {
  small: {
    name: 'test-document.txt',
    content: 'This is a test document for file upload testing.',
    size: 'small',
  },
  medium: {
    name: 'test-image.jpg',
    path: path.join(__dirname, 'fixtures', 'test-image.jpg'),
    size: 'medium',
  },
  large: {
    name: 'test-video.mp4',
    path: path.join(__dirname, 'fixtures', 'test-video.mp4'),
    size: 'large',
  },
};

// Test user credentials
const TEST_USER = {
  email: 'filetest@example.com',
  password: 'SecurePassword123!',
  name: 'File Test User',
};

class FileOperationsHelper {
  constructor(private page: Page) {}

  async loginUser() {
    await this.page.goto('/auth/login');
    await this.page.fill('[data-testid="email-input"]', TEST_USER.email);
    await this.page.fill('[data-testid="password-input"]', TEST_USER.password);
    await this.page.click('[data-testid="login-button"]');
    await this.page.waitForURL('/dashboard');
  }

  async navigateToFiles() {
    await this.page.goto('/dashboard/files');
    await this.page.waitForSelector('[data-testid="file-list"]');
  }

  async createTestFolder(name: string) {
    await this.page.click('[data-testid="create-folder-button"]');
    await this.page.fill('[data-testid="folder-name-input"]', name);
    await this.page.click('[data-testid="create-folder-confirm"]');
    await this.page.waitForSelector(`[data-testid="folder-${name}"]`);
  }

  async uploadFile(fileName: string, filePath?: string) {
    const fileInput = this.page.locator('[data-testid="file-upload-input"]');
    
    if (filePath) {
      await fileInput.setInputFiles(filePath);
    } else {
      // Create temporary test file
      const tempPath = path.join(__dirname, 'temp', fileName);
      fs.writeFileSync(tempPath, TEST_FILES.small.content);
      await fileInput.setInputFiles(tempPath);
      fs.unlinkSync(tempPath); // Clean up
    }

    await this.page.waitForSelector(`[data-testid="file-${fileName}"]`);
  }

  async downloadFile(fileName: string) {
    const downloadPromise = this.page.waitForEvent('download');
    await this.page.click(`[data-testid="download-${fileName}"]`);
    return await downloadPromise;
  }

  async shareFile(fileName: string, shareEmail: string) {
    await this.page.click(`[data-testid="share-${fileName}"]`);
    await this.page.fill('[data-testid="share-email-input"]', shareEmail);
    await this.page.click('[data-testid="share-confirm-button"]');
    await this.page.waitForSelector('[data-testid="share-success-message"]');
  }

  async deleteFile(fileName: string) {
    await this.page.click(`[data-testid="delete-${fileName}"]`);
    await this.page.click('[data-testid="delete-confirm-button"]');
    await this.page.waitForSelector(`[data-testid="file-${fileName}"]`, { state: 'detached' });
  }

  async waitForUploadProgress(fileName: string) {
    await this.page.waitForSelector(`[data-testid="upload-progress-${fileName}"]`);
    await this.page.waitForSelector(`[data-testid="upload-progress-${fileName}"]`, { state: 'detached' });
  }

  async verifyFileExists(fileName: string) {
    await expect(this.page.locator(`[data-testid="file-${fileName}"]`)).toBeVisible();
  }

  async verifyFileNotExists(fileName: string) {
    await expect(this.page.locator(`[data-testid="file-${fileName}"]`)).not.toBeVisible();
  }

  async getFileSize(fileName: string): Promise<string> {
    return await this.page.locator(`[data-testid="file-size-${fileName}"]`).textContent() || '';
  }

  async getFileModifiedDate(fileName: string): Promise<string> {
    return await this.page.locator(`[data-testid="file-modified-${fileName}"]`).textContent() || '';
  }
}

test.describe('File Operations E2E Tests', () => {
  let helper: FileOperationsHelper;

  test.beforeEach(async ({ page }) => {
    helper = new FileOperationsHelper(page);
    await helper.loginUser();
    await helper.navigateToFiles();
  });

  test.describe('📁 File Upload Operations', () => {
    test('should upload small text file successfully', async ({ page }) => {
      const fileName = 'small-test.txt';
      
      await helper.uploadFile(fileName);
      await helper.verifyFileExists(fileName);
      
      // Verify file metadata
      const fileSize = await helper.getFileSize(fileName);
      expect(fileSize).toContain('bytes');
    });

    test('should upload multiple files simultaneously', async ({ page }) => {
      const files = ['file1.txt', 'file2.txt', 'file3.txt'];
      
      // Upload multiple files
      for (const fileName of files) {
        await helper.uploadFile(fileName);
      }
      
      // Verify all files uploaded
      for (const fileName of files) {
        await helper.verifyFileExists(fileName);
      }
    });

    test('should show upload progress for large files', async ({ page }) => {
      const fileName = 'large-test-file.dat';
      
      // Start upload
      const fileInput = page.locator('[data-testid="file-upload-input"]');
      const largePath = path.join(__dirname, 'fixtures', 'large-file.dat');
      
      // Create large test file if it doesn't exist
      if (!fs.existsSync(largePath)) {
        const largeContent = 'x'.repeat(10 * 1024 * 1024); // 10MB
        fs.writeFileSync(largePath, largeContent);
      }
      
      await fileInput.setInputFiles(largePath);
      
      // Verify progress indicator appears
      await expect(page.locator(`[data-testid="upload-progress-${fileName}"]`)).toBeVisible();
      
      // Wait for upload completion
      await helper.waitForUploadProgress(fileName);
      await helper.verifyFileExists(fileName);
    });

    test('should handle upload errors gracefully', async ({ page }) => {
      // Mock network error during upload
      await page.route('**/api/upload', route => {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Upload failed' }),
        });
      });

      const fileName = 'error-test.txt';
      await helper.uploadFile(fileName);
      
      // Verify error message is shown
      await expect(page.locator('[data-testid="upload-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="upload-error"]')).toContainText('Upload failed');
    });

    test('should validate file types and sizes', async ({ page }) => {
      // Test unsupported file type
      const executableFile = 'malicious.exe';
      const tempPath = path.join(__dirname, 'temp', executableFile);
      fs.writeFileSync(tempPath, 'fake executable content');
      
      const fileInput = page.locator('[data-testid="file-upload-input"]');
      await fileInput.setInputFiles(tempPath);
      
      // Verify rejection message
      await expect(page.locator('[data-testid="file-type-error"]')).toBeVisible();
      
      fs.unlinkSync(tempPath);
    });
  });

  test.describe('📥 File Download Operations', () => {
    test('should download file successfully', async ({ page }) => {
      const fileName = 'download-test.txt';
      
      // Upload file first
      await helper.uploadFile(fileName);
      
      // Download file
      const download = await helper.downloadFile(fileName);
      
      // Verify download
      expect(download.suggestedFilename()).toBe(fileName);
      
      // Save and verify content
      const downloadPath = path.join(__dirname, 'downloads', fileName);
      await download.saveAs(downloadPath);
      
      const content = fs.readFileSync(downloadPath, 'utf8');
      expect(content).toBe(TEST_FILES.small.content);
      
      fs.unlinkSync(downloadPath);
    });

    test('should handle download of large files', async ({ page }) => {
      const fileName = 'large-download.dat';
      
      // Upload large file first
      await helper.uploadFile(fileName);
      
      // Start download
      const download = await helper.downloadFile(fileName);
      
      // Verify download starts
      expect(download.suggestedFilename()).toBe(fileName);
      
      // Cancel download to avoid waiting for large file
      await download.cancel();
    });

    test('should handle download errors', async ({ page }) => {
      const fileName = 'nonexistent-file.txt';
      
      // Mock download error
      await page.route('**/api/file/*/download', route => {
        route.fulfill({
          status: 404,
          body: JSON.stringify({ error: 'File not found' }),
        });
      });

      await page.click(`[data-testid="download-${fileName}"]`);
      
      // Verify error message
      await expect(page.locator('[data-testid="download-error"]')).toBeVisible();
    });
  });

  test.describe('🔗 File Sharing Operations', () => {
    test('should share file with another user', async ({ page }) => {
      const fileName = 'share-test.txt';
      const shareEmail = 'recipient@example.com';
      
      // Upload file first
      await helper.uploadFile(fileName);
      
      // Share file
      await helper.shareFile(fileName, shareEmail);
      
      // Verify share success
      await expect(page.locator('[data-testid="share-success-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="share-success-message"]')).toContainText(shareEmail);
    });

    test('should generate shareable link', async ({ page }) => {
      const fileName = 'link-share-test.txt';
      
      await helper.uploadFile(fileName);
      
      // Generate share link
      await page.click(`[data-testid="generate-link-${fileName}"]`);
      
      // Verify link is generated
      await expect(page.locator('[data-testid="share-link"]')).toBeVisible();
      
      const shareLink = await page.locator('[data-testid="share-link"]').inputValue();
      expect(shareLink).toContain('https://');
      expect(shareLink).toContain('/share/');
    });

    test('should set share permissions', async ({ page }) => {
      const fileName = 'permission-test.txt';
      
      await helper.uploadFile(fileName);
      
      // Open share dialog
      await page.click(`[data-testid="share-${fileName}"]`);
      
      // Set view-only permission
      await page.click('[data-testid="permission-view-only"]');
      
      // Share file
      await page.fill('[data-testid="share-email-input"]', 'viewer@example.com');
      await page.click('[data-testid="share-confirm-button"]');
      
      // Verify permission setting
      await expect(page.locator('[data-testid="permission-status"]')).toContainText('View only');
    });

    test('should revoke file access', async ({ page }) => {
      const fileName = 'revoke-test.txt';
      const shareEmail = 'temp@example.com';
      
      await helper.uploadFile(fileName);
      await helper.shareFile(fileName, shareEmail);
      
      // Open share management
      await page.click(`[data-testid="manage-shares-${fileName}"]`);
      
      // Revoke access
      await page.click(`[data-testid="revoke-${shareEmail}"]`);
      await page.click('[data-testid="revoke-confirm"]');
      
      // Verify access revoked
      await expect(page.locator(`[data-testid="share-${shareEmail}"]`)).not.toBeVisible();
    });
  });

  test.describe('🗑️ File Deletion Operations', () => {
    test('should delete single file', async ({ page }) => {
      const fileName = 'delete-test.txt';
      
      await helper.uploadFile(fileName);
      await helper.verifyFileExists(fileName);
      
      await helper.deleteFile(fileName);
      await helper.verifyFileNotExists(fileName);
    });

    test('should delete multiple selected files', async ({ page }) => {
      const files = ['delete1.txt', 'delete2.txt', 'delete3.txt'];
      
      // Upload files
      for (const fileName of files) {
        await helper.uploadFile(fileName);
      }
      
      // Select all files
      for (const fileName of files) {
        await page.click(`[data-testid="select-${fileName}"]`);
      }
      
      // Delete selected files
      await page.click('[data-testid="delete-selected-button"]');
      await page.click('[data-testid="delete-confirm-button"]');
      
      // Verify all files deleted
      for (const fileName of files) {
        await helper.verifyFileNotExists(fileName);
      }
    });

    test('should move files to trash before permanent deletion', async ({ page }) => {
      const fileName = 'trash-test.txt';
      
      await helper.uploadFile(fileName);
      
      // Delete file (move to trash)
      await helper.deleteFile(fileName);
      
      // Navigate to trash
      await page.click('[data-testid="trash-link"]');
      
      // Verify file in trash
      await expect(page.locator(`[data-testid="trash-file-${fileName}"]`)).toBeVisible();
      
      // Restore file
      await page.click(`[data-testid="restore-${fileName}"]`);
      
      // Navigate back to files and verify restoration
      await helper.navigateToFiles();
      await helper.verifyFileExists(fileName);
    });
  });

  test.describe('📁 Folder Operations', () => {
    test('should create and organize files in folders', async ({ page }) => {
      const folderName = 'Test Folder';
      const fileName = 'folder-file.txt';
      
      // Create folder
      await helper.createTestFolder(folderName);
      
      // Navigate into folder
      await page.click(`[data-testid="folder-${folderName}"]`);
      
      // Upload file to folder
      await helper.uploadFile(fileName);
      
      // Verify file in folder
      await helper.verifyFileExists(fileName);
      
      // Navigate back and verify folder structure
      await page.click('[data-testid="breadcrumb-home"]');
      await expect(page.locator(`[data-testid="folder-${folderName}"]`)).toBeVisible();
    });

    test('should move files between folders', async ({ page }) => {
      const sourceFolder = 'Source Folder';
      const targetFolder = 'Target Folder';
      const fileName = 'move-test.txt';
      
      // Create folders
      await helper.createTestFolder(sourceFolder);
      await helper.createTestFolder(targetFolder);
      
      // Upload file to source folder
      await page.click(`[data-testid="folder-${sourceFolder}"]`);
      await helper.uploadFile(fileName);
      
      // Move file to target folder
      await page.click(`[data-testid="move-${fileName}"]`);
      await page.click(`[data-testid="select-folder-${targetFolder}"]`);
      await page.click('[data-testid="move-confirm"]');
      
      // Verify file moved
      await helper.verifyFileNotExists(fileName);
      
      // Check target folder
      await page.click('[data-testid="breadcrumb-home"]');
      await page.click(`[data-testid="folder-${targetFolder}"]`);
      await helper.verifyFileExists(fileName);
    });
  });

  test.describe('🔍 File Search and Filtering', () => {
    test('should search files by name', async ({ page }) => {
      const files = ['search-test1.txt', 'search-test2.txt', 'other-file.txt'];
      
      // Upload test files
      for (const fileName of files) {
        await helper.uploadFile(fileName);
      }
      
      // Search for files
      await page.fill('[data-testid="search-input"]', 'search-test');
      await page.click('[data-testid="search-button"]');
      
      // Verify search results
      await expect(page.locator('[data-testid="file-search-test1.txt"]')).toBeVisible();
      await expect(page.locator('[data-testid="file-search-test2.txt"]')).toBeVisible();
      await expect(page.locator('[data-testid="file-other-file.txt"]')).not.toBeVisible();
    });

    test('should filter files by type', async ({ page }) => {
      const files = [
        { name: 'document.txt', type: 'text' },
        { name: 'image.jpg', type: 'image' },
        { name: 'video.mp4', type: 'video' },
      ];
      
      // Upload files of different types
      for (const file of files) {
        await helper.uploadFile(file.name);
      }
      
      // Filter by image files
      await page.click('[data-testid="filter-button"]');
      await page.click('[data-testid="filter-images"]');
      
      // Verify only images shown
      await expect(page.locator('[data-testid="file-image.jpg"]')).toBeVisible();
      await expect(page.locator('[data-testid="file-document.txt"]')).not.toBeVisible();
      await expect(page.locator('[data-testid="file-video.mp4"]')).not.toBeVisible();
    });

    test('should sort files by different criteria', async ({ page }) => {
      const files = ['z-file.txt', 'a-file.txt', 'm-file.txt'];
      
      // Upload files
      for (const fileName of files) {
        await helper.uploadFile(fileName);
      }
      
      // Sort by name ascending
      await page.click('[data-testid="sort-dropdown"]');
      await page.click('[data-testid="sort-name-asc"]');
      
      // Verify sort order
      const fileList = page.locator('[data-testid="file-list"] [data-testid^="file-"]');
      const firstFile = await fileList.nth(0).getAttribute('data-testid');
      expect(firstFile).toBe('file-a-file.txt');
    });
  });

  test.describe('📊 File Analytics and Metadata', () => {
    test('should display file metadata', async ({ page }) => {
      const fileName = 'metadata-test.txt';
      
      await helper.uploadFile(fileName);
      
      // Open file details
      await page.click(`[data-testid="details-${fileName}"]`);
      
      // Verify metadata display
      await expect(page.locator('[data-testid="file-size"]')).toBeVisible();
      await expect(page.locator('[data-testid="file-type"]')).toBeVisible();
      await expect(page.locator('[data-testid="file-created"]')).toBeVisible();
      await expect(page.locator('[data-testid="file-modified"]')).toBeVisible();
    });

    test('should track file access analytics', async ({ page }) => {
      const fileName = 'analytics-test.txt';
      
      await helper.uploadFile(fileName);
      
      // Access file multiple times
      await page.click(`[data-testid="preview-${fileName}"]`);
      await page.click('[data-testid="close-preview"]');
      
      await page.click(`[data-testid="preview-${fileName}"]`);
      await page.click('[data-testid="close-preview"]');
      
      // Check analytics
      await page.click(`[data-testid="analytics-${fileName}"]`);
      
      // Verify access count
      await expect(page.locator('[data-testid="access-count"]')).toContainText('2');
    });
  });

  test.describe('🛡️ Security and Permissions', () => {
    test('should enforce file access permissions', async ({ page }) => {
      const fileName = 'secure-file.txt';
      
      await helper.uploadFile(fileName);
      
      // Set file as private
      await page.click(`[data-testid="security-${fileName}"]`);
      await page.click('[data-testid="set-private"]');
      
      // Verify security setting
      await expect(page.locator(`[data-testid="private-icon-${fileName}"]`)).toBeVisible();
    });

    test('should scan uploaded files for malware', async ({ page }) => {
      // Mock malware detection
      await page.route('**/api/upload', route => {
        route.fulfill({
          status: 400,
          body: JSON.stringify({ error: 'Malware detected in file' }),
        });
      });

      const fileName = 'suspicious-file.txt';
      await helper.uploadFile(fileName);
      
      // Verify malware warning
      await expect(page.locator('[data-testid="malware-warning"]')).toBeVisible();
    });
  });

  test.describe('⚡ Performance and Edge Cases', () => {
    test('should handle rapid file operations', async ({ page }) => {
      const files = Array.from({ length: 10 }, (_, i) => `rapid-${i}.txt`);
      
      // Rapid upload
      for (const fileName of files) {
        helper.uploadFile(fileName); // Don't await to test concurrency
      }
      
      // Wait for all uploads to complete
      for (const fileName of files) {
        await helper.verifyFileExists(fileName);
      }
    });

    test('should handle network interruptions', async ({ page }) => {
      const fileName = 'network-test.txt';
      
      // Start upload
      const fileInput = page.locator('[data-testid="file-upload-input"]');
      const tempPath = path.join(__dirname, 'temp', fileName);
      fs.writeFileSync(tempPath, TEST_FILES.small.content);
      
      // Intercept and delay upload
      await page.route('**/api/upload', route => {
        setTimeout(() => {
          route.fulfill({
            status: 200,
            body: JSON.stringify({ success: true }),
          });
        }, 5000);
      });
      
      await fileInput.setInputFiles(tempPath);
      
      // Simulate network disconnection during upload
      await page.setOffline(true);
      await page.setOffline(false);
      
      // Verify upload eventually completes
      await helper.verifyFileExists(fileName);
      
      fs.unlinkSync(tempPath);
    });

    test('should handle browser storage limits', async ({ page }) => {
      // Fill up localStorage to test storage limits
      await page.evaluate(() => {
        try {
          for (let i = 0; i < 1000; i++) {
            localStorage.setItem(`test_${i}`, 'x'.repeat(1000));
          }
        } catch (e) {
          // Storage full
        }
      });

      const fileName = 'storage-test.txt';
      await helper.uploadFile(fileName);
      
      // Verify upload still works despite storage issues
      await helper.verifyFileExists(fileName);
    });
  });
});
