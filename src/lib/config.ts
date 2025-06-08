// Configuration utilities for SecureShare
// Handles environment variables and app settings

// Enhanced JWT secret management for production security
function validateJWTSecret(): string {
  const secret = process.env.JWT_SECRET;
  const nodeEnv = process.env.NODE_ENV;
  
  // Always require JWT_SECRET, but allow development fallback if not in true production deployment
  if (!secret) {
    // In production deployment, this is a hard error
    if (nodeEnv === 'production' && process.env.VERCEL) {
      console.error('❌ SECURITY ERROR: JWT_SECRET environment variable is required in production');
      throw new Error('JWT_SECRET environment variable is required in production');
    }
    
    // For development or build processes, provide a fallback but warn
    const fallbackSecret = 'dev-fallback-secret-key-not-for-production-use-only-change-this-in-production-environment';
    console.warn('⚠️  WARNING: Using fallback JWT_SECRET. Set JWT_SECRET environment variable for production.');
    return fallbackSecret;
  }
  
  // Validate secret strength for production deployments
  if (nodeEnv === 'production' && process.env.VERCEL) {
    if (secret.length < 32) {
      console.error('❌ SECURITY ERROR: JWT_SECRET must be at least 32 characters long in production');
      throw new Error('JWT_SECRET must be at least 32 characters long in production');
    }
    
    // Check for common weak secrets
    const weakSecrets = [
      'secret',
      'jwt-secret',
      'your-secret-key',
      'dev-secret',
      'development',
      'test-secret'
    ];
    
    if (weakSecrets.includes(secret.toLowerCase())) {
      console.error('❌ SECURITY ERROR: JWT_SECRET appears to be a default/weak value. Use a strong, random secret in production');
      throw new Error('JWT_SECRET appears to be a default/weak value. Use a strong, random secret in production');
    }
    
    console.log('✅ JWT_SECRET validation passed');
  }
  
  return secret;
}

// Session secret validation
function validateSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  const nodeEnv = process.env.NODE_ENV;
  
  if (nodeEnv === 'production' && process.env.VERCEL && !secret) {
    console.error('❌ SECURITY ERROR: SESSION_SECRET environment variable is required in production');
    throw new Error('SESSION_SECRET environment variable is required in production');
  }
  
  return secret || 'dev-session-secret-change-in-production';
}

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
  keyDerivationIterations: parseInt(process.env.KEY_DERIVATION_ITERATIONS || '100000') || 100000,
  
  // Database Settings (for future use)
  databaseUrl: process.env.DATABASE_URL,
  redisUrl: process.env.REDIS_URL,
  
  // Authentication Settings with enhanced validation
  jwtSecret: validateJWTSecret(),
  sessionSecret: validateSessionSecret(),
  
  // JWT Configuration
  jwt: {
    secret: validateJWTSecret(),
    accessTokenExpiry: process.env.JWT_ACCESS_TOKEN_EXPIRY || '15m',
    refreshTokenExpiry: process.env.JWT_REFRESH_TOKEN_EXPIRY || '7d',
    issuer: 'secure-share',
    audience: 'secure-share-users'
  },
  
  // Session Configuration
  session: {
    timeout: parseInt(process.env.SESSION_TIMEOUT || '3600000'), // 1 hour default
    maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5'),
    lockoutDuration: parseInt(process.env.LOCKOUT_DURATION || '1800000'), // 30 minutes default
  },
  
  // Rate Limiting - Optimized for production use
  rateLimit: {
    // File operations - reasonable limits for real usage
    uploadPerHour: parseInt(process.env.RATE_LIMIT_UPLOAD_PER_HOUR || '50'),
    downloadPerHour: parseInt(process.env.RATE_LIMIT_DOWNLOAD_PER_HOUR || '200'),
    
    // Authentication - balanced security and usability
    authPerHour: parseInt(process.env.RATE_LIMIT_AUTH_PER_HOUR || '20'),
    authPerMinute: parseInt(process.env.RATE_LIMIT_AUTH_PER_MINUTE || '5'),
    
    // General API usage
    generalPerMinute: parseInt(process.env.RATE_LIMIT_GENERAL_PER_MINUTE || '100'),
    generalPerSecond: parseInt(process.env.RATE_LIMIT_GENERAL_PER_SECOND || '5'),
    
    // Resource-intensive operations
    maxConcurrentUploads: parseInt(process.env.RATE_LIMIT_MAX_CONCURRENT_UPLOADS || '5'),
    maxFileSize: parseInt(process.env.RATE_LIMIT_MAX_FILE_SIZE || '104857600'), // 100MB default
    
    // Security-sensitive operations
    passwordResetPerHour: parseInt(process.env.RATE_LIMIT_PASSWORD_RESET_PER_HOUR || '3'),
    verificationEmailPerHour: parseInt(process.env.RATE_LIMIT_VERIFICATION_EMAIL_PER_HOUR || '5'),
    
    // Share link access
    shareAccessPerMinute: parseInt(process.env.RATE_LIMIT_SHARE_ACCESS_PER_MINUTE || '30'),
    shareAccessPerHour: parseInt(process.env.RATE_LIMIT_SHARE_ACCESS_PER_HOUR || '500'),
  },
  
  // Email Settings (for future use)
  smtp: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  
  // Feature Flags
  features: {
    authentication: process.env.FEATURE_AUTHENTICATION !== 'false',
    emailNotifications: process.env.FEATURE_EMAIL_NOTIFICATIONS === 'true',
    fileUpload: process.env.FEATURE_FILE_UPLOAD !== 'false',
    passwordProtection: process.env.FEATURE_PASSWORD_PROTECTION !== 'false',
    keyBasedSharing: process.env.FEATURE_KEY_BASED_SHARING !== 'false',
    analytics: process.env.FEATURE_ANALYTICS !== 'false',
    folderOrganization: process.env.FEATURE_FOLDER_ORGANIZATION !== 'false',
    advancedSharing: process.env.FEATURE_ADVANCED_SHARING === 'true',
    customExpiration: process.env.FEATURE_CUSTOM_EXPIRATION === 'true',
    bulkOperations: process.env.FEATURE_BULK_OPERATIONS === 'true',
    apiAccess: process.env.FEATURE_API_ACCESS === 'true',
  },

  // UI Configuration
  ui: {
    maxFileDisplaySize: parseInt(process.env.UI_MAX_FILE_DISPLAY_SIZE || '1048576'), // 1MB
    defaultTheme: process.env.UI_DEFAULT_THEME || 'system',
    showFilePreview: process.env.UI_SHOW_FILE_PREVIEW !== 'false',
    enableDragDrop: process.env.UI_ENABLE_DRAG_DROP !== 'false',
    toastDuration: parseInt(process.env.UI_TOAST_DURATION || '4000'),
    animationsEnabled: process.env.UI_ANIMATIONS_ENABLED !== 'false',
  },

  // Security Configuration
  security: {
    csrfTokenExpiry: parseInt(process.env.CSRF_TOKEN_EXPIRY || '1800000'), // 30 minutes
    sessionTimeout: parseInt(process.env.SESSION_TIMEOUT || '86400000'), // 24 hours
    maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5'),
    lockoutDuration: parseInt(process.env.LOCKOUT_DURATION || '900000'), // 15 minutes
    passwordMinLength: parseInt(process.env.PASSWORD_MIN_LENGTH || '8'),
    requireStrongPasswords: process.env.REQUIRE_STRONG_PASSWORDS !== 'false',
  },

  // File Processing
  fileProcessing: {
    allowedExtensions: (process.env.ALLOWED_FILE_EXTENSIONS || '.txt,.md,.json,.csv,.xml,.log,.yaml,.yml,.ini,.conf').split(','),
    maxFilenameLength: parseInt(process.env.MAX_FILENAME_LENGTH || '255'),
    virusScanEnabled: process.env.VIRUS_SCAN_ENABLED === 'true',
    compressionEnabled: process.env.COMPRESSION_ENABLED === 'true',
    thumbnailGeneration: process.env.THUMBNAIL_GENERATION === 'true',
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
  
  if (config.nodeEnv === 'production' && process.env.VERCEL) {
    if (!config.jwtSecret) {
      errors.push('JWT_SECRET is required in production');
    } else if (config.jwtSecret.length < 32) {
      errors.push('JWT_SECRET must be at least 32 characters long');
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
    
    if (isDevelopment) {
      console.log('🔧 SecureShare configuration loaded (development mode)');
    }
    
    return true;
  } catch (error) {
    console.error('Configuration validation failed:', error);
    return false;
  }
}
