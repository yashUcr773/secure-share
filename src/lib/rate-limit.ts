// Rate limiting utilities for SecureShare
// Provides configurable rate limiting using Redis or in-memory storage

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { NextRequest } from 'next/server';
import { config } from './config';

// Rate limit result interface
export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
  headers: Record<string, string>;
}

// In-memory rate limiting for development (when Redis is not available)
class MemoryRatelimit {
  private requests: Map<string, { count: number; resetTime: number }> = new Map();
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests: number, windowMs: number) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  async limit(identifier: string): Promise<{
    success: boolean;
    limit: number;
    remaining: number;
    reset: Date;
  }> {
    const now = Date.now();
    const record = this.requests.get(identifier);

    if (!record || now > record.resetTime) {
      // Reset or first request
      const resetTime = now + this.windowMs;
      this.requests.set(identifier, { count: 1, resetTime });
      return {
        success: true,
        limit: this.maxRequests,
        remaining: this.maxRequests - 1,
        reset: new Date(resetTime)
      };
    }

    if (record.count >= this.maxRequests) {
      return {
        success: false,
        limit: this.maxRequests,
        remaining: 0,
        reset: new Date(record.resetTime)
      };
    }

    record.count++;
    this.requests.set(identifier, record);

    return {
      success: true,
      limit: this.maxRequests,
      remaining: this.maxRequests - record.count,
      reset: new Date(record.resetTime)
    };
  }
}

// Create rate limiters based on environment
const createRateLimiter = (requests: number, window: string) => {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (redisUrl && redisToken) {
    // Production: Use Redis-based rate limiting
    const redis = new Redis({
      url: redisUrl,
      token: redisToken,
    });    // Convert window string to proper duration format for Upstash
    const duration = convertToDuration(window);    return new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(requests, duration as "1 s" | "1 m" | "1 h" | "1 d"),
      analytics: true,
    });
  } else {
    // Development: Use memory-based rate limiting
    console.warn('Redis not configured, using in-memory rate limiting');
    const windowMs = parseWindow(window);
    return new MemoryRatelimit(requests, windowMs);
  }
};

function convertToDuration(window: string): string {
  const match = window.match(/^(\d+)\s*([smhd]?)$/);
  if (!match) return "60 s"; // default 1 minute

  const value = parseInt(match[1]);
  const unit = match[2] || 's';

  switch (unit) {
    case 's': return `${value} s`;
    case 'm': return `${value} m`;
    case 'h': return `${value} h`;
    case 'd': return `${value} d`;
    default: return `${value} s`;
  }
}

function parseWindow(window: string): number {
  const match = window.match(/^(\d+)\s*([smhd]?)$/);
  if (!match) return 60 * 1000; // default 1 minute

  const value = parseInt(match[1]);
  const unit = match[2] || 's';

  switch (unit) {
    case 's': return value * 1000;
    case 'm': return value * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    default: return value * 1000;
  }
}

// Rate limiters for different endpoints with optimized configurations
export const uploadRateLimit = createRateLimiter(config.rateLimit.uploadPerHour, '1h');
export const downloadRateLimit = createRateLimiter(config.rateLimit.downloadPerHour, '1h');

// Authentication - dual layer protection (burst + sustained)
export const authRateLimit = createRateLimiter(config.rateLimit.authPerHour, '1h');
export const authBurstRateLimit = createRateLimiter(config.rateLimit.authPerMinute, '1m');

// General API - dual layer protection
export const generalRateLimit = createRateLimiter(config.rateLimit.generalPerMinute, '1m');
export const generalBurstRateLimit = createRateLimiter(config.rateLimit.generalPerSecond, '1s');

// Security-sensitive operations
export const passwordResetRateLimit = createRateLimiter(config.rateLimit.passwordResetPerHour, '1h');
export const verificationEmailRateLimit = createRateLimiter(config.rateLimit.verificationEmailPerHour, '1h');

// Share link access
export const shareAccessRateLimit = createRateLimiter(config.rateLimit.shareAccessPerMinute, '1m');
export const shareAccessHourlyRateLimit = createRateLimiter(config.rateLimit.shareAccessPerHour, '1h');

// Helper function to get client IP
export function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  
  if (cfConnectingIP) return cfConnectingIP;
  if (realIP) return realIP;
  if (forwarded) return forwarded.split(',')[0].trim();
  
  return 'unknown';
}

// Helper function to create rate limit identifier
export function createRateLimitIdentifier(request: NextRequest, prefix: string): string {
  const ip = getClientIP(request);
  const userAgent = request.headers.get('user-agent') || 'unknown';
  
  // Create a more specific identifier to prevent abuse
  const hash = btoa(`${ip}-${userAgent}`).slice(0, 16);
  return `${prefix}:${hash}`;
}

// Middleware helper for rate limiting
export async function checkRateLimit(
  request: NextRequest,
  limiter: { 
    limit: (id: string) => Promise<{ 
      success: boolean; 
      reset: Date | number; 
      remaining: number; 
      limit: number; 
    }> 
  },
  identifier: string
): Promise<{
  success: boolean;
  headers: Record<string, string>;
}> {
  try {
    const result = await limiter.limit(identifier);
    
    // Handle both Date and number reset types
    let resetTimestamp: number;
    if (result.reset instanceof Date) {
      resetTimestamp = Math.ceil(result.reset.getTime() / 1000);
    } else {
      resetTimestamp = typeof result.reset === 'number' ? result.reset : Math.ceil(Date.now() / 1000);
    }
    
    const headers: Record<string, string> = {
      'X-RateLimit-Limit': result.limit.toString(),
      'X-RateLimit-Remaining': result.remaining.toString(),
      'X-RateLimit-Reset': resetTimestamp.toString(),
    };

    return {
      success: result.success,
      headers
    };
  } catch (error) {
    console.error('Rate limit check failed:', error);
    // In case of error, allow the request (fail open)
    return {
      success: true,
      headers: {}
    };
  }
}

// Simplified rate limit handler for API routes
export async function rateLimitHandler(
  request: NextRequest,
  endpoint: string,
  requests: number = 60,
  windowMs: number = 60000
): Promise<{
  success: boolean;
  headers: Record<string, string>;
}> {
  const identifier = createRateLimitIdentifier(request, endpoint);
  
  // Create a temporary rate limiter for this specific check
  const windowSeconds = Math.ceil(windowMs / 1000);
  const limiter = createRateLimiter(requests, `${windowSeconds}s`);
  
  try {
    const result = await limiter.limit(identifier);
    
    // Handle both Upstash and Memory rate limiter response formats
    let resetTime: number;
    if (result.reset instanceof Date) {
      resetTime = Math.ceil(result.reset.getTime() / 1000);
    } else {
      resetTime = typeof result.reset === 'number' ? result.reset : Math.ceil(Date.now() / 1000) + windowSeconds;
    }
    
    const headers: Record<string, string> = {
      'X-RateLimit-Limit': result.limit.toString(),
      'X-RateLimit-Remaining': result.remaining.toString(),
      'X-RateLimit-Reset': resetTime.toString(),
    };

    return {
      success: result.success,
      headers
    };
  } catch (error) {
    console.error('Rate limit check failed:', error);
    // In case of error, allow the request (fail open)
    return {
      success: true,
      headers: {}
    };
  }
}

// Rate limit adapter that works with existing limiter and identifier pattern
export async function rateLimitAdapter(
  limiter: { limit: (id: string) => Promise<{ success: boolean; reset: Date | number; remaining: number; limit: number; }> },
  identifier: string
): Promise<{
  success: boolean;
  limit: number;
  remaining: number;
  reset: Date;
}> {
  try {
    const result = await limiter.limit(identifier);
    
    // Handle both Upstash and Memory rate limiter response formats
    let resetTime: Date;
    if (result.reset instanceof Date) {
      resetTime = result.reset;
    } else {
      resetTime = new Date(typeof result.reset === 'number' ? result.reset * 1000 : Date.now() + 60000);
    }
    
    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: resetTime
    };
  } catch (error) {
    console.error('Rate limit check failed:', error);
    // In case of error, allow the request (fail open)
    return {
      success: true,
      limit: 100,
      remaining: 99,
      reset: new Date(Date.now() + 60000)
    };
  }
}
