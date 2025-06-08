#!/usr/bin/env node
/**
 * Database setup script for E2E testing
 * Ensures test database exists and is properly configured
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Load test environment variables
require('dotenv').config({ path: '.env.test' });

const TEST_DB_URL = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
const DB_NAME = 'secureshare_test';

function log(message, color = 'white') {
  const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    reset: '\x1b[0m'
  };
  
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function setupTestDatabase() {
  try {
    log('🔧 Setting up test environment...', 'cyan');
    
    // Check if PostgreSQL is available (optional)
    let postgresAvailable = false;
    try {
      execSync('pg_isready -h localhost -p 5432', { stdio: 'pipe' });
      log('✅ PostgreSQL is available', 'green');
      postgresAvailable = true;
    } catch (error) {
      log('ℹ️  PostgreSQL not available - using file-based storage', 'blue');
    }
    
    // Create test database if PostgreSQL is available
    if (postgresAvailable) {
      try {
        log(`📂 Creating test database: ${DB_NAME}`, 'yellow');
        execSync(`createdb ${DB_NAME}`, { stdio: 'pipe' });
        log('✅ Test database created successfully', 'green');
      } catch (error) {
        if (error.message.includes('already exists')) {
          log('ℹ️  Test database already exists', 'blue');
        } else {
          log('⚠️  Warning: Could not create test database', 'yellow');
          console.log('Error:', error.message);
        }
      }
    }    
    // Check if we have prisma schema
    const schemaPath = path.join(__dirname, 'prisma', 'schema.prisma');
    if (fs.existsSync(schemaPath) && postgresAvailable) {
      log('📋 Running database migrations...', 'yellow');
      try {
        execSync(`DATABASE_URL="${TEST_DB_URL}" npx prisma migrate deploy`, { 
          stdio: 'inherit',
          env: { ...process.env, DATABASE_URL: TEST_DB_URL }
        });
        log('✅ Database migrations completed', 'green');
      } catch (error) {
        log('⚠️  Warning: Database migrations failed', 'yellow');
        console.log('This might be OK if you\'re using file-based storage.');
      }
      
      // Generate Prisma client
      try {
        log('🔨 Generating Prisma client...', 'yellow');
        execSync('npx prisma generate', { stdio: 'inherit' });
        log('✅ Prisma client generated', 'green');
      } catch (error) {
        log('⚠️  Warning: Prisma client generation failed', 'yellow');
      }    } else {
      log('ℹ️  Using file-based storage for testing', 'blue');
    }
    
    // Ensure test data directory exists
    const testDataDir = process.env.STORAGE_DIR || './test-data';
    if (!fs.existsSync(testDataDir)) {
      fs.mkdirSync(testDataDir, { recursive: true });
      log(`📁 Created test data directory: ${testDataDir}`, 'green');
    }
    
    log('🎉 Test database setup completed successfully!', 'green');
    log('', 'white');
    log('Next steps:', 'cyan');
    log('1. Run: npm run test:e2e:ui', 'white');
    log('2. Or: node run-e2e-tests.js', 'white');
    
  } catch (error) {
    log('❌ Test database setup failed:', 'red');
    console.error(error);
    process.exit(1);
  }
}

// Run setup if called directly
if (require.main === module) {
  setupTestDatabase();
}

module.exports = { setupTestDatabase };
