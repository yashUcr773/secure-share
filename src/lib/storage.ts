// Storage utilities for SecureShare
// Provides persistent storage for file metadata and encrypted content

import { promises as fs } from 'fs';
import path from 'path';
import { config } from './config';

export interface StoredFile {
  id: string;
  fileName: string;
  fileSize: number;
  encryptedContent: string;
  salt: string | null;
  iv: string;
  key: string | null;
  isPasswordProtected: boolean;
  createdAt: string;
  updatedAt: string;
  userId?: string; // For future authentication
}

export class FileStorage {
  private static readonly STORAGE_DIR = path.resolve(config.storageDir);
  private static readonly FILES_DIR = path.join(this.STORAGE_DIR, 'files');
  private static readonly INDEX_FILE = path.join(this.STORAGE_DIR, 'index.json');

  /**
   * Initialize storage directories
   */
  static async init(): Promise<void> {
    try {
      await fs.mkdir(this.STORAGE_DIR, { recursive: true });
      await fs.mkdir(this.FILES_DIR, { recursive: true });
      
      // Create index file if it doesn't exist
      try {
        await fs.access(this.INDEX_FILE);
      } catch {
        await fs.writeFile(this.INDEX_FILE, JSON.stringify({}));
      }
    } catch (error) {
      console.error('Failed to initialize storage:', error);
      throw new Error('Storage initialization failed');
    }
  }

  /**
   * Save a file to persistent storage
   */
  static async saveFile(fileData: Omit<StoredFile, 'updatedAt'>): Promise<void> {
    await this.init();

    const file: StoredFile = {
      ...fileData,
      updatedAt: new Date().toISOString(),
    };

    try {
      // Save file data to individual file
      const filePath = path.join(this.FILES_DIR, `${file.id}.json`);
      await fs.writeFile(filePath, JSON.stringify(file, null, 2));

      // Update index
      await this.updateIndex(file.id, {
        fileName: file.fileName,
        fileSize: file.fileSize,
        isPasswordProtected: file.isPasswordProtected,
        createdAt: file.createdAt,
        updatedAt: file.updatedAt,
        userId: file.userId,
      });

      console.log(`File ${file.id} saved successfully`);
    } catch (error) {
      console.error('Failed to save file:', error);
      throw new Error('File save failed');
    }
  }

  /**
   * Retrieve a file by ID
   */
  static async getFile(id: string): Promise<StoredFile | null> {
    await this.init();

    try {
      const filePath = path.join(this.FILES_DIR, `${id}.json`);
      const fileContent = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(fileContent) as StoredFile;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null; // File not found
      }
      console.error('Failed to retrieve file:', error);
      throw new Error('File retrieval failed');
    }
  }

  /**
   * Get file metadata without encrypted content (for security)
   */
  static async getFileMetadata(id: string): Promise<Omit<StoredFile, 'encryptedContent'> | null> {
    const file = await this.getFile(id);
    if (!file) return null;

    const { ...metadata } = file;
    return metadata;
  }

  /**
   * Get all files for a user (for dashboard)
   */
  static async getUserFiles(userId: string): Promise<Omit<StoredFile, 'encryptedContent'>[]> {
    await this.init();

    try {
      const indexContent = await fs.readFile(this.INDEX_FILE, 'utf-8');
      const index = JSON.parse(indexContent);

      const userFiles: Omit<StoredFile, 'encryptedContent'>[] = [];

      for (const [fileId, metadata] of Object.entries(index)) {
        const fileMeta = metadata as StoredFile;
        if (fileMeta.userId === userId) {
          const fullFile = await this.getFile(fileId);
          if (fullFile) {
            const { ...meta } = fullFile;
            userFiles.push(meta);
          }
        }
      }

      return userFiles.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } catch (error) {
      console.error('Failed to get user files:', error);
      return [];
    }
  }

  /**
   * Delete a file
   */
  static async deleteFile(id: string): Promise<boolean> {
    await this.init();

    try {
      // Remove file
      const filePath = path.join(this.FILES_DIR, `${id}.json`);
      await fs.unlink(filePath);

      // Remove from index
      await this.removeFromIndex(id);

      console.log(`File ${id} deleted successfully`);
      return true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return false; // File not found
      }
      console.error('Failed to delete file:', error);
      throw new Error('File deletion failed');
    }
  }

  /**
   * Update the index file
   */
  private static async updateIndex(
    fileId: string, 
    metadata: Omit<StoredFile, 'id' | 'encryptedContent' | 'salt' | 'iv' | 'key'>
  ): Promise<void> {
    try {
      const indexContent = await fs.readFile(this.INDEX_FILE, 'utf-8');
      const index = JSON.parse(indexContent);
      
      index[fileId] = metadata;
      
      await fs.writeFile(this.INDEX_FILE, JSON.stringify(index, null, 2));
    } catch (error) {
      console.error('Failed to update index:', error);
      throw new Error('Index update failed');
    }
  }

  /**
   * Remove file from index
   */
  private static async removeFromIndex(fileId: string): Promise<void> {
    try {
      const indexContent = await fs.readFile(this.INDEX_FILE, 'utf-8');
      const index = JSON.parse(indexContent);
      
      delete index[fileId];
      
      await fs.writeFile(this.INDEX_FILE, JSON.stringify(index, null, 2));
    } catch (error) {
      console.error('Failed to remove from index:', error);
      throw new Error('Index removal failed');
    }
  }

  /**
   * Clean up old files (for maintenance)
   */
  static async cleanupOldFiles(daysOld: number = 30): Promise<number> {
    await this.init();

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    let deletedCount = 0;

    try {
      const indexContent = await fs.readFile(this.INDEX_FILE, 'utf-8');
      const index = JSON.parse(indexContent);

      for (const [fileId, metadata] of Object.entries(index)) {
        const fileMeta = metadata as StoredFile;
        const createdAt = new Date(fileMeta.createdAt);
        
        if (createdAt < cutoffDate) {
          await this.deleteFile(fileId);
          deletedCount++;
        }
      }

      console.log(`Cleanup completed: ${deletedCount} files deleted`);
      return deletedCount;
    } catch (error) {
      console.error('Cleanup failed:', error);
      return deletedCount;
    }
  }

  /**
   * Get storage statistics
   */
  static async getStats(): Promise<{
    totalFiles: number;
    totalSize: number;
    oldestFile: string | null;
    newestFile: string | null;
  }> {
    await this.init();

    try {
      const indexContent = await fs.readFile(this.INDEX_FILE, 'utf-8');
      const index = JSON.parse(indexContent);

      const files = Object.entries(index);
      let totalSize = 0;
      let oldestDate = new Date();
      let newestDate = new Date(0);
      let oldestFile = null;
      let newestFile = null;

      for (const [x, metadata] of files) {
        console.log(x)
        const fileMeta = metadata as StoredFile;
        totalSize += fileMeta.fileSize || 0;
        
        const createdAt = new Date(fileMeta.createdAt);
        if (createdAt < oldestDate) {
          oldestDate = createdAt;
          oldestFile = fileMeta.fileName;
        }
        if (createdAt > newestDate) {
          newestDate = createdAt;
          newestFile = fileMeta.fileName;
        }
      }

      return {
        totalFiles: files.length,
        totalSize,
        oldestFile,
        newestFile,
      };
    } catch (error) {
      console.error('Failed to get stats:', error);
      return {
        totalFiles: 0,
        totalSize: 0,
        oldestFile: null,
        newestFile: null,
      };
    }
  }
}
