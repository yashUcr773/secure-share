#!/usr/bin/env node
/**
 * E2E Testing Infrastructure Validation Script
 * Validates that all components of the testing infrastructure are working properly
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧪 Starting E2E Testing Infrastructure Validation...\n');

// Check if required files exist
const requiredFiles = [
  'playwright.config.ts',
  'e2e/global-setup.ts',
  'e2e/global-teardown.ts',
  'e2e/fixtures/seed.ts',
  'e2e/helpers/test-helpers.ts',
  'e2e/tests/admin-panel-new.spec.ts',
  'e2e/tests/contact-form-enhanced.spec.ts',
  'e2e/tests/infrastructure.spec.ts',
  'scripts/reset-test-db.js',
  '.env.test'
];

let allFilesExist = true;

console.log('📁 Checking required files...');
requiredFiles.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - MISSING`);
    allFilesExist = false;
  }
});

if (!allFilesExist) {
  console.log('\n❌ Some required files are missing. Please check your setup.');
  process.exit(1);
}

console.log('\n🗄️  Resetting test database...');
try {
  execSync('node scripts/reset-test-db.js', { stdio: 'inherit' });
  console.log('✅ Database reset completed');
} catch (error) {
  console.error('❌ Database reset failed:', error.message);
  process.exit(1);
}

console.log('\n🎭 Verifying Playwright installation...');
try {
  execSync('npx playwright --version', { stdio: 'inherit' });
  console.log('✅ Playwright is installed');
} catch (error) {
  console.error('❌ Playwright not found. Please run: npx playwright install');
  process.exit(1);
}

console.log('\n📋 Listing available tests...');
try {
  const output = execSync('npx playwright test --list', { encoding: 'utf8' });
  const testCount = (output.match(/Total: (\d+) tests/)?.[1]) || '0';
  console.log(`✅ Found ${testCount} tests across all test files`);
} catch (error) {
  console.error('❌ Failed to list tests:', error.message);
  process.exit(1);
}

console.log('\n🚀 Running infrastructure tests...');
try {
  execSync('npx playwright test infrastructure.spec.ts --reporter=line', { stdio: 'inherit' });
  console.log('✅ Infrastructure tests passed');
} catch (error) {
  console.error('❌ Infrastructure tests failed');
  process.exit(1);
}

console.log('\n📊 Test Infrastructure Validation Summary:');
console.log('✅ All required files present');
console.log('✅ Database reset functionality working');
console.log('✅ Playwright properly installed');
console.log('✅ Test discovery working');
console.log('✅ Infrastructure tests passing');

console.log('\n🎉 E2E Testing Infrastructure is ready!');
console.log('\nNext steps:');
console.log('1. Run all tests: npm run test:e2e');
console.log('2. Run specific suites: npm run test:e2e:admin or npm run test:e2e:contact');
console.log('3. Debug tests: npm run test:e2e:debug');
console.log('4. View test report: npm run test:e2e:report');
console.log('\nFor detailed documentation, see: E2E-TESTING-GUIDE.md');
