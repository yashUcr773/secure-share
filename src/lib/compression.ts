// File compression utilities for SecureShare
// Provides compression for file storage and transfer optimization

import { createGzip, createGunzip, gzip, gunzip } from 'zlib';
import { promisify } from 'util';

// Promisified compression functions
const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

// Compression configuration
const COMPRESSION_CONFIG = {
  level: 6, // Balanced compression level (1-9)
  chunkSize: 16 * 1024, // 16KB chunks
  memLevel: 8, // Memory usage level (1-9)
  threshold: 1024, // Only compress files larger than 1KB
  mimeTypes: [
    'text/plain',
    'text/html',
    'text/css',
    'text/javascript',
    'application/json',
    'application/xml',
    'text/xml',
    'text/markdown',
    'text/csv',
  ],
};

// Compression result interface
export interface CompressionResult {
  compressed: boolean;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  data: Buffer;
  algorithm: 'gzip' | 'none';
}

// Decompression result interface
export interface DecompressionResult {
  decompressed: boolean;
  originalSize: number;
  data: Buffer;
  algorithm: 'gzip' | 'none';
}

export class CompressionService {
  /**
   * Compress data using gzip
   */
  static async compress(
    data: string | Buffer,
    options: {
      level?: number;
      forceCompression?: boolean;
      mimeType?: string;
    } = {}
  ): Promise<CompressionResult> {
    const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf-8');
    const originalSize = buffer.length;

    // Check if compression should be applied
    const shouldCompress = this.shouldCompress(originalSize, options.mimeType, options.forceCompression);

    if (!shouldCompress) {
      return {
        compressed: false,
        originalSize,
        compressedSize: originalSize,
        compressionRatio: 1,
        data: buffer,
        algorithm: 'none',
      };
    }

    try {
      const compressedData = await gzipAsync(buffer, {
        level: options.level || COMPRESSION_CONFIG.level,
        chunkSize: COMPRESSION_CONFIG.chunkSize,
        memLevel: COMPRESSION_CONFIG.memLevel,
      });

      const compressedSize = compressedData.length;
      const compressionRatio = originalSize / compressedSize;

      // If compression doesn't save significant space, return original
      if (compressionRatio < 1.1) {
        return {
          compressed: false,
          originalSize,
          compressedSize: originalSize,
          compressionRatio: 1,
          data: buffer,
          algorithm: 'none',
        };
      }

      return {
        compressed: true,
        originalSize,
        compressedSize,
        compressionRatio,
        data: compressedData,
        algorithm: 'gzip',
      };
    } catch (error) {
      console.error('Compression error:', error);
      return {
        compressed: false,
        originalSize,
        compressedSize: originalSize,
        compressionRatio: 1,
        data: buffer,
        algorithm: 'none',
      };
    }
  }

  /**
   * Decompress gzip data
   */
  static async decompress(
    data: Buffer,
    algorithm: 'gzip' | 'none' = 'gzip'
  ): Promise<DecompressionResult> {
    if (algorithm === 'none') {
      return {
        decompressed: false,
        originalSize: data.length,
        data,
        algorithm: 'none',
      };
    }

    try {
      const decompressedData = await gunzipAsync(data);
      
      return {
        decompressed: true,
        originalSize: decompressedData.length,
        data: decompressedData,
        algorithm: 'gzip',
      };
    } catch (error) {
      console.error('Decompression error:', error);
      throw new Error('Failed to decompress data');
    }
  }

  /**
   * Check if data should be compressed
   */
  private static shouldCompress(
    size: number,
    mimeType?: string,
    forceCompression?: boolean
  ): boolean {
    if (forceCompression) return true;
    
    // Don't compress small files
    if (size < COMPRESSION_CONFIG.threshold) return false;

    // Don't compress already compressed formats
    if (mimeType) {
      const isCompressibleType = COMPRESSION_CONFIG.mimeTypes.some(type => 
        mimeType.includes(type)
      );
      
      // Skip binary or already compressed formats
      if (mimeType.includes('image/') || 
          mimeType.includes('video/') || 
          mimeType.includes('audio/') ||
          mimeType.includes('application/zip') ||
          mimeType.includes('application/gzip')) {
        return false;
      }

      return isCompressibleType;
    }

    return true;
  }

  /**
   * Compress file content for storage
   */
  static async compressFileContent(
    content: string,
    fileName: string
  ): Promise<{
    content: string; // Base64 encoded
    compressed: boolean;
    algorithm: string;
    originalSize: number;
    compressedSize: number;
  }> {
    const mimeType = this.getMimeTypeFromFileName(fileName);
    const result = await this.compress(content, { mimeType });

    return {
      content: result.data.toString('base64'),
      compressed: result.compressed,
      algorithm: result.algorithm,
      originalSize: result.originalSize,
      compressedSize: result.compressedSize,
    };
  }

  /**
   * Decompress file content from storage
   */
  static async decompressFileContent(
    content: string, // Base64 encoded
    algorithm: string = 'gzip'
  ): Promise<string> {
    const buffer = Buffer.from(content, 'base64');
    
    if (algorithm === 'none') {
      return buffer.toString('utf-8');
    }

    const result = await this.decompress(buffer, algorithm as 'gzip' | 'none');
    return result.data.toString('utf-8');
  }

  /**
   * Stream compression for large files
   */
  static createCompressionStream(options: {
    level?: number;
  } = {}) {
    return createGzip({
      level: options.level || COMPRESSION_CONFIG.level,
      chunkSize: COMPRESSION_CONFIG.chunkSize,
      memLevel: COMPRESSION_CONFIG.memLevel,
    });
  }

  /**
   * Stream decompression for large files
   */
  static createDecompressionStream() {
    return createGunzip({
      chunkSize: COMPRESSION_CONFIG.chunkSize,
    });
  }

  /**
   * Get MIME type from file name
   */
  private static getMimeTypeFromFileName(fileName: string): string {
    const ext = fileName.toLowerCase().split('.').pop() || '';
    
    const mimeTypeMap: Record<string, string> = {
      'txt': 'text/plain',
      'html': 'text/html',
      'htm': 'text/html',
      'css': 'text/css',
      'js': 'text/javascript',
      'json': 'application/json',
      'xml': 'application/xml',
      'md': 'text/markdown',
      'csv': 'text/csv',
      'log': 'text/plain',
      'yaml': 'text/yaml',
      'yml': 'text/yaml',
      'ini': 'text/plain',
      'conf': 'text/plain',
    };

    return mimeTypeMap[ext] || 'application/octet-stream';
  }

  /**
   * Analyze compression effectiveness
   */
  static async analyzeCompression(data: string | Buffer): Promise<{
    originalSize: number;
    estimatedCompressedSize: number;
    estimatedRatio: number;
    worthCompressing: boolean;
  }> {
    const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf-8');
    const originalSize = buffer.length;

    // Quick compression test with sample
    const sampleSize = Math.min(1024, originalSize);
    const sample = buffer.slice(0, sampleSize);
    
    try {
      const compressed = await gzipAsync(sample);
      const sampleRatio = sampleSize / compressed.length;
      const estimatedCompressedSize = Math.round(originalSize / sampleRatio);
        return {
        originalSize,
        estimatedCompressedSize,
        estimatedRatio: sampleRatio,
        worthCompressing: sampleRatio > 1.1 && originalSize > COMPRESSION_CONFIG.threshold,
      };
    } catch {
      return {
        originalSize,
        estimatedCompressedSize: originalSize,
        estimatedRatio: 1,
        worthCompressing: false,
      };
    }
  }

  /**
   * Batch compression for multiple files
   */
  static async compressBatch(
    files: Array<{ name: string; content: string }>
  ): Promise<Array<{
    name: string;
    content: string;
    compressed: boolean;
    algorithm: string;
    originalSize: number;
    compressedSize: number;
    error?: string;
  }>> {
    const results = await Promise.allSettled(
      files.map(async (file) => {
        try {
          const result = await this.compressFileContent(file.content, file.name);
          return {
            name: file.name,
            ...result,
          };
        } catch (error) {
          return {
            name: file.name,
            content: file.content,
            compressed: false,
            algorithm: 'none',
            originalSize: file.content.length,
            compressedSize: file.content.length,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      })
    );

    return results.map((result, index) => 
      result.status === 'fulfilled' 
        ? result.value 
        : {
            name: files[index].name,
            content: files[index].content,
            compressed: false,
            algorithm: 'none',
            originalSize: files[index].content.length,
            compressedSize: files[index].content.length,
            error: 'Compression failed',
          }
    );
  }

  /**
   * Get compression statistics
   */
  static getCompressionStats(results: Array<{
    compressed: boolean;
    originalSize: number;
    compressedSize: number;
  }>): {
    totalFiles: number;
    compressedFiles: number;
    totalOriginalSize: number;
    totalCompressedSize: number;
    overallCompressionRatio: number;
    spaceSaved: number;
    spaceSavedPercentage: number;
  } {
    const totalFiles = results.length;
    const compressedFiles = results.filter(r => r.compressed).length;
    const totalOriginalSize = results.reduce((sum, r) => sum + r.originalSize, 0);
    const totalCompressedSize = results.reduce((sum, r) => sum + r.compressedSize, 0);
    
    const overallCompressionRatio = totalOriginalSize > 0 ? totalOriginalSize / totalCompressedSize : 1;
    const spaceSaved = totalOriginalSize - totalCompressedSize;
    const spaceSavedPercentage = totalOriginalSize > 0 ? (spaceSaved / totalOriginalSize) * 100 : 0;

    return {
      totalFiles,
      compressedFiles,
      totalOriginalSize,
      totalCompressedSize,
      overallCompressionRatio,
      spaceSaved,
      spaceSavedPercentage,
    };
  }

  // Initialize compression service (for app initializer compatibility)
  static async initialize(): Promise<void> {
    console.log('Compression: Service initialized successfully');
    // Compression service doesn't need special initialization
    // All methods are static and ready to use
  }
}

export default CompressionService;
