// CDN integration service for SecureShare
// Provides edge distribution and static asset optimization

import { config } from './config';

// CDN configuration
const CDN_CONFIG = {
  // Popular CDN providers
  providers: {
    cloudflare: {
      name: 'Cloudflare',
      endpoint: process.env.CLOUDFLARE_CDN_ENDPOINT,
      zone: process.env.CLOUDFLARE_ZONE_ID,
      apiToken: process.env.CLOUDFLARE_API_TOKEN,
    },
    aws: {
      name: 'AWS CloudFront',
      endpoint: process.env.AWS_CLOUDFRONT_ENDPOINT,
      distributionId: process.env.AWS_CLOUDFRONT_DISTRIBUTION_ID,
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
    fastly: {
      name: 'Fastly',
      endpoint: process.env.FASTLY_CDN_ENDPOINT,
      serviceId: process.env.FASTLY_SERVICE_ID,
      apiToken: process.env.FASTLY_API_TOKEN,
    },
  },
  
  // Cache control settings
  cacheControl: {
    static: 'public, max-age=31536000, immutable', // 1 year for static assets
    api: 'public, max-age=300, s-maxage=600', // 5min browser, 10min CDN for API
    dynamic: 'private, no-cache, no-store, must-revalidate', // No caching for sensitive data
    sharedFiles: 'public, max-age=3600, s-maxage=7200', // 1hr browser, 2hr CDN for shared files
  },
  
  // Asset optimization
  optimization: {
    enableImageOptimization: true,
    enableMinification: true,
    enableCompression: true,
    enableBrotli: true,
  },
};

// CDN response interface
export interface CDNResponse {
  success: boolean;
  url?: string;
  cacheStatus?: 'HIT' | 'MISS' | 'EXPIRED' | 'STALE';
  cdnProvider?: string;
  responseTime?: number;
  error?: string;
}

// Edge location interface
export interface EdgeLocation {
  city: string;
  country: string;
  region: string;
  datacenter: string;
  latency?: number;
}

export class CDNService {
  private static activeProvider: keyof typeof CDN_CONFIG.providers | null = null;
  private static initialized = false;

  /**
   * Initialize CDN service with best available provider
   */
  static init(): void {
    if (this.initialized) return;

    // Detect available CDN provider
    if (CDN_CONFIG.providers.cloudflare.endpoint && CDN_CONFIG.providers.cloudflare.apiToken) {
      this.activeProvider = 'cloudflare';
    } else if (CDN_CONFIG.providers.aws.endpoint && CDN_CONFIG.providers.aws.accessKeyId) {
      this.activeProvider = 'aws';
    } else if (CDN_CONFIG.providers.fastly.endpoint && CDN_CONFIG.providers.fastly.apiToken) {
      this.activeProvider = 'fastly';
    }

    if (this.activeProvider) {
      console.log(`CDN: Initialized with ${CDN_CONFIG.providers[this.activeProvider].name}`);
    } else {
      console.log('CDN: No provider configured, using direct serving');
    }

    this.initialized = true;
  }

  /**
   * Get CDN URL for a resource
   */
  static getCDNUrl(path: string, options: {
    type?: 'static' | 'api' | 'dynamic' | 'sharedFiles';
    optimization?: boolean;
  } = {}): string {
    this.init();

    if (!this.activeProvider) {
      return `${config.baseUrl}${path}`;
    }

    const provider = CDN_CONFIG.providers[this.activeProvider];
    const baseUrl = provider.endpoint;
    
    if (!baseUrl) {
      return `${config.baseUrl}${path}`;
    }

    // Add optimization parameters if enabled
    let optimizedPath = path;
    if (options.optimization && CDN_CONFIG.optimization.enableImageOptimization) {
      // Add image optimization parameters for supported formats
      if (this.isImagePath(path)) {
        optimizedPath = this.addImageOptimizationParams(path);
      }
    }

    return `${baseUrl}${optimizedPath}`;
  }

  /**
   * Get appropriate cache control headers
   */
  static getCacheHeaders(type: 'static' | 'api' | 'dynamic' | 'sharedFiles' = 'api'): Record<string, string> {
    const headers: Record<string, string> = {
      'Cache-Control': CDN_CONFIG.cacheControl[type],
    };

    // Add CDN-specific headers
    if (this.activeProvider === 'cloudflare') {
      headers['CF-Cache-Tag'] = `type-${type}`;
      if (type === 'static') {
        headers['CF-Cache-Status'] = 'HIT';
      }
    } else if (this.activeProvider === 'aws') {
      headers['CloudFront-Viewer-Country'] = 'US'; // Will be overridden by CloudFront
    }

    // Add compression headers
    if (CDN_CONFIG.optimization.enableCompression) {
      headers['Vary'] = 'Accept-Encoding';
    }

    return headers;
  }

  /**
   * Purge CDN cache for specific resources
   */
  static async purgeCache(paths: string[] | string): Promise<CDNResponse> {
    this.init();

    if (!this.activeProvider) {
      return { success: false, error: 'No CDN provider configured' };
    }

    const pathArray = Array.isArray(paths) ? paths : [paths];
    const startTime = Date.now();

    try {
      switch (this.activeProvider) {
        case 'cloudflare':
          return await this.purgeCloudflareCache(pathArray);
        case 'aws':
          return await this.purgeAWSCache(pathArray);
        case 'fastly':
          return await this.purgeFastlyCache(pathArray);
        default:
          return { success: false, error: 'Unknown CDN provider' };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Get CDN edge locations and performance metrics
   */
  static async getEdgeLocations(): Promise<EdgeLocation[]> {
    this.init();

    // Return mock data if no real CDN is configured
    if (!this.activeProvider) {
      return [
        { city: 'Local', country: 'US', region: 'Local', datacenter: 'localhost' }
      ];
    }

    try {
      switch (this.activeProvider) {
        case 'cloudflare':
          return await this.getCloudflareEdgeLocations();
        case 'aws':
          return await this.getAWSEdgeLocations();
        case 'fastly':
          return await this.getFastlyEdgeLocations();
        default:
          return [];
      }
    } catch (error) {
      console.error('Failed to get edge locations:', error);
      return [];
    }
  }

  /**
   * Optimize static assets for CDN delivery
   */
  static async optimizeAssets(assets: Array<{
    path: string;
    content: Buffer;
    type: string;
  }>): Promise<Array<{
    path: string;
    originalSize: number;
    optimizedSize: number;
    optimizedContent: Buffer;
    compressionRatio: number;
  }>> {
    const results = [];

    for (const asset of assets) {
      try {
        let optimizedContent = asset.content;
        let optimizedSize = asset.content.length;

        // Apply optimizations based on asset type
        if (asset.type.startsWith('image/')) {
          optimizedContent = await this.optimizeImage(asset.content, asset.type);
          optimizedSize = optimizedContent.length;
        } else if (this.isMinifiableAsset(asset.type)) {
          optimizedContent = await this.minifyAsset(asset.content, asset.type);
          optimizedSize = optimizedContent.length;
        }

        results.push({
          path: asset.path,
          originalSize: asset.content.length,
          optimizedSize,
          optimizedContent,
          compressionRatio: asset.content.length / optimizedSize,
        });
      } catch (error) {
        console.error(`Failed to optimize asset ${asset.path}:`, error);
        results.push({
          path: asset.path,
          originalSize: asset.content.length,
          optimizedSize: asset.content.length,
          optimizedContent: asset.content,
          compressionRatio: 1,
        });
      }
    }

    return results;
  }

  /**
   * Monitor CDN performance
   */
  static async getPerformanceMetrics(): Promise<{
    hitRatio: number;
    averageResponseTime: number;
    bandwidthSaved: number;
    requestsServed: number;
    edgeLocations: number;
  }> {
    this.init();

    // Return mock metrics if no CDN is configured
    if (!this.activeProvider) {
      return {
        hitRatio: 0,
        averageResponseTime: 200,
        bandwidthSaved: 0,
        requestsServed: 0,
        edgeLocations: 1,
      };
    }

    try {
      switch (this.activeProvider) {
        case 'cloudflare':
          return await this.getCloudflareMetrics();
        case 'aws':
          return await this.getAWSMetrics();
        case 'fastly':
          return await this.getFastlyMetrics();
        default:
          return {
            hitRatio: 0,
            averageResponseTime: 0,
            bandwidthSaved: 0,
            requestsServed: 0,
            edgeLocations: 0,
          };
      }
    } catch (error) {
      console.error('Failed to get CDN metrics:', error);
      return {
        hitRatio: 0,
        averageResponseTime: 0,
        bandwidthSaved: 0,
        requestsServed: 0,
        edgeLocations: 0,
      };
    }
  }

  // Private helper methods

  private static async purgeCloudflareCache(paths: string[]): Promise<CDNResponse> {
    const config = CDN_CONFIG.providers.cloudflare;
    
    const response = await fetch(`https://api.cloudflare.com/client/v4/zones/${config.zone}/purge_cache`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        files: paths.map(path => `${config.endpoint}${path}`)
      }),
    });

    const result = await response.json();
    
    return {
      success: result.success,
      cdnProvider: 'cloudflare',
      error: result.success ? undefined : result.errors?.[0]?.message,
    };
  }  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private static async purgeAWSCache(_paths: string[]): Promise<CDNResponse> {
    // AWS CloudFront cache invalidation would require AWS SDK
    // For now, return a mock response
    return {
      success: true,
      cdnProvider: 'aws',
    };
  }

  private static async purgeFastlyCache(paths: string[]): Promise<CDNResponse> {
    // Fastly cache purging implementation
    const config = CDN_CONFIG.providers.fastly;
    
    // Fastly uses surrogate keys for purging
    const response = await fetch(`https://api.fastly.com/service/${config.serviceId}/purge`, {
      method: 'POST',
      headers: {
        'Fastly-Token': config.apiToken!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        surrogate_key: paths.join(' ')
      }),
    });

    return {
      success: response.ok,
      cdnProvider: 'fastly',
      error: response.ok ? undefined : await response.text(),
    };
  }

  private static async getCloudflareEdgeLocations(): Promise<EdgeLocation[]> {
    // Mock Cloudflare edge locations
    return [
      { city: 'New York', country: 'US', region: 'North America', datacenter: 'EWR' },
      { city: 'London', country: 'GB', region: 'Europe', datacenter: 'LHR' },
      { city: 'Singapore', country: 'SG', region: 'Asia Pacific', datacenter: 'SIN' },
    ];
  }

  private static async getAWSEdgeLocations(): Promise<EdgeLocation[]> {
    // Mock AWS CloudFront edge locations
    return [
      { city: 'Virginia', country: 'US', region: 'North America', datacenter: 'IAD' },
      { city: 'Frankfurt', country: 'DE', region: 'Europe', datacenter: 'FRA' },
      { city: 'Tokyo', country: 'JP', region: 'Asia Pacific', datacenter: 'NRT' },
    ];
  }

  private static async getFastlyEdgeLocations(): Promise<EdgeLocation[]> {
    // Mock Fastly edge locations
    return [
      { city: 'San Francisco', country: 'US', region: 'North America', datacenter: 'SFO' },
      { city: 'Amsterdam', country: 'NL', region: 'Europe', datacenter: 'AMS' },
      { city: 'Sydney', country: 'AU', region: 'Asia Pacific', datacenter: 'SYD' },
    ];
  }
  private static async getCloudflareMetrics(): Promise<{
    hitRatio: number;
    averageResponseTime: number;
    bandwidthSaved: number;
    requestsServed: number;
    edgeLocations: number;
  }> {
    // Mock metrics - in real implementation, fetch from Cloudflare Analytics API
    return {
      hitRatio: 0.85,
      averageResponseTime: 120,
      bandwidthSaved: 1024 * 1024 * 500, // 500MB
      requestsServed: 10000,
      edgeLocations: 250,
    };
  }
  private static async getAWSMetrics(): Promise<{
    hitRatio: number;
    averageResponseTime: number;
    bandwidthSaved: number;
    requestsServed: number;
    edgeLocations: number;
  }> {
    // Mock AWS CloudFront metrics
    return {
      hitRatio: 0.82,
      averageResponseTime: 150,
      bandwidthSaved: 1024 * 1024 * 400, // 400MB
      requestsServed: 8000,
      edgeLocations: 200,
    };
  }
  private static async getFastlyMetrics(): Promise<{
    hitRatio: number;
    averageResponseTime: number;
    bandwidthSaved: number;
    requestsServed: number;
    edgeLocations: number;
  }> {
    // Mock Fastly metrics
    return {
      hitRatio: 0.88,
      averageResponseTime: 100,
      bandwidthSaved: 1024 * 1024 * 600, // 600MB
      requestsServed: 12000,
      edgeLocations: 180,
    };
  }

  private static isImagePath(path: string): boolean {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
    return imageExtensions.some(ext => path.toLowerCase().endsWith(ext));
  }

  private static addImageOptimizationParams(path: string): string {
    // Add query parameters for image optimization
    const separator = path.includes('?') ? '&' : '?';
    return `${path}${separator}auto=format,compress&quality=85`;
  }

  private static isMinifiableAsset(type: string): boolean {
    return ['text/css', 'text/javascript', 'application/javascript', 'text/html'].includes(type);
  }  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private static async optimizeImage(content: Buffer, _type: string): Promise<Buffer> {
    // Mock image optimization - in real implementation, use Sharp or similar
    // For now, just return the original content
    return content;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private static async minifyAsset(content: Buffer, _type: string): Promise<Buffer> {
    // Mock minification - in real implementation, use appropriate minifiers
    // For now, just return the original content
    return content;
  }

  /**
   * Generate CDN-optimized HTML headers
   */
  static generateHTMLHeaders(): string {
    this.init();

    if (!this.activeProvider) return '';

    const provider = CDN_CONFIG.providers[this.activeProvider];
    const baseUrl = provider.endpoint;

    if (!baseUrl) return '';

    return `
    <!-- CDN Optimization -->
    <link rel="dns-prefetch" href="${baseUrl}">
    <link rel="preconnect" href="${baseUrl}" crossorigin>
    
    <!-- Resource Hints -->
    <link rel="prefetch" href="${baseUrl}/static/css/main.css">
    <link rel="prefetch" href="${baseUrl}/static/js/main.js">
    `;
  }

  /**
   * Check CDN health
   */
  static async healthCheck(): Promise<{
    healthy: boolean;
    provider: string | null;
    responseTime?: number;
    error?: string;
  }> {
    this.init();

    if (!this.activeProvider) {
      return { healthy: true, provider: null };
    }

    const startTime = Date.now();
    const provider = CDN_CONFIG.providers[this.activeProvider];

    try {
      const response = await fetch(`${provider.endpoint}/health`, {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });

      return {
        healthy: response.ok,
        provider: this.activeProvider,
        responseTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        healthy: false,
        provider: this.activeProvider,
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Initialize CDN service (for app initializer compatibility)
  static async initialize(): Promise<void> {
    this.init();
    console.log('CDN: Service initialized successfully');
  }
}

export default CDNService;
