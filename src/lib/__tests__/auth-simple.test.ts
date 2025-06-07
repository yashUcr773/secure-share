// Simple auth test without complex dependencies

// Mock fs first
jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn(),
    access: jest.fn(),
    writeFile: jest.fn(),
    readFile: jest.fn(),
    readdir: jest.fn(),
  }
}));

// Mock jsonwebtoken
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(() => 'mock-token'),
  verify: jest.fn(() => ({ userId: 'test-user' })),
}));

// Mock other dependencies
jest.mock('../config', () => ({
  config: {
    storageDir: './test-data',
    jwt: { secret: 'test-secret', expiresIn: '1h' },
  }
}));

jest.mock('../email', () => ({
  EmailService: {
    sendVerificationEmail: jest.fn(),
    sendPasswordResetEmail: jest.fn(),
  }
}));

import { AuthService } from '../auth';

describe('Auth Module', () => {
  test('should be able to import AuthService', () => {
    expect(AuthService).toBeDefined();
  });

  test('should have expected methods', () => {
    expect(typeof AuthService.hashPassword).toBe('function');
    expect(typeof AuthService.verifyPassword).toBe('function');
    expect(typeof AuthService.generateToken).toBe('function');
  });
});
