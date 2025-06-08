// Database seeding utilities for consistent test data
import type { Page } from '@playwright/test'
import { TestDataFactory } from '../helpers/test-helpers'
import { PrismaClient } from '../../src/generated/prisma';
import * as bcrypt from 'bcryptjs';

export class DatabaseSeeder {
  private page: Page

  constructor(page: Page) {
    this.page = page
  }

  /**
   * Seeds the database with comprehensive test data
   */
  async seedTestData() {
    console.log('Seeding test data...')
    
    try {
      // Create test users first
      await this.createTestUsers()
      
      // Create test files and folders
      await this.createTestFiles()
      
      // Create test contact messages
      await this.createTestMessages()
      
      // Create admin-specific test data
      await this.createAdminTestData()
      
      console.log('Test data seeding completed successfully')
    } catch (error) {
      console.error('Error seeding test data:', error)
      throw error
    }
  }

  /**
   * Creates test users with different roles
   */
  async createTestUsers() {
    const users = [
      // Regular users
      ...TestDataFactory.users.batch(5),
      
      // Admin users
      TestDataFactory.users.admin(),
      
      // Users with files
      TestDataFactory.users.withFiles(3),
      
      // Specific test users for different scenarios
      {
        ...TestDataFactory.users.regular(),
        email: 'testuser@example.com',
        name: 'Test User'
      },
      {
        ...TestDataFactory.users.admin(),
        email: 'admin@example.com',
        name: 'Admin User'
      }
    ]

    for (const user of users) {
      try {
        const response = await this.page.request.post('/api/test/seed/user', {
          data: user,
          headers: {
            'Content-Type': 'application/json'
          }
        })
        
        if (!response.ok()) {
          console.warn(`Failed to create user ${user.email}:`, await response.text())
        }
      } catch (error) {
        console.warn(`Error creating user ${user.email}:`, error)
      }
    }
  }

  /**
   * Creates test files and folders
   */
  async createTestFiles() {
    const files = [
      // Regular text files
      ...TestDataFactory.files.batch(10),
      
      // Different file types
      TestDataFactory.files.image(),
      TestDataFactory.files.large(),
      
      // Specific test files
      {
        name: 'shared-file.txt',
        content: 'This is a shared file for testing',
        mimeType: 'text/plain',
        isShared: true
      },
      {
        name: 'private-file.pdf',
        content: 'Private document content',
        mimeType: 'application/pdf',
        isPrivate: true
      }
    ]

    for (const file of files) {
      try {
        const response = await this.page.request.post('/api/test/seed/file', {
          data: file,
          headers: {
            'Content-Type': 'application/json'
          }
        })
        
        if (!response.ok()) {
          console.warn(`Failed to create file ${file.name}:`, await response.text())
        }
      } catch (error) {
        console.warn(`Error creating file ${file.name}:`, error)
      }
    }

    // Create test folders
    const folders = [
      TestDataFactory.folders.simple(),
      TestDataFactory.folders.withFiles(3),
      TestDataFactory.folders.nested(2)
    ]

    for (const folder of folders) {
      try {
        const response = await this.page.request.post('/api/test/seed/folder', {
          data: folder,
          headers: {
            'Content-Type': 'application/json'
          }
        })
        
        if (!response.ok()) {
          console.warn(`Failed to create folder ${folder.name}:`, await response.text())
        }
      } catch (error) {
        console.warn(`Error creating folder ${folder.name}:`, error)
      }
    }
  }

  /**
   * Creates test contact messages
   */
  async createTestMessages() {
    const messages = [
      // Regular contact messages
      ...TestDataFactory.contactMessages.batch(5),
      
      // Specific test scenarios
      {
        ...TestDataFactory.contactMessages.valid(),
        subject: 'Test Support Request',
        priority: 'high'
      },
      {
        ...TestDataFactory.contactMessages.spam(),
        status: 'flagged'
      }
    ]

    for (const message of messages) {
      try {
        const response = await this.page.request.post('/api/test/seed/message', {
          data: message,
          headers: {
            'Content-Type': 'application/json'
          }
        })
        
        if (!response.ok()) {
          console.warn(`Failed to create message:`, await response.text())
        }
      } catch (error) {
        console.warn(`Error creating message:`, error)
      }
    }
  }

  /**
   * Creates admin-specific test data
   */
  async createAdminTestData() {
    // Create job queue entries
    const jobs = [
      {
        type: 'file-cleanup',
        status: 'completed',
        data: { filesProcessed: 10 }
      },
      {
        type: 'backup',
        status: 'pending',
        data: { backupType: 'full' }
      },
      {
        type: 'analytics',
        status: 'failed',
        data: { error: 'Connection timeout' }
      },
      {
        type: 'maintenance',
        status: 'processing',
        data: { progress: 0.5 }
      }
    ]

    for (const job of jobs) {
      try {
        const response = await this.page.request.post('/api/test/seed/job', {
          data: job,
          headers: {
            'Content-Type': 'application/json'
          }
        })
        
        if (!response.ok()) {
          console.warn(`Failed to create job ${job.type}:`, await response.text())
        }
      } catch (error) {
        console.warn(`Error creating job ${job.type}:`, error)
      }
    }

    // Create system metrics history
    const metricsHistory = [
      {
        timestamp: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        ...TestDataFactory.adminData.systemMetrics()
      },
      {
        timestamp: new Date(Date.now() - 43200000).toISOString(), // 12 hours ago
        ...TestDataFactory.adminData.systemMetrics()
      },
      {
        timestamp: new Date().toISOString(), // now
        ...TestDataFactory.adminData.systemMetrics()
      }
    ]

    for (const metrics of metricsHistory) {
      try {
        const response = await this.page.request.post('/api/test/seed/metrics', {
          data: metrics,
          headers: {
            'Content-Type': 'application/json'
          }
        })
        
        if (!response.ok()) {
          console.warn(`Failed to create metrics:`, await response.text())
        }
      } catch (error) {
        console.warn(`Error creating metrics:`, error)
      }
    }
  }

  /**
   * Clears all test data from the database
   */
  async clearTestData() {
    console.log('Clearing test data...')
    
    try {
      const response = await this.page.request.post('/api/test/seed/clear', {
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok()) {
        console.log('Test data cleared successfully')
      } else {
        console.warn('Failed to clear test data:', await response.text())
      }
    } catch (error) {
      console.error('Error clearing test data:', error)
      throw error
    }
  }

  /**
   * Seeds minimal data for quick tests
   */
  async seedMinimalData() {
    console.log('Seeding minimal test data...')
    
    try {
      // Create one admin and one regular user
      const users = [
        {
          email: 'admin@example.com',
          password: 'AdminPassword123!',
          name: 'Admin User',
          role: 'admin'
        },
        {
          email: 'user@example.com',
          password: 'UserPassword123!',
          name: 'Regular User',
          role: 'user'
        }
      ]

      for (const user of users) {
        await this.page.request.post('/api/test/seed/user', {
          data: user,
          headers: {
            'Content-Type': 'application/json'
          }
        })
      }

      // Create a few test files
      const files = TestDataFactory.files.batch(3)
      for (const file of files) {
        await this.page.request.post('/api/test/seed/file', {
          data: file,
          headers: {
            'Content-Type': 'application/json'
          }
        })
      }

      console.log('Minimal test data seeding completed')
    } catch (error) {
      console.error('Error seeding minimal test data:', error)
      throw error
    }
  }

  /**
   * Seeds data for performance testing
   */
  async seedPerformanceData() {
    console.log('Seeding performance test data...')
    
    try {
      // Create many users
      const users = TestDataFactory.users.batch(100)
      const userBatches = this.chunkArray(users, 10)
      
      for (const batch of userBatches) {
        await Promise.all(
          batch.map(user => 
            this.page.request.post('/api/test/seed/user', {
              data: user,
              headers: { 'Content-Type': 'application/json' }
            })
          )
        )
      }

      // Create many files
      const files = TestDataFactory.files.batch(1000)
      const fileBatches = this.chunkArray(files, 20)
      
      for (const batch of fileBatches) {
        await Promise.all(
          batch.map(file => 
            this.page.request.post('/api/test/seed/file', {
              data: file,
              headers: { 'Content-Type': 'application/json' }
            })
          )
        )
      }

      console.log('Performance test data seeding completed')
    } catch (error) {
      console.error('Error seeding performance test data:', error)
      throw error
    }
  }

  /**
   * Utility function to chunk arrays for batch processing
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = []
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize))
    }
    return chunks
  }

  /**
   * Waits for database operations to complete
   */
  async waitForSeeding(timeout: number = 30000) {
    const startTime = Date.now()
    
    while (Date.now() - startTime < timeout) {
      try {
        const response = await this.page.request.get('/api/test/seed/status')
        const status = await response.json()
        
        if (status.ready) {
          return true
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000))
      } catch (error) {
        // Continue waiting
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }
    
    throw new Error('Timeout waiting for database seeding to complete')
  }
}

// Database connection for direct seeding
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'file:./test-data/test.db'
    }
  }
});

// Test user credentials
export const testCredentials = {
  regularUser: { email: 'test@example.com', password: 'password123' },
  adminUser: { email: 'admin@example.com', password: 'admin123' },
  inactiveUser: { email: 'inactive@example.com', password: 'inactive123' }
};

/**
 * Direct database seeding for E2E tests
 */
export class DirectDatabaseSeeder {
  /**
   * Clear all test data from the database
   */
  async clearTestData() {
    try {
      await prisma.sharedLink.deleteMany();
      await prisma.file.deleteMany();
      await prisma.folder.deleteMany();
      await prisma.session.deleteMany();
      await prisma.rateLimitEntry.deleteMany();
      await prisma.user.deleteMany();
      console.log('✅ Test data cleared');
    } catch (error) {
      console.warn('⚠️  Could not clear test data:', error instanceof Error ? error.message : error);
    }
  }

  /**
   * Seed essential test users
   */
  async seedTestUsers() {
    const users = [
      {
        id: 'test-user-1',
        email: testCredentials.regularUser.email,
        name: 'Test User',
        passwordHash: await bcrypt.hash(testCredentials.regularUser.password, 10),
        isActive: true,
        emailVerified: true
      },
      {
        id: 'admin-user-1',
        email: testCredentials.adminUser.email,
        name: 'Admin User',
        passwordHash: await bcrypt.hash(testCredentials.adminUser.password, 10),
        isActive: true,
        emailVerified: true
      },
      {
        id: 'inactive-user-1',
        email: testCredentials.inactiveUser.email,
        name: 'Inactive User',
        passwordHash: await bcrypt.hash(testCredentials.inactiveUser.password, 10),
        isActive: false,
        emailVerified: false
      }
    ];

    for (const user of users) {
      await prisma.user.upsert({
        where: { email: user.email },
        update: user,
        create: user
      });
    }
    console.log('✅ Test users seeded');
  }

  /**
   * Seed test files and folders
   */
  async seedTestFiles() {
    // Create test folder
    const folder = await prisma.folder.upsert({
      where: { id: 'test-folder-1' },
      update: {},
      create: {
        id: 'test-folder-1',
        name: 'Test Folder',
        description: 'Folder for testing',
        userId: 'test-user-1'
      }
    });

    // Create test files
    const testFiles = [
      {
        id: 'test-file-1',
        fileName: 'test-document.txt',
        content: 'This is a test document for E2E testing.',
        userId: 'test-user-1',
        folderId: folder.id
      },
      {
        id: 'test-file-2',
        fileName: 'admin-file.pdf',
        content: 'This is an admin test file.',
        userId: 'admin-user-1',
        folderId: null
      }
    ];

    for (const [index, testFile] of testFiles.entries()) {
      const encrypted = Buffer.from(testFile.content).toString('base64');
      
      await prisma.file.upsert({
        where: { id: testFile.id },
        update: {},
        create: {
          id: testFile.id,
          fileName: testFile.fileName,
          fileSize: testFile.content.length,
          encryptedContent: encrypted,
          salt: `test-salt-${index + 1}`,
          iv: `test-iv-${(index + 1).toString().padStart(16, '0')}`,
          key: `test-key-${index + 1}`,
          isPasswordProtected: false,
          userId: testFile.userId,
          folderId: testFile.folderId
        }
      });
    }

    // Create shared link
    await prisma.sharedLink.upsert({
      where: { fileId: 'test-file-1' },
      update: {},
      create: {
        id: 'test-shared-link-1',
        fileId: 'test-file-1',
        userId: 'test-user-1',
        isActive: true,
        views: 0,
        downloads: 0
      }
    });

    console.log('✅ Test files seeded');
  }

  /**
   * Seed all test data
   */
  async seedAll() {
    await this.clearTestData();
    await this.seedTestUsers();
    await this.seedTestFiles();
    console.log('🎉 All test data seeded successfully');
  }

  /**
   * Cleanup database connection
   */
  async cleanup() {
    await prisma.$disconnect();
  }
}

// Export singleton instance
export const directSeeder = new DirectDatabaseSeeder();

// Utility functions for test setup
export async function setupTestEnvironment(page: Page, options: {
  seedData?: boolean
  clearFirst?: boolean
  minimal?: boolean
  performance?: boolean
} = {}) {
  const seeder = new DatabaseSeeder(page)
  
  if (options.clearFirst) {
    await seeder.clearTestData()
  }
  
  if (options.seedData) {
    if (options.performance) {
      await seeder.seedPerformanceData()
    } else if (options.minimal) {
      await seeder.seedMinimalData()
    } else {
      await seeder.seedTestData()
    }
    
    await seeder.waitForSeeding()
  }
}

export async function teardownTestEnvironment(page: Page) {
  const seeder = new DatabaseSeeder(page)
  await seeder.clearTestData()
}
