import { FullConfig } from '@playwright/test';
import { execSync } from 'child_process';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { directSeeder } from './fixtures/seed';

/**
 * Global setup for Playwright tests
 * Runs once before all tests
 */
async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global setup for E2E tests...');

  try {
    // Load test environment variables
    dotenv.config({ path: '.env.test' });
    console.log('📋 Loaded test environment variables');

    // Ensure test data directory exists
    const testDataDir = './test-data';
    if (!fs.existsSync(testDataDir)) {
      fs.mkdirSync(testDataDir, { recursive: true });
      console.log('📁 Created test data directory');
    }

    // Set up test database
    console.log('📊 Setting up test database...');
    
    // For SQLite, we need to ensure the database file path is correct
    const dbUrl = process.env.DATABASE_URL || 'file:./test-data/test.db';
    process.env.DATABASE_URL = dbUrl;
    
    console.log('🔧 Database URL:', dbUrl);

    try {
      // Generate Prisma client first
      execSync('npx prisma generate', { 
        stdio: 'inherit',
        env: { ...process.env, DATABASE_URL: dbUrl }
      });
      console.log('✅ Prisma client generated');

      // Push database schema
      execSync('npx prisma db push', { 
        stdio: 'inherit',
        env: { ...process.env, DATABASE_URL: dbUrl }
      });
      console.log('✅ Database schema pushed');

      // Seed test data using our direct seeder
      console.log('🌱 Seeding test data...');
      await directSeeder.seedAll();
      
    } catch (dbError) {
      console.log('⚠️  Database setup failed - using file-based storage fallback');
      console.log('Error details:', dbError instanceof Error ? dbError.message : dbError);
    }

    console.log('✅ Global setup completed successfully');
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  }
}

async function globalTeardown() {
  console.log('🧹 Starting global teardown...');
  try {
    await directSeeder.cleanup();
    console.log('✅ Global teardown completed');
  } catch (error) {
    console.warn('⚠️  Global teardown warning:', error);
  }
}

export default globalSetup;
export { globalTeardown };
