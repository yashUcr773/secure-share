# E2E Testing Infrastructure - Installation Guide

## Quick Setup

Follow these steps to set up the comprehensive E2E testing infrastructure:

### 1. Install Playwright

```bash
# Install Playwright and dependencies
npm install @playwright/test --save-dev

# Install browser binaries
npx playwright install

# Install system dependencies (if needed)
npx playwright install-deps
```

### 2. Environment Setup

Create a `.env.test` file:

```bash
# Copy from example
cp .env.example .env.test

# Edit the test environment variables
nano .env.test
```

Required environment variables:

```env
# Database
TEST_DATABASE_URL=postgresql://postgres:password@localhost:5432/secureshare_test

# Application
BASE_URL=http://localhost:3000
NODE_ENV=test

# Security
JWT_SECRET=test-jwt-secret-key
CSRF_SECRET=test-csrf-secret-key

# Email (test mode)
SENDGRID_API_KEY=test-sendgrid-key
EMAIL_FROM=test@example.com

# Admin credentials for testing
TEST_ADMIN_EMAIL=admin@example.com
TEST_ADMIN_PASSWORD=AdminPassword123!
```

### 3. Database Setup

```bash
# Create test database
createdb secureshare_test

# Run migrations on test database
DATABASE_URL=$TEST_DATABASE_URL npx prisma migrate deploy

# Generate Prisma client
npx prisma generate
```

### 4. Verify Installation

```bash
# Check Playwright installation
npx playwright --version

# List available tests
npx playwright test --list

# Run a quick test to verify setup
node run-e2e-tests.js quick --headed
```

## Test Execution

### Using the Test Runner Script

```bash
# Make the script executable (Unix/Linux/Mac)
chmod +x run-e2e-tests.js

# Run all tests
node run-e2e-tests.js all

# Run specific test suites
node run-e2e-tests.js admin --headed
node run-e2e-tests.js contact --debug
node run-e2e-tests.js auth --browser=firefox

# Run with options
node run-e2e-tests.js all --clean --seed --report
```

### Using NPM Scripts

```bash
# Run all E2E tests
npm run test:e2e

# Run with browser visible
npm run test:e2e:headed

# Run specific test suites
npm run test:e2e:admin
npm run test:e2e:contact
npm run test:e2e:auth

# Debug mode
npm run test:e2e:debug

# UI mode for interactive testing
npm run test:e2e:ui

# View test reports
npm run test:e2e:report
```

### Direct Playwright Commands

```bash
# Run all tests
npx playwright test

# Run specific test file
npx playwright test admin-panel.spec.ts

# Run with specific browser
npx playwright test --project=chromium

# Run tests matching pattern
npx playwright test --grep="admin"

# Debug specific test
npx playwright test admin-panel.spec.ts --debug

# Generate test report
npx playwright test --reporter=html
```

## Development Workflow

### 1. Creating New Tests

```bash
# Generate new test file
npx playwright codegen http://localhost:3000

# Copy generated code to appropriate test file
# Follow existing test patterns
```

### 2. Test Data Management

```typescript
// Use test data factories
const user = TestDataFactory.users.regular()
const admin = TestDataFactory.users.admin()
const message = TestDataFactory.contactMessages.valid()

// Seed test data
await setupTestEnvironment(page, {
  seedData: true,
  clearFirst: true,
  minimal: true // or performance: true
})
```

### 3. Debugging Tests

```bash
# Run in debug mode
node run-e2e-tests.js admin --debug

# Use UI mode for interactive debugging
npm run test:e2e:ui

# Record and replay traces
npx playwright test --trace=on
npx playwright show-trace trace.zip
```

## CI/CD Integration

### GitHub Actions Setup

The tests will run automatically on:
- Pull requests
- Pushes to main
- Scheduled runs

Ensure these secrets are set in GitHub:
- `TEST_DATABASE_URL`
- `JWT_SECRET`
- `CSRF_SECRET`

### Local CI Simulation

```bash
# Run tests as they would run in CI
npm run test:e2e:ci

# Run with GitHub Actions reporter
npx playwright test --reporter=github
```

## Troubleshooting

### Common Issues

1. **Playwright not found**
   ```bash
   npm install @playwright/test --save-dev
   npx playwright install
   ```

2. **Database connection errors**
   ```bash
   # Check database is running
   pg_isready -h localhost -p 5432
   
   # Verify connection string
   psql $TEST_DATABASE_URL
   ```

3. **Port conflicts**
   ```bash
   # Check if port 3000 is in use
   lsof -i :3000
   
   # Kill process if needed
   kill -9 <PID>
   ```

4. **Browser installation issues**
   ```bash
   # Reinstall browsers
   npx playwright install --force
   
   # Install system dependencies
   npx playwright install-deps
   ```

5. **Test timeouts**
   ```bash
   # Increase timeout in playwright.config.ts
   timeout: 60 * 1000, // 1 minute
   
   # Or run with custom timeout
   npx playwright test --timeout=120000
   ```

### Debug Information

```bash
# Check Playwright version
npx playwright --version

# List installed browsers
npx playwright install --dry-run

# Check test configuration
npx playwright test --list

# Validate config file
node -e "console.log(require('./playwright.config.ts'))"
```

### Performance Issues

1. **Slow test execution**
   ```bash
   # Run with fewer workers
   npx playwright test --workers=1
   
   # Disable parallelization
   npx playwright test --fullyParallel=false
   ```

2. **Memory issues**
   ```bash
   # Increase Node.js memory
   NODE_OPTIONS="--max-old-space-size=4096" npm run test:e2e
   ```

### Test Data Issues

```bash
# Clear and reseed test database
node -e "
const { teardownTestEnvironment, setupTestEnvironment } = require('./e2e/fixtures/seed');
teardownTestEnvironment().then(() => setupTestEnvironment({ seedData: true }));
"

# Reset database manually
DATABASE_URL=$TEST_DATABASE_URL npx prisma migrate reset --force
```

## Best Practices

### Test Organization

1. **File naming**: `feature.spec.ts`
2. **Test grouping**: Use `test.describe()` blocks
3. **Setup/teardown**: Use `test.beforeEach()` and `test.afterEach()`

### Test Data

1. **Use factories**: Generate consistent test data
2. **Clean state**: Start each test with clean data
3. **Realistic data**: Use data that matches production scenarios

### Assertions

1. **Specific selectors**: Use `data-testid` attributes
2. **Wait for elements**: Use `waitFor` methods instead of fixed delays
3. **Clear expectations**: Write descriptive assertion messages

### Performance

1. **Parallel execution**: Run tests in parallel when possible
2. **Minimal data**: Use minimal test data for faster execution
3. **Efficient selectors**: Use efficient CSS selectors

## Support

For issues with the E2E testing infrastructure:

1. Check this installation guide
2. Review the [E2E-TESTING.md](./E2E-TESTING.md) documentation
3. Check existing test files for examples
4. Contact the development team

## Additional Resources

- [Playwright Documentation](https://playwright.dev/)
- [Playwright Test Runner](https://playwright.dev/docs/test-runners)
- [Debugging Tests](https://playwright.dev/docs/debug)
- [CI/CD Integration](https://playwright.dev/docs/ci)
