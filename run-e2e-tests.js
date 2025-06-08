#!/usr/bin/env node

/**
 * E2E Test Runner Script
 * Provides convenient commands for running different test suites
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Colors for console output (Windows-compatible)
const colors = {
  reset: '',
  bright: '',
  red: '',
  green: '',
  yellow: '',
  blue: '',
  magenta: '',
  cyan: ''
};

// Enable colors only if supported
if (process.platform !== 'win32' || process.env.FORCE_COLOR) {
  colors.reset = '\x1b[0m';
  colors.bright = '\x1b[1m';
  colors.red = '\x1b[31m';
  colors.green = '\x1b[32m';
  colors.yellow = '\x1b[33m';
  colors.blue = '\x1b[34m';
  colors.magenta = '\x1b[35m';
  colors.cyan = '\x1b[36m';
}

function log(message, color = 'reset') {
  const output = `${colors[color]}${message}${colors.reset}`;
  console.log(output);
  // Ensure output is flushed on Windows
  if (process.platform === 'win32') {
    process.stdout.write('');
  }
}

function showUsage() {
  log('\n🧪 SecureShare E2E Test Runner', 'cyan');
  log('=====================================', 'cyan');
  log('\nUsage: node run-e2e-tests.js [command] [options]\n', 'bright');
  
  log('Commands:', 'bright');
  log('  all              Run all E2E tests', 'green');
  log('  auth             Run authentication tests', 'green');
  log('  dashboard        Run dashboard tests', 'green');
  log('  files            Run file management tests', 'green');
  log('  admin            Run admin panel tests', 'green');
  log('  contact          Run contact form tests', 'green');
  log('  quick            Run quick smoke tests', 'green');
  log('  performance      Run performance tests', 'green');
  log('  mobile           Run mobile-specific tests', 'green');
  log('  security         Run security tests', 'green');
  
  log('\nOptions:', 'bright');
  log('  --headed         Run tests in headed mode (visible browser)', 'yellow');
  log('  --debug          Run tests in debug mode', 'yellow');
  log('  --ui             Run tests in UI mode', 'yellow');
  log('  --browser=NAME   Run tests in specific browser (chrome, firefox, safari)', 'yellow');
  log('  --project=NAME   Run tests for specific project', 'yellow');
  log('  --retries=N      Set number of retries (default: 0)', 'yellow');
  log('  --workers=N      Set number of parallel workers', 'yellow');
  log('  --timeout=MS     Set test timeout in milliseconds', 'yellow');
  log('  --grep=PATTERN   Run tests matching pattern', 'yellow');
  log('  --report         Show test report after completion', 'yellow');
  log('  --clean          Clean test database before running', 'yellow');
  log('  --seed           Seed test data before running', 'yellow');
  
  log('\nExamples:', 'bright');
  log('  node run-e2e-tests.js all --headed', 'blue');
  log('  node run-e2e-tests.js admin --debug', 'blue');
  log('  node run-e2e-tests.js contact --browser=firefox', 'blue');
  log('  node run-e2e-tests.js quick --clean --seed', 'blue');
  log('  node run-e2e-tests.js all --grep="should login"', 'blue');
  
  log('\n');
}

function parseArgs(args) {
  const command = args[2] || 'help';
  const options = {};
  
  for (let i = 3; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      if (arg.includes('=')) {
        const [key, value] = arg.substring(2).split('=');
        options[key] = value;
      } else {
        options[arg.substring(2)] = true;
      }
    }
  }
  
  return { command, options };
}

function buildPlaywrightCommand(testPattern, options) {
  let cmd = 'npx playwright test';
  
  if (testPattern) {
    cmd += ` ${testPattern}`;
  }
  
  // Add options
  if (options.headed) cmd += ' --headed';
  if (options.debug) cmd += ' --debug';
  if (options.ui) cmd += ' --ui';
  if (options.browser) cmd += ` --project=${options.browser}`;
  if (options.project) cmd += ` --project=${options.project}`;
  if (options.retries) cmd += ` --retries=${options.retries}`;
  if (options.workers) cmd += ` --workers=${options.workers}`;
  if (options.timeout) cmd += ` --timeout=${options.timeout}`;
  if (options.grep) cmd += ` --grep="${options.grep}"`;
  
  return cmd;
}

async function setupEnvironment(options) {
  if (options.clean) {
    log('🧹 Cleaning test database...', 'yellow');
    try {
      execSync('npm run db:test:reset', { stdio: 'inherit' });
      log('✅ Test database cleaned', 'green');
    } catch (error) {
      log('⚠️  Warning: Could not clean test database', 'yellow');
    }
  }
  
  if (options.seed) {
    log('🌱 Seeding test data...', 'yellow');
    try {
      execSync('npm run db:test:seed', { stdio: 'inherit' });
      log('✅ Test data seeded', 'green');
    } catch (error) {
      log('⚠️  Warning: Could not seed test data', 'yellow');
    }
  }
}

function getTestPattern(command) {
  const patterns = {
    all: '',
    auth: 'auth.spec.ts',
    dashboard: 'dashboard.spec.ts',
    files: 'file-management.spec.ts',
    admin: 'admin-panel.spec.ts',
    contact: 'contact-form.spec.ts',
    quick: 'auth.spec.ts dashboard.spec.ts',
    performance: '--grep="performance|load|speed"',
    mobile: '--project="Mobile Chrome" --project="Mobile Safari"',
    security: '--grep="security|csrf|auth|permission"'
  };
  
  return patterns[command] || '';
}

async function runTests(command, options) {
  log(`\n🚀 Running ${command} tests...`, 'cyan');
  
  // Setup environment if needed
  await setupEnvironment(options);
  
  // Build and execute command
  const testPattern = getTestPattern(command);
  const cmd = buildPlaywrightCommand(testPattern, options);
  
  log(`\n📋 Command: ${cmd}`, 'blue');
  log('', 'reset');
  
  try {
    const startTime = Date.now();
    execSync(cmd, { stdio: 'inherit' });
    const duration = Math.round((Date.now() - startTime) / 1000);
    
    log(`\n✅ Tests completed successfully in ${duration}s`, 'green');
    
    if (options.report) {
      log('\n📊 Opening test report...', 'cyan');
      execSync('npx playwright show-report', { stdio: 'inherit' });
    }
    
  } catch (error) {
    log('\n❌ Tests failed', 'red');
    
    if (options.report) {
      log('\n📊 Opening test report for debugging...', 'cyan');
      try {
        execSync('npx playwright show-report', { stdio: 'inherit' });
      } catch (reportError) {
        log('Could not open test report', 'yellow');
      }
    }
    
    process.exit(1);
  }
}

function checkPrerequisites() {
  // Check if Playwright is installed
  try {
    execSync('npx playwright --version', { stdio: 'pipe' });
  } catch (error) {
    log('❌ Playwright not found. Installing...', 'red');
    try {
      execSync('npm install @playwright/test', { stdio: 'inherit' });
      execSync('npx playwright install', { stdio: 'inherit' });
      log('✅ Playwright installed successfully', 'green');
    } catch (installError) {
      log('❌ Failed to install Playwright', 'red');
      process.exit(1);
    }
  }
  
  // Check if test directory exists
  if (!fs.existsSync(path.join(__dirname, 'e2e'))) {
    log('❌ E2E test directory not found', 'red');
    process.exit(1);
  }
  
  // Check if config file exists
  if (!fs.existsSync(path.join(__dirname, 'playwright.config.ts'))) {
    log('❌ Playwright config file not found', 'red');
    process.exit(1);
  }
}

function showTestInfo() {
  log('\n📁 Available test files:', 'bright');
  
  const testDir = path.join(__dirname, 'e2e', 'tests');
  if (fs.existsSync(testDir)) {
    const testFiles = fs.readdirSync(testDir)
      .filter(file => file.endsWith('.spec.ts'))
      .sort();
    
    testFiles.forEach(file => {
      const name = file.replace('.spec.ts', '');
      log(`  ✓ ${name}`, 'green');
    });
  }
  
  log('\n🌐 Available browsers:', 'bright');
  log('  ✓ chromium (default)', 'green');
  log('  ✓ firefox', 'green');
  log('  ✓ webkit (Safari)', 'green');
  log('  ✓ edge', 'green');
  log('  ✓ chrome', 'green');
  
  log('\n📱 Mobile projects:', 'bright');
  log('  ✓ Mobile Chrome', 'green');
  log('  ✓ Mobile Safari', 'green');
}

async function main() {
  const { command, options } = parseArgs(process.argv);
  
  if (command === 'help' || command === '--help' || command === '-h') {
    showUsage();
    return;
  }
  
  if (command === 'info') {
    showTestInfo();
    return;
  }
  
  // Check prerequisites
  checkPrerequisites();
  
  // Validate command
  const validCommands = ['all', 'auth', 'dashboard', 'files', 'admin', 'contact', 'quick', 'performance', 'mobile', 'security'];
  if (!validCommands.includes(command)) {
    log(`❌ Unknown command: ${command}`, 'red');
    log(`Valid commands: ${validCommands.join(', ')}`, 'yellow');
    showUsage();
    process.exit(1);
  }
  
  // Run tests
  await runTests(command, options);
}

// Handle process signals
process.on('SIGINT', () => {
  log('\n\n⏹️  Test execution interrupted', 'yellow');
  process.exit(130);
});

process.on('SIGTERM', () => {
  log('\n\n⏹️  Test execution terminated', 'yellow');
  process.exit(143);
});

// Run main function
main().catch(error => {
  log(`\n❌ Unexpected error: ${error.message}`, 'red');
  process.exit(1);
});

module.exports = {
  runTests,
  buildPlaywrightCommand,
  getTestPattern
};
