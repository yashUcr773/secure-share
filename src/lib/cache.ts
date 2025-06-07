// Advanced caching system for SecureShare
// Provides Redis-based caching with fallback to in-memory storage

import { Redis } from '@upstash/redis';
import { config } from './config';

// Cache result interface
export interface CacheResult<T> {
  hit: boolean;
  data?: T;
  ttl?: number;
}

// Cache configuration
const CACHE_CONFIG = {
  defaultTTL: 3600, // 1 hour
  fileMetadataTTL: 1800, // 30 minutes
  userDataTTL: 900, // 15 minutes
  sharedLinksTTL: 7200, // 2 hours
  analyticsDataTTL: 300, // 5 minutes
};

// In-memory cache fallback for development
class MemoryCache {
  private cache = new Map<string, { data: any; expiry: number }>();
  private maxSize = 1000; // Prevent memory leaks

  set(key: string, value: any, ttlSeconds: number): void {
    // Cleanup old entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const now = Date.now();
      for (const [k, v] of this.cache.entries()) {
        if (v.expiry < now) {
          this.cache.delete(k);
        }
      }
      
      // If still full, remove oldest entries
      if (this.cache.size >= this.maxSize) {
        const oldestKey = this.cache.keys().next().value;
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      data: value,
      expiry: Date.now() + (ttlSeconds * 1000),
    });
  }

  get<T>(key: string): CacheResult<T> {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return { hit: false };
    }

    if (entry.expiry < Date.now()) {
      this.cache.delete(key);
      return { hit: false };
    }

    return {
      hit: true,
      data: entry.data,
      ttl: Math.floor((entry.expiry - Date.now()) / 1000),
    };
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

// Main cache service
export class CacheService {
  private static redis: Redis | null = null;
  private static memoryCache = new MemoryCache();
  private static initialized = false;

  static init(): void {
    if (this.initialized) return;

    const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
    const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (redisUrl && redisToken) {
      this.redis = new Redis({
        url: redisUrl,
        token: redisToken,
      });
      console.log('Cache: Redis backend initialized');
    } else {
      console.log('Cache: Using in-memory fallback (Redis not configured)');
    }

    this.initialized = true;
  }

  // Generic cache operations
  static async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    this.init();
    const ttl = ttlSeconds || CACHE_CONFIG.defaultTTL;

    try {
      if (this.redis) {
        await this.redis.setex(key, ttl, JSON.stringify(value));
      } else {
        this.memoryCache.set(key, value, ttl);
      }
    } catch (error) {
      console.error('Cache set error:', error);
      // Fall back to memory cache if Redis fails
      this.memoryCache.set(key, value, ttl);
    }
  }

  static async get<T>(key: string): Promise<CacheResult<T>> {
    this.init();

    try {
      if (this.redis) {
        const data = await this.redis.get(key);
        if (data) {
          const ttl = await this.redis.ttl(key);
          return {
            hit: true,
            data: JSON.parse(data as string),
            ttl: ttl > 0 ? ttl : undefined,
          };
        }
        return { hit: false };
      } else {
        return this.memoryCache.get<T>(key);
      }
    } catch (error) {
      console.error('Cache get error:', error);
      // Fall back to memory cache if Redis fails
      return this.memoryCache.get<T>(key);
    }
  }

  static async delete(key: string): Promise<void> {
    this.init();

    try {
      if (this.redis) {
        await this.redis.del(key);
      } else {
        this.memoryCache.delete(key);
      }
    } catch (error) {
      console.error('Cache delete error:', error);
      this.memoryCache.delete(key);
    }
  }

  static async clear(pattern?: string): Promise<void> {
    this.init();

    try {
      if (this.redis) {
        if (pattern) {
          const keys = await this.redis.keys(pattern);
          if (keys.length > 0) {
            await this.redis.del(...keys);
          }
        } else {
          await this.redis.flushall();
        }
      } else {
        this.memoryCache.clear();
      }
    } catch (error) {
      console.error('Cache clear error:', error);
      this.memoryCache.clear();
    }
  }

  // Specialized cache methods for common use cases
  static async cacheFileMetadata(fileId: string, metadata: any): Promise<void> {
    await this.set(`file:metadata:${fileId}`, metadata, CACHE_CONFIG.fileMetadataTTL);
  }

  static async getFileMetadata<T>(fileId: string): Promise<CacheResult<T>> {
    return this.get<T>(`file:metadata:${fileId}`);
  }

  static async cacheUserData(userId: string, userData: any): Promise<void> {
    await this.set(`user:data:${userId}`, userData, CACHE_CONFIG.userDataTTL);
  }

  static async getUserData<T>(userId: string): Promise<CacheResult<T>> {
    return this.get<T>(`user:data:${userId}`);
  }

  static async cacheSharedLink(fileId: string, linkData: any): Promise<void> {
    await this.set(`shared:link:${fileId}`, linkData, CACHE_CONFIG.sharedLinksTTL);
  }

  static async getSharedLink<T>(fileId: string): Promise<CacheResult<T>> {
    return this.get<T>(`shared:link:${fileId}`);
  }

  static async cacheAnalytics(key: string, data: any): Promise<void> {
    await this.set(`analytics:${key}`, data, CACHE_CONFIG.analyticsDataTTL);
  }

  static async getAnalytics<T>(key: string): Promise<CacheResult<T>> {
    return this.get<T>(`analytics:${key}`);
  }

  // Cache invalidation patterns
  static async invalidateUser(userId: string): Promise<void> {
    await this.clear(`user:*:${userId}`);
  }

  static async invalidateFile(fileId: string): Promise<void> {
    await this.delete(`file:metadata:${fileId}`);
    await this.delete(`shared:link:${fileId}`);
  }

  // Cache statistics
  static async getStats(): Promise<{
    backend: 'redis' | 'memory';
    memorySize?: number;
    redisConnected?: boolean;
  }> {
    this.init();

    const stats: any = {
      backend: this.redis ? 'redis' : 'memory',
    };

    if (this.redis) {
      try {
        await this.redis.ping();
        stats.redisConnected = true;
      } catch {
        stats.redisConnected = false;
      }
    } else {
      stats.memorySize = this.memoryCache.size();
    }

    return stats;
  }

  // Warm-up cache with frequently accessed data
  static async warmUp(): Promise<void> {
    console.log('Cache: Starting warm-up...');
    
    try {
      // Pre-cache frequently accessed data
      // This could include popular shared links, user analytics, etc.
      
      // Example: Cache current analytics summary
      await this.cacheAnalytics('summary', {
        totalFiles: 0,
        totalUsers: 0,
        lastUpdated: new Date().toISOString(),
      });

      console.log('Cache: Warm-up completed');
    } catch (error) {
      console.error('Cache warm-up error:', error);
    }
  }
}

// Cache middleware for Next.js API routes
export function withCache<T>(
  cacheKey: string,
  ttl: number,
  fetcher: () => Promise<T>
): () => Promise<T> {
  return async (): Promise<T> => {
    const cached = await CacheService.get<T>(cacheKey);
    
    if (cached.hit && cached.data) {
      return cached.data;
    }

    const data = await fetcher();
    await CacheService.set(cacheKey, data, ttl);
    
    return data;
  };
}

// Cache decorators for class methods
export function Cached(key: string, ttl?: number) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const cacheKey = `${key}:${JSON.stringify(args)}`;
      const cached = await CacheService.get(cacheKey);
      
      if (cached.hit && cached.data) {
        return cached.data;
      }

      const result = await originalMethod.apply(this, args);
      await CacheService.set(cacheKey, result, ttl);
      
      return result;
    };

    return descriptor;
  };
}

export default CacheService;
