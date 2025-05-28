// Configuration utilities for SecureShare
// Handles environment variables and app settings

export const config = {
  // App Settings
  baseUrl: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Storage Settings
  storageDir: process.env.STORAGE_DIR || './data',
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB default
  cleanupDays: parseInt(process.env.CLEANUP_DAYS || '30'),
  
  // Security Settings
  encryptionAlgorithm: process.env.ENCRYPTION_ALGORITHM || 'AES-GCM',
  keyDerivationIterations: parseInt(process.env.KEY_DERIVATION_ITERATIONS || '100000'),
  
  // Database Settings (for future use)
  databaseUrl: process.env.DATABASE_URL,
  redisUrl: process.env.REDIS_URL,
  
  // Authentication Settings (for future use)
  jwtSecret: process.env.JWT_SECRET,
  sessionSecret: process.env.SESSION_SECRET,
  
  // Email Settings (for future use)
  smtp: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  
  // Feature Flags
  features: {
    authentication: false, // Enable when auth is implemented
    emailNotifications: false, // Enable when email is implemented
    fileUpload: true,
    passwordProtection: true,
    keyBasedSharing: true,
  },
  
  // Rate Limiting (for future implementation)
  rateLimit: {
    uploadPerHour: 10,
    downloadPerHour: 100,
    maxConcurrentUploads: 3,
  },
};

// Validation helper
export function validateConfig() {
  const errors: string[] = [];
  
  if (config.maxFileSize <= 0) {
    errors.push('MAX_FILE_SIZE must be greater than 0');
  }
  
  if (config.cleanupDays <= 0) {
    errors.push('CLEANUP_DAYS must be greater than 0');
  }
  
  if (config.keyDerivationIterations < 10000) {
    errors.push('KEY_DERIVATION_ITERATIONS should be at least 10000 for security');
  }
  
  if (config.nodeEnv === 'production') {
    if (!config.jwtSecret) {
      console.warn('JWT_SECRET not set - authentication features will be disabled');
    }
    
    if (!config.databaseUrl) {
      console.warn('DATABASE_URL not set - using file storage (not recommended for production)');
    }
  }
  
  if (errors.length > 0) {
    throw new Error(`Configuration errors: ${errors.join(', ')}`);
  }
}

// Helper to check if we're in development
export const isDevelopment = config.nodeEnv === 'development';
export const isProduction = config.nodeEnv === 'production';

// Helper to format file sizes
export function formatFileSize(bytes: number): string {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

// Helper to check file size limits
export function isFileSizeValid(size: number): boolean {
  return size > 0 && size <= config.maxFileSize;
}

// Initialize configuration (call this at app startup)
export function initConfig() {
  try {
    validateConfig();
    console.log('Configuration loaded successfully');
    
    if (isDevelopment) {
      console.log('Development mode - file storage enabled');
      console.log(`Max file size: ${formatFileSize(config.maxFileSize)}`);
      console.log(`Cleanup after: ${config.cleanupDays} days`);
    }
    
    return true;
  } catch (error) {
    console.error('Configuration validation failed:', error);
    return false;
  }
}
