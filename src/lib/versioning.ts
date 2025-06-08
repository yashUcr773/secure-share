// File versioning service for SecureShare
// Handles file version tracking, storage, and retrieval

import { prisma } from './database';

export interface FileVersion {
  id: string;
  fileId: string;
  versionNumber: number;
  fileName: string;
  fileSize: number;
  encryptedContent: string;
  salt: string;
  iv: string;
  checksum: string;
  createdAt: Date;
  userId: string; // Changed from createdBy to match Prisma schema
  changeDescription?: string | null;
}

export interface VersionDiff {
  type: 'added' | 'modified' | 'deleted';
  path: string;
  oldValue?: unknown;
  newValue?: unknown;
}

export class VersioningService {
  /**
   * Create a new version of a file
   */
  static async createVersion(
    fileId: string,
    userId: string,
    encryptedContent: string,
    salt: string,
    iv: string,
    fileName?: string,
    changeDescription?: string
  ): Promise<FileVersion> {
    // Get the current file
    const currentFile = await prisma.file.findUnique({
      where: { id: fileId },
      include: {
        versions: {
          orderBy: { versionNumber: 'desc' },
          take: 1
        }
      }
    });

    if (!currentFile) {
      throw new Error('File not found');
    }

    if (currentFile.userId !== userId) {
      throw new Error('Unauthorized to modify this file');
    }    // Calculate the next version number
    const lastVersion = (currentFile as { versions?: Array<{ versionNumber: number }> }).versions?.[0];
    const nextVersionNumber = lastVersion ? lastVersion.versionNumber + 1 : 1;

    // Calculate checksum for integrity
    const checksum = await this.calculateChecksum(encryptedContent);    // Create the new version
    const version = await prisma.$transaction(async (tx) => {
      // Create new version
      const newVersion = await tx.fileVersion.create({
        data: {
          fileId,
          versionNumber: nextVersionNumber,
          fileName: fileName || currentFile.fileName,
          fileSize: Buffer.byteLength(encryptedContent, 'base64'),
          encryptedContent,
          salt,
          iv,
          checksum,
          userId: userId,
          changeDescription
        }
      });

      // Update the main file record with the latest version info
      await tx.file.update({
        where: { id: fileId },
        data: {
          fileName: fileName || currentFile.fileName,
          fileSize: newVersion.fileSize,
          encryptedContent,
          salt,
          iv,
          updatedAt: new Date()
        }
      });

      return newVersion;
    });

    return version as FileVersion;
  }

  /**
   * Get all versions of a file
   */
  static async getFileVersions(fileId: string, userId: string): Promise<FileVersion[]> {
    // Verify user has access to the file
    const file = await prisma.file.findUnique({
      where: { id: fileId },
      select: { userId: true }
    });

    if (!file || file.userId !== userId) {
      throw new Error('File not found or access denied');
    }    const versions = await prisma.fileVersion.findMany({
      where: { fileId },
      orderBy: { versionNumber: 'desc' },
      select: {
        id: true,
        fileId: true,
        versionNumber: true,
        fileName: true,
        fileSize: true,
        checksum: true,
        createdAt: true,
        userId: true,
        changeDescription: true,
        // Don't include encrypted content in list view for performance
        encryptedContent: false,
        salt: false,
        iv: false
      }
    });

    return versions as FileVersion[];
  }

  /**
   * Get a specific version of a file
   */
  static async getFileVersion(
    versionId: string,
    userId: string
  ): Promise<FileVersion | null> {
    const version = await prisma.fileVersion.findUnique({
      where: { id: versionId },
      include: {
        file: {
          select: { userId: true }
        }
      }
    });

    if (!version || version.file.userId !== userId) {
      return null;
    }    return {
      id: version.id,
      fileId: version.fileId,
      versionNumber: version.versionNumber,
      fileName: version.fileName,
      fileSize: version.fileSize,
      encryptedContent: version.encryptedContent,
      salt: version.salt,
      iv: version.iv,
      checksum: version.checksum,
      createdAt: version.createdAt,
      userId: version.userId,
      changeDescription: version.changeDescription
    };
  }

  /**
   * Restore a file to a specific version
   */
  static async restoreToVersion(
    fileId: string,
    versionId: string,
    userId: string,
    changeDescription?: string
  ): Promise<FileVersion> {
    const targetVersion = await this.getFileVersion(versionId, userId);
    
    if (!targetVersion) {
      throw new Error('Version not found or access denied');
    }

    // Create a new version based on the target version
    const restoredVersion = await this.createVersion(
      fileId,
      userId,
      targetVersion.encryptedContent,
      targetVersion.salt,
      targetVersion.iv,
      targetVersion.fileName,
      changeDescription || `Restored from version ${targetVersion.versionNumber}`
    );

    return restoredVersion;
  }

  /**
   * Delete a specific version (soft delete)
   */
  static async deleteVersion(
    versionId: string,
    userId: string
  ): Promise<boolean> {
    const version = await prisma.fileVersion.findUnique({
      where: { id: versionId },
      include: {
        file: {
          select: { userId: true }
        }
      }
    });    if (!version || version.file.userId !== userId) {
      throw new Error('Version not found or access denied');
    }

    // Check if this is the latest version (we shouldn't delete the latest version)
    const latestVersion = await prisma.fileVersion.findFirst({
      where: { fileId: version.fileId },
      orderBy: { versionNumber: 'desc' }
    });

    if (latestVersion && version.versionNumber === latestVersion.versionNumber) {
      throw new Error('Cannot delete the latest version');
    }

    await prisma.fileVersion.delete({
      where: { id: versionId }
    });

    return true;
  }

  /**
   * Compare two versions of a file
   */
  static async compareVersions(
    fileId: string,
    versionId1: string,
    versionId2: string,
    userId: string
  ): Promise<{
    version1: Omit<FileVersion, 'encryptedContent'>;
    version2: Omit<FileVersion, 'encryptedContent'>;
    differences: VersionDiff[];
  }> {
    const [version1, version2] = await Promise.all([
      this.getFileVersion(versionId1, userId),
      this.getFileVersion(versionId2, userId)
    ]);

    if (!version1 || !version2) {
      throw new Error('One or both versions not found');
    }

    if (version1.fileId !== fileId || version2.fileId !== fileId) {
      throw new Error('Versions must belong to the same file');
    }

    const differences: VersionDiff[] = [];

    // Compare basic properties
    if (version1.fileName !== version2.fileName) {
      differences.push({
        type: 'modified',
        path: 'fileName',
        oldValue: version1.fileName,
        newValue: version2.fileName
      });
    }

    if (version1.fileSize !== version2.fileSize) {
      differences.push({
        type: 'modified',
        path: 'fileSize',
        oldValue: version1.fileSize,
        newValue: version2.fileSize
      });
    }

    if (version1.checksum !== version2.checksum) {
      differences.push({
        type: 'modified',
        path: 'content',
        oldValue: 'Content changed',
        newValue: 'Content changed'
      });
    }    return {
      version1: {
        id: version1.id,
        fileId: version1.fileId,
        versionNumber: version1.versionNumber,
        fileName: version1.fileName,
        fileSize: version1.fileSize,
        salt: version1.salt,
        iv: version1.iv,
        checksum: version1.checksum,
        createdAt: version1.createdAt,
        userId: version1.userId,
        changeDescription: version1.changeDescription
      },
      version2: {
        id: version2.id,
        fileId: version2.fileId,
        versionNumber: version2.versionNumber,
        fileName: version2.fileName,
        fileSize: version2.fileSize,
        salt: version2.salt,
        iv: version2.iv,
        checksum: version2.checksum,
        createdAt: version2.createdAt,
        userId: version2.userId,
        changeDescription: version2.changeDescription
      },
      differences
    };
  }

  /**
   * Get version statistics for a file
   */
  static async getVersionStats(fileId: string, userId: string): Promise<{
    totalVersions: number;
    totalSize: number;
    oldestVersion: Date;
    newestVersion: Date;
    activeVersion: number;
  }> {
    // Verify access
    const file = await prisma.file.findUnique({
      where: { id: fileId },
      select: { userId: true }
    });

    if (!file || file.userId !== userId) {
      throw new Error('File not found or access denied');
    }

    const stats = await prisma.fileVersion.aggregate({
      where: { fileId },
      _count: { id: true },
      _sum: { fileSize: true },
      _min: { createdAt: true },
      _max: { createdAt: true }
    });    const activeVersion = await prisma.fileVersion.findFirst({
      where: { fileId },
      orderBy: { versionNumber: 'desc' },
      select: { versionNumber: true }
    });

    return {
      totalVersions: stats._count.id || 0,
      totalSize: stats._sum.fileSize || 0,
      oldestVersion: stats._min.createdAt || new Date(),
      newestVersion: stats._max.createdAt || new Date(),
      activeVersion: activeVersion?.versionNumber || 1
    };
  }

  /**
   * Cleanup old versions (keep only N latest versions)
   */
  static async cleanupOldVersions(
    fileId: string,
    userId: string,
    keepVersions: number = 10
  ): Promise<number> {
    // Verify access
    const file = await prisma.file.findUnique({
      where: { id: fileId },
      select: { userId: true }
    });

    if (!file || file.userId !== userId) {
      throw new Error('File not found or access denied');
    }    // Get versions to delete (keeping only the latest N versions)
    const versionsToDelete = await prisma.fileVersion.findMany({
      where: {
        fileId
      },
      orderBy: { versionNumber: 'desc' },
      skip: keepVersions, // Keep only the latest N versions
      select: { id: true }
    });

    if (versionsToDelete.length === 0) {
      return 0;
    }

    const deleteResult = await prisma.fileVersion.deleteMany({
      where: {
        id: {
          in: versionsToDelete.map(v => v.id)
        }
      }
    });

    return deleteResult.count;
  }

  /**
   * Calculate checksum for file integrity
   */
  private static async calculateChecksum(content: string): Promise<string> {
    const crypto = await import('crypto');
    return crypto.createHash('sha256').update(content).digest('hex');
  }
}
