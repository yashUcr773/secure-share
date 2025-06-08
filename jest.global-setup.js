// Global Jest setup - runs once before all tests
const { execSync } = require('child_process');

module.exports = async () => {
  console.log('🧪 Setting up test environment...');
  
  // Ensure test data directory exists
  try {
    const fs = require('fs');
    const path = require('path');
    
    const testDataDir = path.join(__dirname, 'test-data');
    if (!fs.existsSync(testDataDir)) {
      fs.mkdirSync(testDataDir, { recursive: true });
    }
    
    // Clean up any existing test data
    const files = fs.readdirSync(testDataDir);
    for (const file of files) {
      if (file !== '.gitkeep') {
        fs.unlinkSync(path.join(testDataDir, file));
      }
    }
    
    console.log('✅ Test data directory prepared');
  } catch (error) {
    console.warn('⚠️ Could not prepare test data directory:', error.message);
  }
  
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-jwt-secret-for-testing-only-at-least-32-characters-long';
  process.env.SESSION_SECRET = 'test-session-secret-for-testing';
  process.env.NEXT_PUBLIC_BASE_URL = 'http://localhost:3000';
  process.env.STORAGE_DIR = './test-data';
  process.env.KEY_DERIVATION_ITERATIONS = '10000';
  process.env.SENDGRID_API_KEY = 'test-sendgrid-key';
  process.env.FROM_EMAIL = 'test@example.com';
  
  console.log('✅ Test environment variables set');
};
