// Application initialization service
// Handles startup tasks like job processors, monitoring, and infrastructure services

import { jobQueue } from './job-queue';
import { CacheService } from './cache';
import { CompressionService } from './compression';
import { CDNService } from './cdn';

export interface InitializationStatus {
  jobQueue: boolean;
  cache: boolean;
  compression: boolean;
  cdn: boolean;
  startTime: Date;
  errors: string[];
}

class AppInitializer {
  private static instance: AppInitializer;
  private initializationStatus: InitializationStatus = {
    jobQueue: false,
    cache: false,
    compression: false,
    cdn: false,
    startTime: new Date(),
    errors: []
  };
  private initialized = false;

  static getInstance(): AppInitializer {
    if (!AppInitializer.instance) {
      AppInitializer.instance = new AppInitializer();
    }
    return AppInitializer.instance;
  }

  async initialize(): Promise<InitializationStatus> {
    if (this.initialized) {
      return this.initializationStatus;
    }

    console.log('🚀 Initializing SecureShare application services...');

    // Initialize job queue and processors
    await this.initializeJobQueue();

    // Initialize cache service
    await this.initializeCache();

    // Initialize compression service
    await this.initializeCompression();

    // Initialize CDN service
    await this.initializeCDN();

    this.initialized = true;
    console.log('✅ Application services initialized successfully');
    
    return this.initializationStatus;
  }

  private async initializeJobQueue(): Promise<void> {
    try {
      console.log('📋 Initializing job queue processors...');
        // Register analytics processing jobs
      jobQueue.registerProcessor('analytics-processing', async (job) => {
        const { type, userId } = job.data;
        
        // In a real implementation, this would:
        // 1. Aggregate analytics data
        // 2. Store in analytics database
        // 3. Update real-time metrics
        // 4. Generate insights
        
        console.log(`📊 Processing analytics job: ${type} for user ${userId}`);
        
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 100));
        
        return { success: true, processedAt: new Date().toISOString() };
      });      // Register file processing jobs
      jobQueue.registerProcessor('file-processing', async (job) => {
        const { fileId, operation } = job.data;
        
        console.log(`📁 Processing file job: ${operation} for file ${fileId}`);
        
        // File processing operations like:
        // - Virus scanning
        // - Metadata extraction
        // - Thumbnail generation
        // - Compression optimization
        
        return { success: true, processedAt: new Date().toISOString() };
      });

      // Register cache maintenance jobs
      jobQueue.registerProcessor('cache-maintenance', async (job) => {
        const { operation, patterns } = job.data;
        
        console.log(`🧹 Processing cache maintenance: ${operation}`);
          if (operation === 'cleanup') {
          await CacheService.cleanup();
        } else if (operation === 'invalidate' && patterns) {
          // Ensure patterns is an array
          const patternArray = Array.isArray(patterns) ? patterns : [patterns];
          for (const pattern of patternArray) {
            await CacheService.deletePattern(String(pattern));
          }
        }
        
        return { success: true, processedAt: new Date().toISOString() };
      });      // Register storage maintenance jobs
      jobQueue.registerProcessor('storage-maintenance', async (job) => {
        const { operation } = job.data;
        
        console.log(`💾 Processing storage maintenance: ${operation}`);
        
        // Storage operations like:
        // - Cleanup temporary files
        // - Archive old files
        // - Optimize storage usage
        // - Generate storage reports
        
        return { success: true, processedAt: new Date().toISOString() };
      });

      this.initializationStatus.jobQueue = true;
      console.log('✅ Job queue processors initialized');
    } catch (error) {
      const errorMsg = `Failed to initialize job queue: ${error}`;
      this.initializationStatus.errors.push(errorMsg);
      console.error('❌', errorMsg);
    }
  }

  private async initializeCache(): Promise<void> {
    try {
      console.log('💾 Initializing cache service...');
      
      // Initialize cache connections and verify functionality
      await CacheService.initialize?.();
      
      // Schedule periodic cache cleanup
      if (typeof setInterval !== 'undefined') {
        setInterval(async () => {
          try {
            await CacheService.cleanup();
            console.log('🧹 Periodic cache cleanup completed');
          } catch (error) {
            console.error('❌ Cache cleanup failed:', error);
          }
        }, 30 * 60 * 1000); // Every 30 minutes
      }

      this.initializationStatus.cache = true;
      console.log('✅ Cache service initialized');
    } catch (error) {
      const errorMsg = `Failed to initialize cache: ${error}`;
      this.initializationStatus.errors.push(errorMsg);
      console.error('❌', errorMsg);
    }
  }

  private async initializeCompression(): Promise<void> {
    try {
      console.log('🗜️ Initializing compression service...');
      
      // Initialize compression algorithms and verify functionality
      await CompressionService.initialize?.();
      
      this.initializationStatus.compression = true;
      console.log('✅ Compression service initialized');
    } catch (error) {
      const errorMsg = `Failed to initialize compression: ${error}`;
      this.initializationStatus.errors.push(errorMsg);
      console.error('❌', errorMsg);
    }
  }

  private async initializeCDN(): Promise<void> {
    try {
      console.log('🌐 Initializing CDN service...');
      
      // Initialize CDN connections and verify endpoints
      await CDNService.initialize?.();
      
      this.initializationStatus.cdn = true;
      console.log('✅ CDN service initialized');
    } catch (error) {
      const errorMsg = `Failed to initialize CDN: ${error}`;
      this.initializationStatus.errors.push(errorMsg);
      console.error('❌', errorMsg);
    }
  }

  getStatus(): InitializationStatus {
    return { ...this.initializationStatus };
  }

  isHealthy(): boolean {
    return this.initializationStatus.jobQueue &&
           this.initializationStatus.cache &&
           this.initializationStatus.compression &&
           this.initializationStatus.cdn;
  }

  // Schedule periodic maintenance tasks
  async scheduleMaintenance(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    console.log('📅 Scheduling maintenance tasks...');    // Schedule daily cache cleanup
    await jobQueue.addJob('cache-maintenance', {
      operation: 'cleanup'
    }, {
      delay: 24 * 60 * 60 * 1000 // 24 hours
    });    // Schedule weekly storage maintenance
    await jobQueue.addJob('storage-maintenance', {
      operation: 'cleanup',
      threshold: 0.8 // Clean up when 80% full
    });

    console.log('✅ Maintenance tasks scheduled');
  }
}

export const appInitializer = AppInitializer.getInstance();

// Auto-initialize in production and development
if (process.env.NODE_ENV !== 'test') {
  // Initialize on module load
  appInitializer.initialize().catch(error => {
    console.error('🚨 Failed to initialize application:', error);
  });
}
