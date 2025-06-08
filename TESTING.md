# SecureShare Testing Documentation

## Overview

This document provides comprehensive guidelines for testing the SecureShare application, including unit tests, integration tests, end-to-end tests, performance tests, and security tests.

## Table of Contents

1. [Test Structure](#test-structure)
2. [Test Categories](#test-categories)
3. [Setup and Configuration](#setup-and-configuration)
4. [Testing Guidelines](#testing-guidelines)
5. [Best Practices](#best-practices)
6. [Test Data and Fixtures](#test-data-and-fixtures)
7. [Continuous Integration](#continuous-integration)
8. [Troubleshooting](#troubleshooting)

## Test Structure

### Directory Organization

```
src/
├── app/
│   ├── api/
│   │   └── __tests__/
│   │       ├── admin-monitoring.integration.test.ts     # Admin API tests
│   │       ├── auth-refresh.integration.test.ts        # Auth refresh tests
│   │       ├── auth-logout.integration.test.ts         # Auth logout tests
│   │       ├── auth-verify.integration.test.ts         # Auth verification tests
│   │       ├── auth-signup.integration.test.ts         # User signup tests
│   │       ├── auth-reset-password.integration.test.ts # Password reset tests
│   │       ├── dashboard-files.integration.test.ts     # Dashboard files tests
│   │       ├── dashboard-shared.integration.test.ts    # Dashboard shared tests
│   │       ├── performance.test.ts                     # Performance tests
│   │       └── security.test.ts                        # Security tests
│   └── components/
│       └── __tests__/
│           ├── ui/                                      # UI component tests
│           └── helpers/                                 # Test helper utilities
├── lib/
│   └── __tests__/
│       ├── auth.test.ts                                # Auth library tests
│       ├── storage.test.ts                             # Storage tests
│       └── utils.test.ts                               # Utility tests
└── e2e/
    ├── tests/                                          # End-to-end tests
    ├── fixtures/                                       # Test fixtures
    └── utils/                                          # E2E utilities
```

## Test Categories

### 1. Unit Tests

**Purpose**: Test individual components and functions in isolation

**Location**: `src/**/__tests__/*.test.ts`

**Coverage**:
- UI Components (React components)
- Utility functions
- Authentication helpers
- Data transformation functions

**Example**:
```typescript
describe('Button Component', () => {
  it('should render with correct text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });
});
```

### 2. Integration Tests

**Purpose**: Test API endpoints and component interactions

**Location**: `src/app/api/__tests__/*.integration.test.ts`

**Coverage**:
- API route handlers
- Database interactions
- Authentication flows
- File operations

**Example**:
```typescript
describe('Files API Integration', () => {
  it('should upload file successfully', async () => {
    const formData = new FormData();
    formData.append('file', mockFile);
    
    const response = await FilesUpload(request);
    expect(response.status).toBe(201);
  });
});
```

### 3. End-to-End Tests

**Purpose**: Test complete user workflows

**Location**: `e2e/tests/*.spec.ts`

**Coverage**:
- User authentication flows
- File upload and sharing
- Dashboard interactions
- Admin functionality

**Example**:
```typescript
test('user can upload and share file', async ({ page }) => {
  await page.goto('/dashboard');
  await page.click('[data-testid="upload-button"]');
  // ... test implementation
});
```

### 4. Performance Tests

**Purpose**: Test application performance under load

**Location**: `src/app/api/__tests__/performance.test.ts`

**Coverage**:
- API response times
- Concurrent request handling
- Memory usage
- File upload performance

### 5. Security Tests

**Purpose**: Test security vulnerabilities and threats

**Location**: `src/app/api/__tests__/security.test.ts`

**Coverage**:
- Authentication bypass attempts
- Input validation
- SQL injection prevention
- XSS prevention
- Rate limiting

## Setup and Configuration

### Prerequisites

```bash
# Install dependencies
npm install

# Install test dependencies
npm install --save-dev jest @testing-library/react @testing-library/jest-dom
npm install --save-dev @playwright/test
npm install --save-dev supertest
```

### Jest Configuration

**File**: `jest.config.js`

```javascript
const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testEnvironment: 'jest-environment-jsdom',
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/layout.tsx',
    '!src/**/loading.tsx',
    '!src/**/not-found.tsx',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};

module.exports = createJestConfig(customJestConfig);
```

### Playwright Configuration

**File**: `playwright.config.ts`

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

## Testing Guidelines

### Naming Conventions

1. **Test Files**: `*.test.ts` for unit tests, `*.integration.test.ts` for integration tests
2. **Test Descriptions**: Use descriptive names that explain the expected behavior
3. **Test Groups**: Use `describe` blocks to group related tests

```typescript
describe('User Authentication', () => {
  describe('Login Process', () => {
    it('should authenticate user with valid credentials', () => {
      // Test implementation
    });
    
    it('should reject user with invalid credentials', () => {
      // Test implementation
    });
  });
});
```

### Test Structure (AAA Pattern)

```typescript
it('should create a new user account', async () => {
  // Arrange
  const userData = {
    email: 'test@example.com',
    password: 'SecurePassword123!',
    name: 'Test User',
  };
  
  // Act
  const response = await AuthSignup(createMockRequest('POST', userData));
  const data = await response.json();
  
  // Assert
  expect(response.status).toBe(201);
  expect(data.user.email).toBe(userData.email);
  expect(data.user.id).toBeDefined();
});
```

### Mock Management

```typescript
// Mock external dependencies
jest.mock('@/lib/prisma', () => ({
  user: {
    create: jest.fn(),
    findUnique: jest.fn(),
  },
}));

// Reset mocks between tests
beforeEach(() => {
  jest.clearAllMocks();
});

// Configure mocks for specific tests
beforeEach(() => {
  const mockPrisma = require('@/lib/prisma');
  mockPrisma.user.findUnique.mockResolvedValue(mockUser);
});
```

### Error Testing

```typescript
it('should handle database connection errors gracefully', async () => {
  // Simulate database error
  mockPrisma.user.findUnique.mockRejectedValue(new Error('Connection failed'));
  
  const request = createMockRequest('GET', undefined, {
    cookies: { token: 'valid-token' },
  });
  
  const response = await FilesGET(request);
  
  expect(response.status).toBe(500);
  expect(await response.json()).toEqual({
    error: 'Internal server error',
  });
});
```

## Best Practices

### 1. Test Independence

- Each test should be independent and not rely on other tests
- Use `beforeEach` and `afterEach` to set up and clean up test state
- Avoid shared mutable state between tests

### 2. Descriptive Test Names

```typescript
// Good
it('should return 404 when file does not exist')

// Bad
it('should handle missing file')
```

### 3. Test Edge Cases

```typescript
describe('File Upload Validation', () => {
  it('should reject files larger than 10MB', () => {
    // Test large file rejection
  });
  
  it('should reject files with invalid extensions', () => {
    // Test extension validation
  });
  
  it('should handle empty file uploads', () => {
    // Test empty file handling
  });
});
```

### 4. Use Test Data Builders

```typescript
// Create reusable test data builders
const createMockUser = (overrides = {}) => ({
  id: 'user-123',
  email: 'test@example.com',
  role: 'USER',
  name: 'Test User',
  isActive: true,
  createdAt: new Date('2024-01-01'),
  ...overrides,
});

const createMockFile = (overrides = {}) => ({
  id: 'file-123',
  filename: 'test.pdf',
  size: 1024000,
  uploadedBy: 'user-123',
  ...overrides,
});
```

### 5. Test Coverage Goals

- **Statements**: 90%+
- **Branches**: 85%+
- **Functions**: 90%+
- **Lines**: 90%+

### 6. Performance Test Guidelines

```typescript
// Set reasonable timeouts
it('should respond within 100ms', async () => {
  const start = Date.now();
  const response = await ApiCall();
  const duration = Date.now() - start;
  
  expect(duration).toBeLessThan(100);
}, 5000); // 5 second timeout

// Test with realistic data volumes
it('should handle 1000 concurrent requests', async () => {
  const requests = Array.from({ length: 1000 }, () => makeRequest());
  const responses = await Promise.all(requests);
  
  expect(responses.every(r => r.status === 200)).toBe(true);
});
```

## Test Data and Fixtures

### Mock Data

Create centralized mock data for consistent testing:

```typescript
// src/test-utils/mocks.ts
export const mockUsers = {
  regular: {
    id: 'user-123',
    email: 'user@example.com',
    role: 'USER',
    // ... other properties
  },
  admin: {
    id: 'admin-123',
    email: 'admin@example.com',
    role: 'ADMIN',
    // ... other properties
  },
};

export const mockFiles = {
  pdf: {
    id: 'file-123',
    filename: 'document.pdf',
    mimeType: 'application/pdf',
    // ... other properties
  },
  image: {
    id: 'file-456',
    filename: 'photo.jpg',
    mimeType: 'image/jpeg',
    // ... other properties
  },
};
```

### Database Seeding for E2E Tests

```typescript
// e2e/fixtures/seed.ts
export async function seedDatabase() {
  // Create test users
  await prisma.user.createMany({
    data: [
      mockUsers.regular,
      mockUsers.admin,
    ],
  });
  
  // Create test files
  await prisma.file.createMany({
    data: [
      mockFiles.pdf,
      mockFiles.image,
    ],
  });
}

export async function cleanDatabase() {
  await prisma.file.deleteMany();
  await prisma.user.deleteMany();
}
```

## Continuous Integration

### GitHub Actions Configuration

```yaml
# .github/workflows/test.yml
name: Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:13
        env:
          POSTGRES_PASSWORD: password
          POSTGRES_DB: secureshare_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm run test:unit
      
      - name: Run integration tests
        run: npm run test:integration
        env:
          DATABASE_URL: postgresql://postgres:password@localhost:5432/secureshare_test
      
      - name: Run E2E tests
        run: npm run test:e2e
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

### NPM Scripts

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:unit": "jest --testPathIgnorePatterns=integration",
    "test:integration": "jest --testPathPattern=integration",
    "test:e2e": "playwright test",
    "test:performance": "jest --testPathPattern=performance",
    "test:security": "jest --testPathPattern=security"
  }
}
```

## Troubleshooting

### Common Issues

1. **Mock Not Working**
   ```typescript
   // Ensure mocks are placed before imports
   jest.mock('@/lib/prisma');
   import { handler } from './api-route';
   ```

2. **Async Test Timeouts**
   ```typescript
   // Increase timeout for slow tests
   it('should handle large upload', async () => {
     // test code
   }, 30000); // 30 second timeout
   ```

3. **Database Connection Issues**
   ```typescript
   // Use test database URL
   beforeAll(async () => {
     process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
   });
   ```

4. **File System Tests**
   ```typescript
   // Use temporary directories
   import { tmpdir } from 'os';
   import { join } from 'path';
   
   const testDir = join(tmpdir(), 'secureshare-test');
   ```

### Debugging Tips

1. **Use `console.log` in tests** for debugging (remove before committing)
2. **Run single test** with `npm test -- --testNamePattern="specific test"`
3. **Use `--verbose` flag** for detailed output
4. **Check mock call history** with `expect(mockFn).toHaveBeenCalledWith(...)`

### Performance Debugging

```typescript
// Monitor memory usage
it('should not leak memory', () => {
  const initialMemory = process.memoryUsage().heapUsed;
  
  // Perform operations
  
  const finalMemory = process.memoryUsage().heapUsed;
  const memoryIncrease = finalMemory - initialMemory;
  
  expect(memoryIncrease).toBeLessThan(1024 * 1024); // Less than 1MB
});
```

## Test Metrics and Reporting

### Coverage Reports

```bash
# Generate coverage report
npm run test:coverage

# View coverage report
open coverage/lcov-report/index.html
```

### Performance Benchmarks

Track performance metrics over time:

```typescript
// Store benchmark results
const benchmarkResults = {
  timestamp: Date.now(),
  testName: 'File Upload Performance',
  metrics: {
    averageResponseTime: 150,
    throughput: 100,
    memoryUsage: 50 * 1024 * 1024,
  },
};
```

---

## Conclusion

This testing framework provides comprehensive coverage for the SecureShare application, ensuring reliability, security, and performance. Regular test maintenance and updates are essential for continued effectiveness.

For questions or contributions to the testing framework, please refer to the project's contribution guidelines.
