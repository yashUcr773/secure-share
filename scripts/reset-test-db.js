#!/usr/bin/env node

/**
 * Script to reset and initialize the test database
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function execCommand(command, description) {
  try {
    log(`🔧 ${description}...`, 'blue');
    execSync(command, { 
      stdio: 'inherit',
      env: { 
        ...process.env,
        DATABASE_URL: 'file:./test-data/test.db'
      }
    });
    log(`✅ ${description} completed`, 'green');
    return true;
  } catch (error) {
    log(`❌ ${description} failed: ${error.message}`, 'red');
    return false;
  }
}

async function createTestData() {
  try {
    log('🌱 Creating basic test data...', 'blue');
    
    const { PrismaClient } = require('../src/generated/prisma');
    const bcrypt = require('bcryptjs');
    
    const prisma = new PrismaClient({
      datasources: {
        db: {
          url: 'file:./test-data/test.db'
        }
      }
    });

    // Create test users
    const testUsers = [
      {
        email: 'test@example.com',
        passwordHash: await bcrypt.hash('password123', 10),
        name: 'Test User',
        isActive: true,
        emailVerified: true
      },
      {
        email: 'admin@example.com',
        passwordHash: await bcrypt.hash('admin123', 10),
        name: 'Admin User',
        isActive: true,
        emailVerified: true
      }
    ];

    for (const user of testUsers) {
      await prisma.user.create({ data: user });
    }

    await prisma.$disconnect();
    log('✅ Basic test data created', 'green');
  } catch (error) {
    log(`⚠️  Could not create test data: ${error.message}`, 'yellow');
    log('ℹ️  Tests will use file-based authentication fallback', 'blue');
  }
}

async function resetTestDatabase() {
  log('🚀 Starting test database reset...', 'cyan');

  // Ensure test-data directory exists
  const testDataDir = './test-data';
  if (!fs.existsSync(testDataDir)) {
    fs.mkdirSync(testDataDir, { recursive: true });
    log('📁 Created test-data directory', 'green');
  }

  // Remove existing test database
  const testDbPath = path.join(testDataDir, 'test.db');
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
    log('🗑️  Removed existing test database', 'yellow');
  }

  // Remove journal file if it exists
  const journalPath = testDbPath + '-journal';
  if (fs.existsSync(journalPath)) {
    fs.unlinkSync(journalPath);
    log('🗑️  Removed database journal file', 'yellow');
  }

  // Generate Prisma client
  execCommand('npx prisma generate', 'Generating Prisma client');

  // Create and initialize the database
  if (execCommand('npx prisma db push --force-reset', 'Creating database schema')) {
    log('✅ Test database reset completed successfully!', 'green');
  } else {
    log('❌ Failed to reset test database', 'red');
    process.exit(1);
  }
  // Create basic test user data
  await createTestData();

  log('🎉 Test database setup completed!', 'green');
}

// Run the reset
resetTestDatabase().catch(error => {
  log(`❌ Fatal error: ${error.message}`, 'red');
  process.exit(1);
});
