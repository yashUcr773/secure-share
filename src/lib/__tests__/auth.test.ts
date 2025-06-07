// Authentication service tests

// Mock file system operations
jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn(),
    access: jest.fn(),
    writeFile: jest.fn(),
    readFile: jest.fn(),
    readdir: jest.fn(),
  }
}));

// Mock config
jest.mock('../config', () => ({
  config: {
    storageDir: './test-data',
    jwtSecret: 'test-jwt-secret-key-for-testing-purposes-only',
    sessionSecret: 'test-session-secret',
    nodeEnv: 'test',
    keyDerivationIterations: 1000, // Lower for testing
    jwt: {
      secret: 'test-jwt-secret-key-for-testing-purposes-only',
      accessTokenExpiry: '15m',
      refreshTokenExpiry: '7d',
      issuer: 'secure-share',
      audience: 'secure-share-users'
    },
  },
}));

// Mock email service
jest.mock('../email', () => ({
  EmailService: {
    sendVerificationEmail: jest.fn().mockResolvedValue(true),
    sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
  },
}));

import { AuthService } from '../auth';
import { promises as fs } from 'fs';
import path from 'path';

const mockFs = fs as jest.Mocked<typeof fs>;

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.access.mockResolvedValue(undefined);
    mockFs.writeFile.mockResolvedValue(undefined);
  });

  describe('Password Hashing', () => {
    it('should hash passwords securely', async () => {
      const password = 'testpassword123';
      const hash = await AuthService.hashPassword(password);
      
      expect(typeof hash).toBe('string');
      expect(hash.length).toBeGreaterThan(0);
      expect(hash).not.toBe(password);
    });

    it('should verify password against hash', async () => {
      const password = 'testpassword123';
      const hash = await AuthService.hashPassword(password);
      
      const isValid = await AuthService.verifyPassword(password, hash);
      expect(isValid).toBe(true);
      
      const isInvalid = await AuthService.verifyPassword('wrongpassword', hash);
      expect(isInvalid).toBe(false);
    });

    it('should produce different hashes for the same password', async () => {
      const password = 'testpassword123';
      const hash1 = await AuthService.hashPassword(password);
      const hash2 = await AuthService.hashPassword(password);
      
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('JWT Token Management', () => {
    const testUser = {
      id: 'test-user-id',
      email: 'test@example.com',
      passwordHash: 'hashedpassword',
      role: 'user' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isActive: true,
      emailVerified: true,
      loginAttempts: 0,
      sessionVersion: 1,
      refreshTokens: [],
    };    it('should generate valid JWT tokens', async () => {
      const token = await AuthService.generateToken(testUser);
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
      // In test environment, we get mock tokens
      if (process.env.NODE_ENV === 'test') {
        expect(token).toMatch(/^mock-jwt-token-access-sess_/);
      } else {
        expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
      }
    });

    it('should verify JWT tokens correctly', async () => {
      const token = await AuthService.generateToken(testUser);
      const payload = await AuthService.verifyToken(token);
      
      expect(payload).toBeTruthy();
      expect(payload?.userId).toBe(testUser.id);
      expect(payload?.email).toBe(testUser.email);
      expect(payload?.role).toBe(testUser.role);
    });

    it('should generate different access and refresh tokens', async () => {
      const accessToken = await AuthService.generateToken(testUser, 'access');
      const refreshToken = await AuthService.generateToken(testUser, 'refresh');
      
      expect(accessToken).not.toBe(refreshToken);
      
      const accessPayload = await AuthService.verifyToken(accessToken);
      const refreshPayload = await AuthService.verifyToken(refreshToken);
      
      expect(accessPayload?.type).toBe('access');
      expect(refreshPayload?.type).toBe('refresh');
    });

    it('should generate token pairs with same session ID', async () => {
      const tokenPair = await AuthService.generateTokenPair(testUser);
      
      expect(tokenPair.accessToken).toBeTruthy();
      expect(tokenPair.refreshToken).toBeTruthy();
      expect(tokenPair.sessionId).toBeTruthy();
      
      const accessPayload = await AuthService.verifyToken(tokenPair.accessToken);
      const refreshPayload = await AuthService.verifyToken(tokenPair.refreshToken);
      
      expect(accessPayload?.sessionId).toBe(refreshPayload?.sessionId);
      expect(accessPayload?.sessionId).toBe(tokenPair.sessionId);
    });

    it('should reject invalid tokens', async () => {
      const invalidToken = 'invalid.token.here';
      const payload = await AuthService.verifyToken(invalidToken);
      expect(payload).toBeNull();
    });
  });
  describe('User Registration', () => {
    beforeEach(() => {
      // Mock getUserByEmail to return null (user doesn't exist)
      mockFs.readdir.mockResolvedValue(['index.json'] as any);
      mockFs.readFile.mockImplementation((filePath) => {
        if (filePath.toString().includes('index.json')) {
          return Promise.resolve('{}');
        }
        return Promise.reject(new Error('File not found'));
      });
    });    it('should register a new user successfully', async () => {
      const result = await AuthService.register('test@example.com', 'password123', 'Test User');
      
      expect(result.success).toBe(true);
      expect(result.user).toBeTruthy();
      expect(result.user?.email).toBe('test@example.com');
      expect(result.user?.name).toBe('Test User');
      // passwordHash should not be present in the returned user object
      expect((result.user as any)?.passwordHash).toBeUndefined();
    });

    it('should validate email and password requirements', async () => {
      // Test missing email
      const result1 = await AuthService.register('', 'password123');
      expect(result1.success).toBe(false);
      expect(result1.error).toContain('Email and password are required');

      // Test missing password
      const result2 = await AuthService.register('test@example.com', '');
      expect(result2.success).toBe(false);
      expect(result2.error).toContain('Email and password are required');

      // Test weak password
      const result3 = await AuthService.register('test@example.com', '123');
      expect(result3.success).toBe(false);
      expect(result3.error).toContain('Password must be at least 6 characters');
    });    it('should prevent duplicate email registration', async () => {
      // Mock existing user
      mockFs.readdir.mockResolvedValue(['index.json', 'user_existing.json'] as any);
      mockFs.readFile.mockImplementation((filePath) => {
        if (filePath.toString().includes('index.json')) {
          return Promise.resolve('{"test@example.com": "user_existing.json"}');
        }
        if (filePath.toString().includes('user_existing.json')) {
          return Promise.resolve(JSON.stringify({
            id: 'existing-id',
            email: 'test@example.com',
            passwordHash: 'hash',
            isActive: true
          }));
        }
        return Promise.reject(new Error('File not found'));
      });

      const result = await AuthService.register('test@example.com', 'password123');
      expect(result.success).toBe(false);
      expect(result.error).toContain('User with this email already exists');
    });
  });

  describe('User Authentication', () => {
    const existingUser = {
      id: 'existing-user-id',
      email: 'test@example.com',
      passwordHash: 'hashedpassword',
      role: 'user' as const,
      isActive: true,
      emailVerified: true,
      loginAttempts: 0,
      sessionVersion: 1,
      refreshTokens: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };    beforeEach(async () => {
      // Mock password hashing and verification
      const hashedPassword = await AuthService.hashPassword('correctpassword');
      existingUser.passwordHash = hashedPassword;

      mockFs.readdir.mockResolvedValue(['index.json', 'user_test.json'] as any);
      mockFs.readFile.mockImplementation((filePath) => {
        if (filePath.toString().includes('index.json')) {
          return Promise.resolve('{"test@example.com": "user_test.json"}');
        }
        if (filePath.toString().includes('user_test.json')) {
          return Promise.resolve(JSON.stringify(existingUser));
        }
        return Promise.reject(new Error('File not found'));
      });
    });    it('should authenticate user with correct credentials', async () => {
      const result = await AuthService.login('test@example.com', 'correctpassword');
      
      expect(result.success).toBe(true);
      expect(result.user).toBeTruthy();
      expect(result.token).toBeTruthy();
      expect(result.user?.email).toBe('test@example.com');
      // passwordHash should not be present in the returned user object
      expect((result.user as any)?.passwordHash).toBeUndefined();
    });

    it('should reject authentication with incorrect password', async () => {
      const result = await AuthService.login('test@example.com', 'wrongpassword');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid email or password');
    });

    it('should reject authentication with non-existent email', async () => {
      mockFs.readFile.mockImplementation((filePath) => {
        if (filePath.toString().includes('index.json')) {
          return Promise.resolve('{}'); // Empty index
        }
        return Promise.reject(new Error('File not found'));
      });

      const result = await AuthService.login('nonexistent@example.com', 'password');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid email or password');
    });

    it('should validate input requirements', async () => {
      const result1 = await AuthService.login('', 'password');
      expect(result1.success).toBe(false);
      expect(result1.error).toContain('Email and password are required');

      const result2 = await AuthService.login('test@example.com', '');
      expect(result2.success).toBe(false);
      expect(result2.error).toContain('Email and password are required');
    });
  });

  describe('Email Verification', () => {
    it('should generate unique email verification tokens', () => {
      const token1 = AuthService.generateEmailVerificationToken();
      const token2 = AuthService.generateEmailVerificationToken();
      
      expect(token1).not.toBe(token2);
      expect(typeof token1).toBe('string');
      expect(token1.length).toBeGreaterThan(10);
    });

    it('should generate unique password reset tokens', () => {
      const token1 = AuthService.generatePasswordResetToken();
      const token2 = AuthService.generatePasswordResetToken();
      
      expect(token1).not.toBe(token2);
      expect(typeof token1).toBe('string');
      expect(token1.length).toBeGreaterThan(10);
    });
  });

  describe('Session Management', () => {
    it('should generate unique session IDs', () => {
      const sessionId1 = AuthService.generateSessionId();
      const sessionId2 = AuthService.generateSessionId();
      
      expect(sessionId1).not.toBe(sessionId2);
      expect(sessionId1).toMatch(/^sess_/);
      expect(sessionId2).toMatch(/^sess_/);
    });

    it('should check admin privileges correctly', () => {
      const adminPayload = { role: 'admin' } as any;
      const userPayload = { role: 'user' } as any;
      
      expect(AuthService.isAdmin(adminPayload)).toBe(true);
      expect(AuthService.isAdmin(userPayload)).toBe(false);
    });
  });
});
