#!/usr/bin/env node

/**
 * Simple E2E Test Verification Script
 * Verifies that the E2E testing infrastructure is working correctly
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧪 SecureShare E2E Testing Verification');
console.log('========================================\n');

// Check 1: Playwright Installation
console.log('1. Checking Playwright installation...');
try {
  const version = execSync('npx playwright --version', { encoding: 'utf8' }).trim();
  console.log(`   ✅ Playwright installed: ${version}`);
} catch (error) {
  console.log('   ❌ Playwright not found');
  process.exit(1);
}

// Check 2: Test Files
console.log('\n2. Checking test files...');
const testDir = path.join(__dirname, 'e2e', 'tests');
if (fs.existsSync(testDir)) {
  const testFiles = fs.readdirSync(testDir)
    .filter(file => file.endsWith('.spec.ts'))
    .sort();
  
  console.log(`   ✅ Found ${testFiles.length} test files:`);
  testFiles.forEach(file => {
    console.log(`      - ${file}`);
  });
} else {
  console.log('   ❌ Test directory not found');
  process.exit(1);
}

// Check 3: Configuration
console.log('\n3. Checking configuration...');
const configFile = path.join(__dirname, 'playwright.config.ts');
if (fs.existsSync(configFile)) {
  console.log('   ✅ Playwright configuration found');
} else {
  console.log('   ❌ Playwright configuration missing');
  process.exit(1);
}

// Check 4: Environment
console.log('\n4. Checking environment...');
const envFile = path.join(__dirname, '.env.test');
if (fs.existsSync(envFile)) {
  console.log('   ✅ Test environment file found');
} else {
  console.log('   ⚠️  Test environment file not found (.env.test)');
}

// Check 5: List Tests
console.log('\n5. Listing available tests...');
try {
  const output = execSync('npx playwright test --list', { encoding: 'utf8' });
  if (output.includes('tests found') || output.includes('spec')) {
    console.log('   ✅ Tests are discoverable');
  } else {
    console.log('   ⚠️  No tests found or listing failed');
  }
} catch (error) {
  console.log('   ⚠️  Could not list tests');
}

// Check 6: Available Scripts
console.log('\n6. Available test scripts:');
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const scripts = packageJson.scripts || {};
  const testScripts = Object.keys(scripts).filter(key => key.startsWith('test:e2e'));
  
  testScripts.forEach(script => {
    console.log(`   - npm run ${script}`);
  });
  
  if (testScripts.length > 0) {
    console.log('   ✅ E2E test scripts are configured');
  }
} catch (error) {
  console.log('   ⚠️  Could not read package.json');
}

console.log('\n🎉 E2E Testing Infrastructure Verification Complete!');
console.log('\nTo run tests:');
console.log('  npm run test:e2e');
console.log('  npm run test:e2e:headed');
console.log('  npm run test:e2e:ui');
console.log('  npm run test:e2e:admin');
console.log('  npm run test:e2e:contact');
console.log('\nFor help with Playwright:');
console.log('  npx playwright --help');
console.log('  npx playwright test --help');
