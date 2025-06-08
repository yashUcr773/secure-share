import { defineConfig, devices } from '@playwright/test';

/**
 * Simplified Playwright Configuration for Testing Infrastructure
 * This config is used to test the E2E infrastructure without a web server
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [['list']],
  
  use: {
    baseURL: 'about:blank',
    trace: 'off',
    screenshot: 'off',
    video: 'off',
    actionTimeout: 10000,
    navigationTimeout: 10000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // No web server for testing infrastructure
  // webServer: undefined,

  timeout: 30 * 1000,
  expect: {
    timeout: 5 * 1000,
  },

  // Skip global setup for now
  // globalSetup: undefined,
  // globalTeardown: undefined,

  outputDir: './e2e/test-results',
  preserveOutput: 'failures-only',
});
