// Storage utilities for SecureShare
// Provides persistent storage for file metadata and encrypted content

import { promises as fs } from 'fs';
import path from 'path';
import { config } from './config';
import { randomUUID } from 'crypto';

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

export interface Folder {
  id: string;
  name: string;
  parentId: string | null; // null for root folders
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface SharedLink {
  id: string;
  fileName: string;
  shareUrl: string;
  createdAt: string;
  expiresAt?: string;
  views: number;
  downloads: number;
  isPasswordProtected: boolean;
  isActive: boolean;
  userId?: string;
}

export class FileStorage {
  private static readonly STORAGE_DIR = path.resolve(config.storageDir);
  private static readonly FILES_DIR = path.join(this.STORAGE_DIR, 'files');
  private static readonly INDEX_FILE = path.join(this.STORAGE_DIR, 'index.json');
  private static readonly FOLDERS_DIR = path.join(this.STORAGE_DIR, 'folders');
  private static readonly FOLDERS_INDEX_FILE = path.join(this.STORAGE_DIR, 'folders_index.json');
  private static readonly SHARED_LINKS_INDEX_FILE = path.join(this.STORAGE_DIR, 'shared_links.json');

  /**
   * Initialize storage directories
   */
  static async init(): Promise<void> {
    try {
      await fs.mkdir(this.STORAGE_DIR, { recursive: true });
      await fs.mkdir(this.FILES_DIR, { recursive: true });
      await fs.mkdir(this.FOLDERS_DIR, { recursive: true });
      
      // Create index files if they don't exist
      try {
        await fs.access(this.INDEX_FILE);
      } catch {
        await fs.writeFile(this.INDEX_FILE, JSON.stringify({}));
      }      try {
        await fs.access(this.FOLDERS_INDEX_FILE);
      } catch {
        await fs.writeFile(this.FOLDERS_INDEX_FILE, JSON.stringify({}));
      }
      
      // Create shared links index if it doesn't exist
      try {
        await fs.access(this.SHARED_LINKS_INDEX_FILE);
      } catch {
        await fs.writeFile(this.SHARED_LINKS_INDEX_FILE, JSON.stringify({}));
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
        // Include files that belong to the user OR files without a userId (backward compatibility)
        if (fileMeta.userId === userId || (!fileMeta.userId && userId === 'anonymous')) {
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
      };    }
  }

  /**
   * Create a new folder
   */
  static async createFolder(folderData: Omit<Folder, 'id' | 'createdAt' | 'updatedAt'>): Promise<Folder> {
    await this.init();

    const folder: Folder = {
      ...folderData,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      const foldersIndexPath = path.join(this.STORAGE_DIR, 'folders-index.json');
      
      // Read existing folders index
      let foldersIndex: { folders: Record<string, Folder> } = { folders: {} };
      try {
        const indexContent = await fs.readFile(foldersIndexPath, 'utf-8');
        foldersIndex = JSON.parse(indexContent);
      } catch (error) {
        console.warn('Folders index file not found, creating new one', error);
        // File doesn't exist, use empty index
      }

      // Add new folder
      foldersIndex.folders[folder.id] = folder;

      // Save updated index
      await fs.writeFile(foldersIndexPath, JSON.stringify(foldersIndex, null, 2));

      console.log(`Folder ${folder.id} created successfully`);
      return folder;
    } catch (error) {
      console.error('Failed to create folder:', error);
      throw new Error('Folder creation failed');
    }
  }

  /**
   * Get all folders for a user
   */
  static async getUserFolders(userId: string): Promise<Folder[]> {
    await this.init();

    try {
      const foldersIndexPath = path.join(this.STORAGE_DIR, 'folders-index.json');
      
      try {
        const indexContent = await fs.readFile(foldersIndexPath, 'utf-8');
        const foldersIndex: { folders: Record<string, Folder> } = JSON.parse(indexContent);
        
        return Object.values(foldersIndex.folders)
          .filter(folder => folder.userId === userId || (!folder.userId && userId === 'anonymous'))
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      } catch (error) {
        console.warn('Folders index file not found', error);
        return [];
      }
    } catch (error) {
      console.error('Failed to get user folders:', error);
      return [];
    }
  }

  /**
   * Get a specific folder by ID
   */
  static async getFolder(folderId: string): Promise<Folder | null> {
    await this.init();

    try {
      const foldersIndexPath = path.join(this.STORAGE_DIR, 'folders-index.json');
      const indexContent = await fs.readFile(foldersIndexPath, 'utf-8');
      const foldersIndex: { folders: Record<string, Folder> } = JSON.parse(indexContent);
      
      return foldersIndex.folders[folderId] || null;
    } catch (error) {
      console.error('Failed to get folder:', error);
      return null;
    }
  }

  /**
   * Update a folder
   */
  static async updateFolder(folderId: string, updates: Partial<Pick<Folder, 'name' | 'parentId'>>): Promise<Folder | null> {
    await this.init();

    try {
      const foldersIndexPath = path.join(this.STORAGE_DIR, 'folders-index.json');
      const indexContent = await fs.readFile(foldersIndexPath, 'utf-8');
      const foldersIndex: { folders: Record<string, Folder> } = JSON.parse(indexContent);
      
      if (foldersIndex.folders[folderId]) {
        foldersIndex.folders[folderId] = {
          ...foldersIndex.folders[folderId],
          ...updates,
          updatedAt: new Date().toISOString(),
        };

        await fs.writeFile(foldersIndexPath, JSON.stringify(foldersIndex, null, 2));
        return foldersIndex.folders[folderId];
      }
      
      return null;
    } catch (error) {
      console.error('Failed to update folder:', error);
      return null;
    }
  }
  /**
   * Delete a folder
   */
  static async deleteFolder(folderId: string): Promise<boolean> {
    await this.init();

    try {
      const foldersIndexPath = path.join(this.STORAGE_DIR, 'folders-index.json');
      const indexContent = await fs.readFile(foldersIndexPath, 'utf-8');
      const foldersIndex: { folders: Record<string, Folder> } = JSON.parse(indexContent);
      
      if (foldersIndex.folders[folderId]) {
        delete foldersIndex.folders[folderId];
        await fs.writeFile(foldersIndexPath, JSON.stringify(foldersIndex, null, 2));
        console.log(`Folder ${folderId} deleted successfully`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to delete folder:', error);
      return false;
    }
  }

  /**
   * Create a new shared link for a file
   */
  static async createSharedLink(fileId: string, userId?: string, expiresAt?: string): Promise<SharedLink | null> {
    await this.init();

    // Check if file exists
    const file = await this.getFile(fileId);
    if (!file) {
      throw new Error('File not found');
    }

    const sharedLink: SharedLink = {
      id: fileId, // Use file ID as share link ID
      fileName: file.fileName,
      shareUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/share/${fileId}`,
      createdAt: new Date().toISOString(),
      expiresAt,
      views: 0,
      downloads: 0,
      isPasswordProtected: file.isPasswordProtected,
      isActive: true,
      userId: userId || file.userId,
    };

    try {
      const indexContent = await fs.readFile(this.SHARED_LINKS_INDEX_FILE, 'utf-8');
      const index = JSON.parse(indexContent);
      
      index[fileId] = sharedLink;
      
      await fs.writeFile(this.SHARED_LINKS_INDEX_FILE, JSON.stringify(index, null, 2));
      
      console.log(`Shared link created for file ${fileId}`);
      return sharedLink;
    } catch (error) {
      console.error('Failed to create shared link:', error);
      throw new Error('Shared link creation failed');
    }
  }

  /**
   * Get all shared links for a user
   */
  static async getUserSharedLinks(userId: string): Promise<SharedLink[]> {
    await this.init();

    try {
      const indexContent = await fs.readFile(this.SHARED_LINKS_INDEX_FILE, 'utf-8');
      const index = JSON.parse(indexContent);

      const userLinks: SharedLink[] = [];

      for (const [fileId, linkData] of Object.entries(index)) {
        console.log("🚀 ~ FileStorage ~ getUserSharedLinks ~ fileId:", fileId)
        const link = linkData as SharedLink;
        // Include links that belong to the user OR links without a userId (backward compatibility)
        if (link.userId === userId || (!link.userId && userId === 'anonymous')) {
          userLinks.push(link);
        }
      }

      return userLinks.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } catch (error) {
      console.error('Failed to get user shared links:', error);
      return [];
    }
  }

  /**
   * Get a specific shared link
   */
  static async getSharedLink(fileId: string): Promise<SharedLink | null> {
    await this.init();

    try {
      const indexContent = await fs.readFile(this.SHARED_LINKS_INDEX_FILE, 'utf-8');
      const index = JSON.parse(indexContent);
      
      return index[fileId] || null;
    } catch (error) {
      console.error('Failed to get shared link:', error);
      return null;
    }
  }

  /**
   * Update shared link analytics (views/downloads)
   */
  static async updateSharedLinkAnalytics(fileId: string, type: 'view' | 'download'): Promise<void> {
    await this.init();

    try {
      const indexContent = await fs.readFile(this.SHARED_LINKS_INDEX_FILE, 'utf-8');
      const index = JSON.parse(indexContent);
      
      if (index[fileId]) {
        if (type === 'view') {
          index[fileId].views = (index[fileId].views || 0) + 1;
        } else if (type === 'download') {
          index[fileId].downloads = (index[fileId].downloads || 0) + 1;
        }
        
        await fs.writeFile(this.SHARED_LINKS_INDEX_FILE, JSON.stringify(index, null, 2));
        console.log(`Updated ${type} count for shared link ${fileId}`);
      }
    } catch (error) {
      console.error('Failed to update shared link analytics:', error);
    }
  }

  /**
   * Delete a shared link
   */
  static async deleteSharedLink(fileId: string): Promise<boolean> {
    await this.init();

    try {
      const indexContent = await fs.readFile(this.SHARED_LINKS_INDEX_FILE, 'utf-8');
      const index = JSON.parse(indexContent);
      
      if (index[fileId]) {
        delete index[fileId];
        await fs.writeFile(this.SHARED_LINKS_INDEX_FILE, JSON.stringify(index, null, 2));
        console.log(`Shared link ${fileId} deleted successfully`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to delete shared link:', error);
      return false;
    }
  }

  /**
   * Check if a shared link is valid and active
   */
  static async isSharedLinkValid(fileId: string): Promise<boolean> {
    const link = await this.getSharedLink(fileId);
    if (!link || !link.isActive) {
      return false;
    }

    // Check if expired
    if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
      return false;
    }

    return true;
  }
}
