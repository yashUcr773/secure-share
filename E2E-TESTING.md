# E2E Testing Documentation

This document provides comprehensive information about the End-to-End (E2E) testing infrastructure for the SecureShare application.

## Overview

The E2E testing suite uses Playwright to test the complete user workflows across different browsers and devices. The tests cover:

- Authentication workflows
- File management operations  
- Dashboard functionality
- Admin panel features
- Contact form workflows
- Security and performance aspects

## Test Structure

```
e2e/
├── fixtures/
│   └── seed.ts              # Database seeding utilities
├── helpers/
│   └── test-helpers.ts      # Shared test utilities and helpers
├── tests/
│   ├── auth.spec.ts         # Authentication workflow tests
│   ├── dashboard.spec.ts    # Dashboard functionality tests
│   ├── file-management.spec.ts # File operations tests
│   ├── admin-panel.spec.ts  # Admin panel tests (NEW)
│   └── contact-form.spec.ts # Contact form tests (NEW)
├── global-setup.ts          # Global test setup
├── global-teardown.ts       # Global test teardown
└── playwright.config.ts     # Playwright configuration
```

## Test Categories

### 1. Authentication Tests (`auth.spec.ts`)
- User login/logout workflows
- Registration process
- Password validation
- Session management
- Multi-factor authentication (if enabled)

### 2. File Management Tests (`file-management.spec.ts`)
- File upload/download operations
- Folder creation and management
- File sharing functionality
- Bulk operations
- File permissions

### 3. Dashboard Tests (`dashboard.spec.ts`)
- Dashboard navigation
- Analytics display
- User interface interactions
- Responsive design

### 4. Admin Panel Tests (`admin-panel.spec.ts`) ✨ NEW
- **System Monitoring**
  - Health metrics display
  - Job queue management
  - Cache performance monitoring
  - Real-time updates

- **Storage Management**
  - Storage statistics
  - File type breakdown
  - Usage trends
  - Cleanup operations

- **User Role Management**
  - User management table
  - Role changes
  - User deletion
  - Bulk operations
  - Audit logging

- **Security & Access Control**
  - Admin authentication
  - Access restrictions
  - Session management
  - Destructive action confirmations

### 5. Contact Form Tests (`contact-form.spec.ts`) ✨ NEW
- **Form Validation**
  - Required field validation
  - Email format validation
  - Message length validation
  - Character limits

- **Form Submission**
  - Successful submissions
  - Error handling
  - Loading states
  - Retry mechanisms
  - Duplicate prevention

- **Security Features**
  - CSRF protection
  - Rate limiting
  - Spam detection
  - Input sanitization

- **User Experience**
  - Form persistence
  - Mobile responsiveness
  - Accessibility
  - Performance

## Test Data Management

### Database Seeding

The `DatabaseSeeder` class provides comprehensive test data management:

```typescript
// Seed full test dataset
await seeder.seedTestData()

// Seed minimal data for quick tests
await seeder.seedMinimalData()

// Seed large dataset for performance testing
await seeder.seedPerformanceData()

// Clear all test data
await seeder.clearTestData()
```

### Test Data Factories

Consistent test data generation using factories:

```typescript
// Generate test users
const user = TestDataFactory.users.regular()
const admin = TestDataFactory.users.admin()
const usersWithFiles = TestDataFactory.users.withFiles(5)

// Generate test files
const textFile = TestDataFactory.files.text()
const imageFile = TestDataFactory.files.image()
const largeFile = TestDataFactory.files.large()

// Generate contact messages
const validMessage = TestDataFactory.contactMessages.valid()
const spamMessage = TestDataFactory.contactMessages.spam()
```

## Running Tests

### Basic Commands

```bash
# Run all E2E tests
npm run test:e2e

# Run tests in headed mode (see browser)
npm run test:e2e:headed

# Run tests with debugging
npm run test:e2e:debug

# Run tests with UI mode
npm run test:e2e:ui

# Show test reports
npm run test:e2e:report
```

### Specific Test Suites

```bash
# Run admin panel tests only
npm run test:e2e:admin

# Run contact form tests only  
npm run test:e2e:contact

# Run authentication tests only
npm run test:e2e:auth

# Run file management tests only
npm run test:e2e:files

# Run dashboard tests only
npm run test:e2e:dashboard
```

### CI/CD Integration

```bash
# Run tests for CI (GitHub Actions format)
npm run test:e2e:ci
```

## Test Environment Setup

### Prerequisites

1. **Node.js** (v18 or later)
2. **PostgreSQL** database for testing
3. **Test environment variables**

### Environment Variables

Create a `.env.test` file:

```env
# Database
TEST_DATABASE_URL=postgresql://postgres:password@localhost:5432/secureshare_test

# Application
BASE_URL=http://localhost:3000
NODE_ENV=test

# Security
JWT_SECRET=test-jwt-secret
CSRF_SECRET=test-csrf-secret

# Email (use test credentials)
SENDGRID_API_KEY=test-key
```

### Setup Process

1. **Install dependencies**:
   ```bash
   npm install
   npx playwright install
   ```

2. **Setup test database**:
   ```bash
   createdb secureshare_test
   DATABASE_URL=$TEST_DATABASE_URL npx prisma migrate deploy
   ```

3. **Start development server**:
   ```bash
   npm run dev
   ```

4. **Run tests**:
   ```bash
   npm run test:e2e
   ```

## Test Configuration

### Playwright Configuration

Key configuration options in `playwright.config.ts`:

- **Multiple browsers**: Chrome, Firefox, Safari, Edge
- **Mobile testing**: iOS Safari, Android Chrome
- **Parallel execution**: Tests run in parallel for speed
- **Retries**: Automatic retry on CI for flaky tests
- **Screenshots/Videos**: Captured on failure
- **Tracing**: Available for debugging

### Browser Matrix

| Browser | Desktop | Mobile | Notes |
|---------|---------|--------|--------|
| Chrome | ✅ | ✅ | Primary test browser |
| Firefox | ✅ | ❌ | Cross-browser compatibility |
| Safari | ✅ | ✅ | WebKit engine testing |
| Edge | ✅ | ❌ | Chromium-based alternative |

## Test Helpers and Utilities

### TestHelpers Class

Comprehensive helper methods for common operations:

```typescript
const helpers = new TestHelpers(page)

// Navigation
await helpers.navigateToHome()
await helpers.navigateToAdminPanel()
await helpers.navigateToContact()

// Authentication
await helpers.loginAsAdmin()
await helpers.loginUser('user@example.com', 'password')
await helpers.logout()

// Admin operations
await helpers.checkSystemHealth()
await helpers.viewStorageStats()
await helpers.manageUsers()
await helpers.changeUserRole(userId, 'admin')

// Contact form
await helpers.fillContactForm(contactData)
await helpers.submitContactForm()
await helpers.expectContactFormSuccess()

// File operations
await helpers.uploadFile(filePath)
await helpers.shareFile(fileName, 'public')
await helpers.deleteFile(fileName)

// Assertions
await helpers.expectElementToBeVisible(selector)
await helpers.expectToBeOnPage(path)
await helpers.expectNotificationToShow(message)
```

### Error Simulation

Test error scenarios and edge cases:

```typescript
// Network errors
await helpers.simulateNetworkError()
await helpers.simulateSlowNetwork(3000)

// Server errors
await helpers.simulateServerError('/api/endpoint')

// CSRF protection testing
await helpers.expectCSRFProtection('/api/contact')

// Rate limiting testing
await helpers.testRateLimit('/api/contact', 5)
```

## Performance Testing

### Metrics Collection

```typescript
// Page load performance
const loadTime = await helpers.measurePageLoadTime()
expect(loadTime).toBeLessThan(3000)

// API response time
const apiTime = await helpers.measureApiResponseTime('/api/data')
expect(apiTime).toBeLessThan(1000)
```

### Large Dataset Testing

```typescript
// Test with large datasets
await setupTestEnvironment(page, { 
  seedData: true, 
  performance: true // Creates 100 users, 1000 files
})
```

## Security Testing

### Authentication & Authorization

- Admin access control
- Session timeout handling
- Role-based permissions
- Unauthorized access prevention

### Input Validation

- Form validation bypass attempts
- XSS prevention testing
- SQL injection prevention
- File upload security

### Protection Mechanisms

- CSRF token validation
- Rate limiting enforcement
- Spam detection
- Input sanitization

## Debugging Tests

### Debug Mode

```bash
# Run specific test in debug mode
npx playwright test admin-panel.spec.ts --debug

# Run with specific browser
npx playwright test --project=chromium --debug
```

### Test Inspection

```bash
# Interactive UI mode
npx playwright test --ui

# Generate and view traces
npx playwright test --trace=on
npx playwright show-trace trace.zip
```

### Common Issues

1. **Timing Issues**: Use proper waits instead of fixed timeouts
2. **Selector Issues**: Use data-testid attributes consistently  
3. **State Management**: Clear storage between tests
4. **Database State**: Ensure proper seeding and cleanup

## CI/CD Integration

### GitHub Actions

Tests run automatically on:
- Pull requests
- Pushes to main branch
- Scheduled runs (nightly)

### Test Reports

- HTML reports generated after each run
- JUnit XML for CI integration
- JSON results for analysis
- Screenshots/videos for failures

## Best Practices

### Test Writing

1. **Use Page Object Pattern**: Encapsulate page interactions
2. **Data-driven Tests**: Use test data factories
3. **Independent Tests**: Each test should be self-contained
4. **Descriptive Names**: Clear test and assertion descriptions

### Performance

1. **Parallel Execution**: Run tests in parallel when possible
2. **Selective Testing**: Run specific suites during development
3. **Efficient Setup**: Use minimal data seeding when possible
4. **Resource Cleanup**: Always clean up test data

### Maintenance

1. **Regular Updates**: Keep Playwright and dependencies updated
2. **Test Review**: Regularly review and update test scenarios
3. **Monitoring**: Track test execution times and failure rates
4. **Documentation**: Keep this documentation current

## Troubleshooting

### Common Commands

```bash
# Install/update browsers
npx playwright install

# Check Playwright version
npx playwright --version

# Validate configuration
npx playwright test --list

# Clear test data manually
node -e "require('./e2e/fixtures/seed.ts').teardownTestEnvironment()"
```

### Environment Issues

1. **Database Connection**: Verify TEST_DATABASE_URL
2. **Port Conflicts**: Ensure port 3000 is available
3. **Permission Issues**: Check file system permissions
4. **Browser Installation**: Run `npx playwright install`

## Contributing

When adding new tests:

1. Follow existing naming conventions
2. Use appropriate test data factories
3. Add proper documentation
4. Test across multiple browsers
5. Include error scenarios
6. Update this documentation

---

For questions or issues with the E2E testing infrastructure, please refer to the [TESTING.md](./TESTING.md) file or contact the development team.
