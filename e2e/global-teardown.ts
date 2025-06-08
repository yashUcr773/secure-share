import { FullConfig } from '@playwright/test';
import { directSeeder } from './fixtures/seed';

/**
 * Global teardown for Playwright tests
 * Runs once after all tests
 */
async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting global teardown for E2E tests...');

  try {
    // Clean up database connections
    await directSeeder.cleanup();
    console.log('✅ Database connections closed');

    // Additional cleanup for test environment
    // - Clear any remaining test data
    // - Reset file storage
    // - Clean temporary files
      console.log('✅ Global teardown completed successfully');
  } catch (error) {
    console.error('❌ Global teardown failed:', error);
    // Don't throw error in teardown to avoid masking test failures
  }
}

export default globalTeardown;
