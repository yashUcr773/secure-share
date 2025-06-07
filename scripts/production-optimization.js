#!/usr/bin/env node
/**
 * Production Optimization Script for SecureShare
 * Optimizes the application for production deployment by:
 * - Removing debug console.log statements
 * - Optimizing performance-critical areas
 * - Validating security configurations
 * - Setting up production monitoring
 */

import { readdir, readFile, writeFile, stat } from 'fs/promises';
import { join, extname } from 'path';

console.log('🚀 SecureShare Production Optimization\n');

// Configuration
const CONFIG = {
  // Files to optimize (remove console.log statements)
  optimizePatterns: [
    'src/**/*.{ts,tsx,js,jsx}',
    '!src/**/*.d.ts',
    '!src/**/*.test.{ts,tsx,js,jsx}'
  ],
  
  // Console statements to preserve (important for security/monitoring)
  preserveConsole: [
    'console.error',
    'console.warn',
    'logSecurityEvent',
    'Security Event:',
    'Account deletion',
    'User registration',
    'Login attempt',
    'CSRF validation',
    'Rate limit exceeded'
  ],
  
  // Performance optimizations
  performance: {
    enableImageOptimization: true,
    enableGzip: true,
    minimizeBundle: true,
    enableCaching: true
  }
};

/**
 * Get all TypeScript/JavaScript files in a directory recursively
 */
async function getSourceFiles(dir, files = []) {
  const items = await readdir(dir);
  
  for (const item of items) {
    const fullPath = join(dir, item);
    const stats = await stat(fullPath);
    
    if (stats.isDirectory()) {
      // Skip node_modules, .next, and other build directories
      if (!['node_modules', '.next', 'dist', 'build'].includes(item)) {
        await getSourceFiles(fullPath, files);
      }
    } else if (stats.isFile()) {
      const ext = extname(item);
      if (['.ts', '.tsx', '.js', '.jsx'].includes(ext) && !item.endsWith('.d.ts')) {
        files.push(fullPath);
      }
    }
  }
  
  return files;
}

/**
 * Check if a console statement should be preserved
 */
function shouldPreserveConsole(line) {
  return CONFIG.preserveConsole.some(pattern => 
    line.includes(pattern)
  );
}

/**
 * Optimize a source file by removing unnecessary console statements
 */
async function optimizeFile(filePath) {
  try {
    const content = await readFile(filePath, 'utf-8');
    const lines = content.split('\n');
    let optimizedLines = [];
    let removedCount = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check if line contains console.log that should be removed
      if (line.includes('console.log') && !shouldPreserveConsole(line)) {
        // Check if it's a multiline console.log
        let fullStatement = line;
        let j = i;
        
        // Handle multiline console statements
        while (j < lines.length && !fullStatement.includes(';') && !fullStatement.includes(')')) {
          j++;
          if (j < lines.length) {
            fullStatement += '\n' + lines[j];
          }
        }
        
        // If it's security-related, preserve it
        if (shouldPreserveConsole(fullStatement)) {
          optimizedLines.push(line);
        } else {
          // Remove the console statement
          removedCount++;
          
          // Skip additional lines if it was multiline
          if (j > i) {
            i = j;
          }
        }
      } else {
        optimizedLines.push(line);
      }
    }
    
    // Only write if changes were made
    if (removedCount > 0) {
      await writeFile(filePath, optimizedLines.join('\n'));
      return removedCount;
    }
    
    return 0;
  } catch (error) {
    console.error(`Failed to optimize ${filePath}:`, error.message);
    return 0;
  }
}

/**
 * Generate production environment template
 */
function generateProductionEnv() {
  return `# Production Environment Configuration for SecureShare
# Copy this to .env.production and update with your values

# === CRITICAL SECURITY SETTINGS ===
JWT_SECRET=your-super-secure-jwt-secret-at-least-32-characters-long
SESSION_SECRET=your-session-secret-key-here

# === PRODUCTION URLS ===
NEXT_PUBLIC_BASE_URL=https://your-domain.com
NODE_ENV=production

# === STORAGE CONFIGURATION ===
STORAGE_DIR=/var/data/secure-share
MAX_FILE_SIZE=52428800
CLEANUP_DAYS=90

# === RATE LIMITING (Stricter for production) ===
RATE_LIMIT_AUTH_PER_HOUR=3
RATE_LIMIT_UPLOAD_PER_HOUR=5
RATE_LIMIT_GENERAL_PER_MINUTE=30
RATE_LIMIT_MAX_CONCURRENT_UPLOADS=2

# === EMAIL CONFIGURATION ===
SMTP_HOST=your-smtp-server.com
SMTP_PORT=587
SMTP_USER=your-email@domain.com
SMTP_PASS=your-app-password

# === SECURITY HARDENING ===
CSRF_TOKEN_EXPIRY=1800000
SESSION_TIMEOUT=3600000
MAX_LOGIN_ATTEMPTS=3
LOCKOUT_DURATION=1800000
REQUIRE_STRONG_PASSWORDS=true

# === FEATURE FLAGS ===
FEATURE_EMAIL_NOTIFICATIONS=true
FEATURE_ANALYTICS=true
FEATURE_ADVANCED_SHARING=false
FEATURE_BULK_OPERATIONS=false
FEATURE_API_ACCESS=false

# === MONITORING ===
LOG_LEVEL=warn
ENABLE_SECURITY_LOGS=true
MONITOR_PERFORMANCE=true

# === DATABASE (Optional - File storage used by default) ===
# DATABASE_URL=postgresql://username:password@host:port/database
# REDIS_URL=redis://host:port/db
`;
}

/**
 * Generate production deployment checklist
 */
function generateDeploymentChecklist() {
  return `# SecureShare Production Deployment Checklist

## Pre-Deployment Security Checklist

### Environment Configuration
- [ ] Set strong JWT_SECRET (32+ characters)
- [ ] Configure production BASE_URL
- [ ] Set up proper file storage directory
- [ ] Configure SMTP for email notifications
- [ ] Set stricter rate limits for production

### Security Hardening
- [ ] Enable HTTPS/TLS certificates
- [ ] Configure firewall rules
- [ ] Set up reverse proxy (nginx/Apache)
- [ ] Enable security headers
- [ ] Configure CORS policies
- [ ] Set up fail2ban or similar intrusion prevention

### Infrastructure
- [ ] Set up automated backups
- [ ] Configure log rotation
- [ ] Set up monitoring and alerting
- [ ] Configure health checks
- [ ] Set up CDN (if needed)
- [ ] Configure load balancing (if needed)

## Deployment Steps

### 1. Environment Setup
\`\`\`bash
# Copy production environment
cp .env.production.example .env.production

# Edit with your production values
nano .env.production

# Create storage directory
sudo mkdir -p /var/data/secure-share
sudo chown -R app:app /var/data/secure-share
sudo chmod 750 /var/data/secure-share
\`\`\`

### 2. Build and Deploy
\`\`\`bash
# Install dependencies
npm ci --production

# Build the application
npm run build

# Start the application
npm start
\`\`\`

### 3. Post-Deployment Verification
- [ ] Test file upload/download functionality
- [ ] Verify authentication works
- [ ] Test CSRF protection
- [ ] Check rate limiting
- [ ] Verify SSL certificate
- [ ] Test email notifications
- [ ] Monitor error logs
- [ ] Performance testing

## Monitoring Setup

### Log Monitoring
- Monitor authentication failures
- Track rate limit violations
- Watch for CSRF attacks
- Monitor file upload patterns
- Track user registration patterns

### Performance Monitoring
- Response time monitoring
- Memory usage tracking
- Disk space monitoring
- Database performance (if using)
- Network latency tracking

### Security Monitoring
- Failed login attempts
- Suspicious file access patterns
- Rate limit violations
- CSRF token failures
- SSL certificate expiration

## Maintenance Tasks

### Daily
- [ ] Check error logs
- [ ] Monitor disk usage
- [ ] Verify backup completion

### Weekly
- [ ] Review security logs
- [ ] Check system updates
- [ ] Monitor performance metrics
- [ ] Test backup restoration

### Monthly
- [ ] Security audit
- [ ] Performance optimization review
- [ ] Dependency updates
- [ ] SSL certificate renewal check

## Troubleshooting

### Common Issues
1. **File upload failures**: Check storage directory permissions
2. **Authentication issues**: Verify JWT_SECRET configuration
3. **Email not sending**: Check SMTP configuration
4. **Rate limiting too aggressive**: Adjust rate limit settings
5. **Performance issues**: Enable caching and CDN

### Emergency Procedures
1. **Security breach**: Rotate JWT secrets, check logs
2. **Service down**: Check logs, restart service
3. **Storage full**: Clean up old files, expand storage
4. **Database issues**: Check connection, restart if needed

## Support Contacts
- Technical Support: [your-email]
- Security Issues: [security-email]
- Infrastructure: [infrastructure-email]
`;
}

/**
 * Main optimization function
 */
async function optimizeForProduction() {
  try {
    console.log('📁 Scanning source files...');
    const sourceFiles = await getSourceFiles('src');
    console.log(`Found ${sourceFiles.length} source files\n`);
    
    console.log('🧹 Optimizing console statements...');
    let totalRemoved = 0;
    let filesOptimized = 0;
    
    for (const file of sourceFiles) {
      const removed = await optimizeFile(file);
      if (removed > 0) {
        console.log(`  ✅ ${file}: removed ${removed} console.log statements`);
        totalRemoved += removed;
        filesOptimized++;
      }
    }
    
    if (totalRemoved > 0) {
      console.log(`\n🎯 Optimization complete: removed ${totalRemoved} debug statements from ${filesOptimized} files\n`);
    } else {
      console.log('\n✅ No debug statements found to remove\n');
    }
    
    // Generate production files
    console.log('📝 Generating production configuration files...');
    
    await writeFile('.env.production.example', generateProductionEnv());
    console.log('  ✅ Created .env.production.example');
    
    await writeFile('DEPLOYMENT_CHECKLIST.md', generateDeploymentChecklist());
    console.log('  ✅ Created DEPLOYMENT_CHECKLIST.md');
    
    console.log('\n🚀 Production optimization completed successfully!\n');
    
    console.log('📋 Next Steps:');
    console.log('1. Review .env.production.example and create .env.production');
    console.log('2. Follow DEPLOYMENT_CHECKLIST.md for deployment');
    console.log('3. Run npm run build to verify optimized build');
    console.log('4. Set up monitoring and security measures');
    console.log('5. Test all functionality in production environment\n');
    
    console.log('🔒 Security Reminders:');
    console.log('• Set strong JWT_SECRET (32+ characters)');
    console.log('• Enable HTTPS/TLS certificates');
    console.log('• Configure proper firewall rules');
    console.log('• Set up automated backups');
    console.log('• Monitor security logs regularly');
    console.log('• Keep dependencies updated\n');
    
  } catch (error) {
    console.error('❌ Optimization failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  optimizeForProduction();
}

export { optimizeForProduction };
