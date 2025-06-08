// Integration tests for storage service
import { FileStorage } from '@/lib/storage';
import { config } from '@/lib/config';
import path from 'path';
import fs from 'fs/promises';

// Use real file system for integration testing
const testStorageDir = './test-data-integration';

describe('FileStorage Integration Tests', () => {
  beforeAll(async () => {
    // Override config for testing
    (config as any).storageDir = testStorageDir;
    
    // Ensure test directory exists
    try {
      await fs.mkdir(testStorageDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
    
    await FileStorage.init();
  });

  afterAll(async () => {
    // Cleanup test directory
    try {
      await fs.rm(testStorageDir, { recursive: true, force: true });
    } catch (error) {
      console.warn('Could not clean up test directory:', error);
    }
  });

  beforeEach(async () => {
    // Clean up any existing test files
    try {
      const files = await fs.readdir(path.join(testStorageDir, 'files'));
      for (const file of files) {
        if (file !== '.gitkeep') {
          await fs.unlink(path.join(testStorageDir, 'files', file));
        }
      }
    } catch (error) {
      // Files directory might not exist yet
    }
  });

  it('should initialize storage directories', async () => {
    await FileStorage.init();
    
    const filesDir = path.join(testStorageDir, 'files');
    const foldersDir = path.join(testStorageDir, 'folders');
    
    const filesDirStats = await fs.stat(filesDir);
    const foldersDirStats = await fs.stat(foldersDir);
    
    expect(filesDirStats.isDirectory()).toBe(true);
    expect(foldersDirStats.isDirectory()).toBe(true);
  });

  it('should save and retrieve a file', async () => {
    const testFile = {
      id: 'test-file-12345',
      fileName: 'test.txt',
      fileSize: 1024,
      encryptedContent: 'encrypted-test-content-base64',
      salt: 'test-salt-base64',
      iv: 'test-iv-base64',
      key: null,
      isPasswordProtected: true,
      createdAt: new Date().toISOString(),
      userId: 'test-user-123',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };

    await FileStorage.saveFile(testFile);
    
    const retrievedFile = await FileStorage.getFile('test-file-12345');
    
    expect(retrievedFile).not.toBeNull();
    expect(retrievedFile?.id).toBe(testFile.id);
    expect(retrievedFile?.fileName).toBe(testFile.fileName);
    expect(retrievedFile?.fileSize).toBe(testFile.fileSize);
    expect(retrievedFile?.encryptedContent).toBe(testFile.encryptedContent);
  });

  it('should retrieve file metadata only', async () => {
    const testFile = {
      id: 'test-metadata-456',
      fileName: 'metadata-test.txt',
      fileSize: 2048,
      encryptedContent: 'large-encrypted-content',
      salt: 'salt',
      iv: 'iv',
      key: null,
      isPasswordProtected: false,
      createdAt: new Date().toISOString(),
      userId: 'test-user-456',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };

    await FileStorage.saveFile(testFile);
    
    const metadata = await FileStorage.getFileMetadata('test-metadata-456');
    
    expect(metadata).not.toBeNull();
    expect(metadata?.id).toBe(testFile.id);
    expect(metadata?.fileName).toBe(testFile.fileName);
    expect(metadata?.fileSize).toBe(testFile.fileSize);
    // Should not include encrypted content in metadata
    expect((metadata as any)?.encryptedContent).toBeUndefined();
  });

  it('should delete a file', async () => {
    const testFile = {
      id: 'test-delete-789',
      fileName: 'delete-test.txt',
      fileSize: 512,
      encryptedContent: 'content-to-delete',
      salt: 'salt',
      iv: 'iv',
      key: null,
      isPasswordProtected: false,
      createdAt: new Date().toISOString(),
      userId: 'test-user-789',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };

    await FileStorage.saveFile(testFile);
    
    // Verify file exists
    const existingFile = await FileStorage.getFile('test-delete-789');
    expect(existingFile).not.toBeNull();
    
    // Delete the file
    const deleted = await FileStorage.deleteFile('test-delete-789');
    expect(deleted).toBe(true);
    
    // Verify file is gone
    const deletedFile = await FileStorage.getFile('test-delete-789');
    expect(deletedFile).toBeNull();
  });

  it('should list user files', async () => {
    const userId = 'test-user-list';
    const testFiles = [
      {
        id: 'file1',
        fileName: 'file1.txt',
        fileSize: 100,
        encryptedContent: 'content1',
        salt: 'salt1',
        iv: 'iv1',
        key: null,
        isPasswordProtected: false,
        createdAt: new Date().toISOString(),
        userId,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'file2',
        fileName: 'file2.txt',
        fileSize: 200,
        encryptedContent: 'content2',
        salt: 'salt2',
        iv: 'iv2',
        key: null,
        isPasswordProtected: true,
        createdAt: new Date().toISOString(),
        userId,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      },
    ];

    for (const file of testFiles) {
      await FileStorage.saveFile(file);
    }
    
    const userFiles = await FileStorage.listUserFiles(userId);
    
    expect(userFiles).toHaveLength(2);
    expect(userFiles.map(f => f.id).sort()).toEqual(['file1', 'file2']);
  });

  it('should get storage statistics', async () => {
    const stats = await FileStorage.getStats();
    
    expect(stats).toHaveProperty('totalFiles');
    expect(stats).toHaveProperty('totalSize');
    expect(stats).toHaveProperty('storageDir');
    expect(typeof stats.totalFiles).toBe('number');
    expect(typeof stats.totalSize).toBe('number');
    expect(stats.totalFiles).toBeGreaterThanOrEqual(0);
    expect(stats.totalSize).toBeGreaterThanOrEqual(0);
  });

  it('should handle file not found', async () => {
    const nonExistentFile = await FileStorage.getFile('non-existent-file');
    expect(nonExistentFile).toBeNull();
    
    const nonExistentMetadata = await FileStorage.getFileMetadata('non-existent-file');
    expect(nonExistentMetadata).toBeNull();
    
    const deleteResult = await FileStorage.deleteFile('non-existent-file');
    expect(deleteResult).toBe(false);
  });

  it('should handle concurrent file operations', async () => {
    const concurrentFiles = Array.from({ length: 10 }, (_, i) => ({
      id: `concurrent-file-${i}`,
      fileName: `concurrent-${i}.txt`,
      fileSize: 100 + i,
      encryptedContent: `content-${i}`,
      salt: `salt-${i}`,
      iv: `iv-${i}`,
      key: null,
      isPasswordProtected: i % 2 === 0,
      createdAt: new Date().toISOString(),
      userId: 'concurrent-user',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    }));

    // Save all files concurrently
    await Promise.all(concurrentFiles.map(file => FileStorage.saveFile(file)));
    
    // Retrieve all files concurrently
    const retrievedFiles = await Promise.all(
      concurrentFiles.map(file => FileStorage.getFile(file.id))
    );
    
    expect(retrievedFiles).toHaveLength(10);
    expect(retrievedFiles.every(file => file !== null)).toBe(true);
    
    // Clean up
    await Promise.all(
      concurrentFiles.map(file => FileStorage.deleteFile(file.id))
    );
  });

  it('should handle expired files in cleanup', async () => {
    const expiredFile = {
      id: 'expired-file',
      fileName: 'expired.txt',
      fileSize: 100,
      encryptedContent: 'expired-content',
      salt: 'salt',
      iv: 'iv',
      key: null,
      isPasswordProtected: false,
      createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(), // 25 hours ago
      userId: 'test-user',
      expiresAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // Expired 1 hour ago
    };

    await FileStorage.saveFile(expiredFile);
    
    // Run cleanup
    const cleanupResult = await FileStorage.cleanupExpiredFiles();
    
    // Check if expired file was removed
    const expiredFileAfterCleanup = await FileStorage.getFile('expired-file');
    expect(expiredFileAfterCleanup).toBeNull();
  });
});
