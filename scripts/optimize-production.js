const fs = require('fs').promises;
const path = require('path');

console.log('🚀 SecureShare Production Optimization\n');

async function getSourceFiles(dir, files = []) {
  try {
    const items = await fs.readdir(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stats = await fs.stat(fullPath);
      
      if (stats.isDirectory()) {
        if (!['node_modules', '.next', 'dist', 'build'].includes(item)) {
          await getSourceFiles(fullPath, files);
        }
      } else if (stats.isFile()) {
        const ext = path.extname(item);
        if (['.ts', '.tsx', '.js', '.jsx'].includes(ext) && !item.endsWith('.d.ts')) {
          files.push(fullPath);
        }
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error.message);
  }
  
  return files;
}

function shouldPreserveConsole(line) {
  const preservePatterns = [
    'console.error',
    'console.warn', 
    'logSecurityEvent',
    'Security Event:',
    'Account deletion',
    'User registration',
    'Login attempt',
    'CSRF validation',
    'Rate limit exceeded',
    'Contact message',
    'saved successfully'
  ];
  
  return preservePatterns.some(pattern => line.includes(pattern));
}

async function optimizeFile(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n');
    let optimizedLines = [];
    let removedCount = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (line.includes('console.log') && !shouldPreserveConsole(line)) {
        let fullStatement = line;
        let j = i;
        
        while (j < lines.length && !fullStatement.includes(';') && !fullStatement.includes(')')) {
          j++;
          if (j < lines.length) {
            fullStatement += '\n' + lines[j];
          }
        }
        
        if (shouldPreserveConsole(fullStatement)) {
          optimizedLines.push(line);
        } else {
          removedCount++;
          if (j > i) {
            i = j;
          }
        }
      } else {
        optimizedLines.push(line);
      }
    }
    
    if (removedCount > 0) {
      await fs.writeFile(filePath, optimizedLines.join('\n'));
      return removedCount;
    }
    
    return 0;
  } catch (error) {
    console.error(`Failed to optimize ${filePath}:`, error.message);
    return 0;
  }
}

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
    
    console.log('📝 Generating production configuration files...');
    
    await fs.writeFile('.env.production.example', generateProductionEnv());
    console.log('  ✅ Created .env.production.example');
    
    console.log('\n🚀 Production optimization completed successfully!\n');
    
    console.log('📋 Next Steps:');
    console.log('1. Review .env.production.example and create .env.production');
    console.log('2. Run npm run build to verify optimized build');
    console.log('3. Test all functionality before deployment');
    console.log('4. Set up monitoring and security measures\n');
    
    console.log('🔒 Security Reminders:');
    console.log('• Set strong JWT_SECRET (32+ characters)');
    console.log('• Enable HTTPS/TLS certificates');
    console.log('• Configure proper firewall rules');
    console.log('• Set up automated backups');
    console.log('• Monitor security logs regularly\n');
    
  } catch (error) {
    console.error('❌ Optimization failed:', error);
    process.exit(1);
  }
}

optimizeForProduction();
