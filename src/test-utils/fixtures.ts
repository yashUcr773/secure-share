/**
 * Test Data Fixtures and Builders
 * Centralized test data management for consistent testing across all test suites
 */

import { faker } from '@faker-js/faker';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export interface TestUser {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: 'USER' | 'ADMIN';
  isActive: boolean;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  failedLoginAttempts: number;
  lockedUntil?: Date;
}

export interface TestFile {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  uploadedBy: string;
  isPublic: boolean;
  downloadCount: number;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
  passwordProtected: boolean;
  encryptionKey?: string;
  salt?: string;
  iv?: string;
}

export interface TestFolder {
  id: string;
  name: string;
  path: string;
  parentId?: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TestContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  createdAt: Date;
  responded: boolean;
  respondedAt?: Date;
}

export interface TestSession {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
  ipAddress: string;
  userAgent: string;
  lastAccessedAt: Date;
}

// =============================================================================
// TEST DATA BUILDERS
// =============================================================================

export class TestUserBuilder {
  private user: Partial<TestUser> = {};

  constructor() {
    this.user = {
      id: faker.string.uuid(),
      email: faker.internet.email(),
      name: faker.person.fullName(),
      passwordHash: '$2b$10$' + faker.string.alphanumeric(53),
      role: 'USER',
      isActive: true,
      emailVerified: true,
      createdAt: faker.date.past(),
      updatedAt: faker.date.recent(),
      failedLoginAttempts: 0,
    };
  }

  withId(id: string): TestUserBuilder {
    this.user.id = id;
    return this;
  }

  withEmail(email: string): TestUserBuilder {
    this.user.email = email;
    return this;
  }

  withName(name: string): TestUserBuilder {
    this.user.name = name;
    return this;
  }

  withRole(role: 'USER' | 'ADMIN'): TestUserBuilder {
    this.user.role = role;
    return this;
  }

  withInactiveStatus(): TestUserBuilder {
    this.user.isActive = false;
    return this;
  }

  withUnverifiedEmail(): TestUserBuilder {
    this.user.emailVerified = false;
    return this;
  }

  withFailedLoginAttempts(attempts: number): TestUserBuilder {
    this.user.failedLoginAttempts = attempts;
    return this;
  }

  withLockedAccount(until?: Date): TestUserBuilder {
    this.user.lockedUntil = until || faker.date.future();
    this.user.failedLoginAttempts = 5;
    return this;
  }

  withLastLogin(date: Date): TestUserBuilder {
    this.user.lastLoginAt = date;
    return this;
  }

  build(): TestUser {
    return this.user as TestUser;
  }
}

export class TestFileBuilder {
  private file: Partial<TestFile> = {};

  constructor() {
    this.file = {
      id: faker.string.uuid(),
      filename: faker.system.fileName(),
      originalName: faker.system.fileName(),
      mimeType: faker.helpers.arrayElement([
        'application/pdf',
        'image/jpeg',
        'image/png',
        'text/plain',
        'application/json',
      ]),
      size: faker.number.int({ min: 1024, max: 10485760 }), // 1KB to 10MB
      path: `/uploads/${faker.string.uuid()}`,
      uploadedBy: faker.string.uuid(),
      isPublic: false,
      downloadCount: 0,
      createdAt: faker.date.past(),
      updatedAt: faker.date.recent(),
      passwordProtected: false,
    };
  }

  withId(id: string): TestFileBuilder {
    this.file.id = id;
    return this;
  }

  withFilename(filename: string): TestFileBuilder {
    this.file.filename = filename;
    this.file.originalName = filename;
    return this;
  }

  withMimeType(mimeType: string): TestFileBuilder {
    this.file.mimeType = mimeType;
    return this;
  }

  withSize(size: number): TestFileBuilder {
    this.file.size = size;
    return this;
  }

  withUploadedBy(userId: string): TestFileBuilder {
    this.file.uploadedBy = userId;
    return this;
  }

  withPublicAccess(): TestFileBuilder {
    this.file.isPublic = true;
    return this;
  }

  withDownloadCount(count: number): TestFileBuilder {
    this.file.downloadCount = count;
    return this;
  }

  withExpiration(date: Date): TestFileBuilder {
    this.file.expiresAt = date;
    return this;
  }

  withPasswordProtection(): TestFileBuilder {
    this.file.passwordProtected = true;
    this.file.encryptionKey = faker.string.alphanumeric(64);
    this.file.salt = faker.string.alphanumeric(32);
    this.file.iv = faker.string.alphanumeric(24);
    return this;
  }

  build(): TestFile {
    return this.file as TestFile;
  }
}

export class TestFolderBuilder {
  private folder: Partial<TestFolder> = {};

  constructor() {
    this.folder = {
      id: faker.string.uuid(),
      name: faker.system.directoryPath().split('/').pop() || 'folder',
      path: `/${faker.string.uuid()}`,
      userId: faker.string.uuid(),
      createdAt: faker.date.past(),
      updatedAt: faker.date.recent(),
    };
  }

  withId(id: string): TestFolderBuilder {
    this.folder.id = id;
    return this;
  }

  withName(name: string): TestFolderBuilder {
    this.folder.name = name;
    return this;
  }

  withPath(path: string): TestFolderBuilder {
    this.folder.path = path;
    return this;
  }

  withParent(parentId: string): TestFolderBuilder {
    this.folder.parentId = parentId;
    return this;
  }

  withUserId(userId: string): TestFolderBuilder {
    this.folder.userId = userId;
    return this;
  }

  build(): TestFolder {
    return this.folder as TestFolder;
  }
}

export class TestContactMessageBuilder {
  private message: Partial<TestContactMessage> = {};

  constructor() {
    this.message = {
      id: faker.string.uuid(),
      name: faker.person.fullName(),
      email: faker.internet.email(),
      subject: faker.lorem.sentence(),
      message: faker.lorem.paragraphs(2),
      createdAt: faker.date.past(),
      responded: false,
    };
  }

  withId(id: string): TestContactMessageBuilder {
    this.message.id = id;
    return this;
  }

  withName(name: string): TestContactMessageBuilder {
    this.message.name = name;
    return this;
  }

  withEmail(email: string): TestContactMessageBuilder {
    this.message.email = email;
    return this;
  }

  withSubject(subject: string): TestContactMessageBuilder {
    this.message.subject = subject;
    return this;
  }

  withMessage(message: string): TestContactMessageBuilder {
    this.message.message = message;
    return this;
  }

  withResponse(respondedAt?: Date): TestContactMessageBuilder {
    this.message.responded = true;
    this.message.respondedAt = respondedAt || faker.date.recent();
    return this;
  }

  build(): TestContactMessage {
    return this.message as TestContactMessage;
  }
}

export class TestSessionBuilder {
  private session: Partial<TestSession> = {};

  constructor() {
    this.session = {
      id: faker.string.uuid(),
      userId: faker.string.uuid(),
      token: faker.string.alphanumeric(128),
      expiresAt: faker.date.future(),
      createdAt: faker.date.past(),
      ipAddress: faker.internet.ip(),
      userAgent: faker.internet.userAgent(),
      lastAccessedAt: faker.date.recent(),
    };
  }

  withId(id: string): TestSessionBuilder {
    this.session.id = id;
    return this;
  }

  withUserId(userId: string): TestSessionBuilder {
    this.session.userId = userId;
    return this;
  }

  withToken(token: string): TestSessionBuilder {
    this.session.token = token;
    return this;
  }

  withExpiration(date: Date): TestSessionBuilder {
    this.session.expiresAt = date;
    return this;
  }

  withExpiredSession(): TestSessionBuilder {
    this.session.expiresAt = faker.date.past();
    return this;
  }

  withIpAddress(ip: string): TestSessionBuilder {
    this.session.ipAddress = ip;
    return this;
  }

  withUserAgent(userAgent: string): TestSessionBuilder {
    this.session.userAgent = userAgent;
    return this;
  }

  build(): TestSession {
    return this.session as TestSession;
  }
}

// =============================================================================
// PREDEFINED TEST DATA SETS
// =============================================================================

export const TestDataSets = {
  // Standard test users
  users: {
    regular: new TestUserBuilder()
      .withId('user-regular-123')
      .withEmail('user@example.com')
      .withName('Regular User')
      .withRole('USER')
      .build(),

    admin: new TestUserBuilder()
      .withId('user-admin-123')
      .withEmail('admin@example.com')
      .withName('Admin User')
      .withRole('ADMIN')
      .build(),

    inactive: new TestUserBuilder()
      .withId('user-inactive-123')
      .withEmail('inactive@example.com')
      .withName('Inactive User')
      .withInactiveStatus()
      .build(),

    unverified: new TestUserBuilder()
      .withId('user-unverified-123')
      .withEmail('unverified@example.com')
      .withName('Unverified User')
      .withUnverifiedEmail()
      .build(),

    locked: new TestUserBuilder()
      .withId('user-locked-123')
      .withEmail('locked@example.com')
      .withName('Locked User')
      .withLockedAccount()
      .build(),
  },

  // Standard test files
  files: {
    pdf: new TestFileBuilder()
      .withId('file-pdf-123')
      .withFilename('document.pdf')
      .withMimeType('application/pdf')
      .withSize(1024000)
      .withUploadedBy('user-regular-123')
      .build(),

    image: new TestFileBuilder()
      .withId('file-image-123')
      .withFilename('photo.jpg')
      .withMimeType('image/jpeg')
      .withSize(2048000)
      .withUploadedBy('user-regular-123')
      .build(),

    public: new TestFileBuilder()
      .withId('file-public-123')
      .withFilename('public-doc.pdf')
      .withMimeType('application/pdf')
      .withSize(512000)
      .withUploadedBy('user-regular-123')
      .withPublicAccess()
      .build(),

    protected: new TestFileBuilder()
      .withId('file-protected-123')
      .withFilename('secret.pdf')
      .withMimeType('application/pdf')
      .withSize(1536000)
      .withUploadedBy('user-regular-123')
      .withPasswordProtection()
      .build(),

    expired: new TestFileBuilder()
      .withId('file-expired-123')
      .withFilename('expired.pdf')
      .withMimeType('application/pdf')
      .withSize(1024000)
      .withUploadedBy('user-regular-123')
      .withExpiration(new Date(Date.now() - 86400000)) // Expired yesterday
      .build(),
  },

  // Standard test folders
  folders: {
    root: new TestFolderBuilder()
      .withId('folder-root-123')
      .withName('Documents')
      .withPath('/documents')
      .withUserId('user-regular-123')
      .build(),

    subfolder: new TestFolderBuilder()
      .withId('folder-sub-123')
      .withName('Projects')
      .withPath('/documents/projects')
      .withParent('folder-root-123')
      .withUserId('user-regular-123')
      .build(),
  },

  // Standard test contact messages
  contactMessages: {
    recent: new TestContactMessageBuilder()
      .withId('contact-recent-123')
      .withName('John Doe')
      .withEmail('john@example.com')
      .withSubject('Question about SecureShare')
      .withMessage('I have a question about how to use SecureShare effectively.')
      .build(),

    responded: new TestContactMessageBuilder()
      .withId('contact-responded-123')
      .withName('Jane Smith')
      .withEmail('jane@example.com')
      .withSubject('Feature Request')
      .withMessage('Could you add bulk upload functionality?')
      .withResponse()
      .build(),
  },

  // Standard test sessions
  sessions: {
    active: new TestSessionBuilder()
      .withId('session-active-123')
      .withUserId('user-regular-123')
      .withToken('active-session-token-123')
      .withExpiration(new Date(Date.now() + 3600000)) // Expires in 1 hour
      .build(),

    expired: new TestSessionBuilder()
      .withId('session-expired-123')
      .withUserId('user-regular-123')
      .withToken('expired-session-token-123')
      .withExpiredSession()
      .build(),
  },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Create multiple test users with different characteristics
 */
export function createTestUsers(count: number): TestUser[] {
  return Array.from({ length: count }, (_, index) => 
    new TestUserBuilder()
      .withId(`user-${index + 1}`)
      .withEmail(`user${index + 1}@example.com`)
      .withName(`Test User ${index + 1}`)
      .build()
  );
}

/**
 * Create multiple test files for a specific user
 */
export function createTestFiles(userId: string, count: number): TestFile[] {
  const mimeTypes = ['application/pdf', 'image/jpeg', 'image/png', 'text/plain'];
  
  return Array.from({ length: count }, (_, index) => 
    new TestFileBuilder()
      .withId(`file-${userId}-${index + 1}`)
      .withFilename(`file${index + 1}.${mimeTypes[index % mimeTypes.length].split('/')[1]}`)
      .withMimeType(mimeTypes[index % mimeTypes.length])
      .withUploadedBy(userId)
      .build()
  );
}

/**
 * Create a hierarchical folder structure
 */
export function createFolderHierarchy(userId: string, depth: number = 3): TestFolder[] {
  const folders: TestFolder[] = [];
  
  // Create root folder
  const root = new TestFolderBuilder()
    .withId(`folder-root-${userId}`)
    .withName('Root Folder')
    .withPath('/root')
    .withUserId(userId)
    .build();
  folders.push(root);
  
  // Create nested folders
  let currentParent = root;
  for (let i = 1; i < depth; i++) {
    const folder = new TestFolderBuilder()
      .withId(`folder-level${i}-${userId}`)
      .withName(`Level ${i} Folder`)
      .withPath(`${currentParent.path}/level${i}`)
      .withParent(currentParent.id)
      .withUserId(userId)
      .build();
    folders.push(folder);
    currentParent = folder;
  }
  
  return folders;
}

/**
 * Create performance test data with large datasets
 */
export function createPerformanceTestData() {
  return {
    users: createTestUsers(1000),
    files: createTestFiles('user-performance-test', 10000),
    contactMessages: Array.from({ length: 500 }, () => 
      new TestContactMessageBuilder().build()
    ),
  };
}

/**
 * Create security test data with edge cases
 */
export function createSecurityTestData() {
  return {
    maliciousUser: new TestUserBuilder()
      .withEmail('<script>alert("xss")</script>@evil.com')
      .withName('"><script>alert("xss")</script>')
      .build(),
      
    sqlInjectionUser: new TestUserBuilder()
      .withEmail("'; DROP TABLE users; --@evil.com")
      .withName("Robert'); DROP TABLE students;--")
      .build(),
      
    oversizedFile: new TestFileBuilder()
      .withFilename('huge-file.pdf')
      .withSize(100 * 1024 * 1024) // 100MB
      .build(),
      
    maliciousFilename: new TestFileBuilder()
      .withFilename('../../../etc/passwd')
      .build(),
  };
}

/**
 * Reset test data between tests
 */
export function resetTestData(): void {
  // Reset faker seed for consistent testing
  faker.seed(12345);
}

/**
 * Validate test data integrity
 */
export function validateTestData(data: any): boolean {
  // Add validation logic here
  return true;
}

export default TestDataSets;
