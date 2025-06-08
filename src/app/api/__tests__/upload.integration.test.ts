// Integration tests for file upload API
import { NextRequest } from 'next/server';
import { POST as uploadPOST } from '@/app/api/upload/route';

// Mock dependencies
jest.mock('@/lib/auth-enhanced', () => ({
  AuthService: {
    verifyToken: jest.fn(),
  },
}));

jest.mock('@/lib/storage', () => ({
  FileStorage: {
    saveFile: jest.fn(),
    init: jest.fn(),
  },
}));

jest.mock('@/lib/security', () => ({
  validateCSRFToken: jest.fn(() => true),
  validateFileUpload: jest.fn(() => ({ valid: true })),
  logSecurityEvent: jest.fn(),
  getClientIP: jest.fn(() => '127.0.0.1'),
}));

jest.mock('@/lib/rate-limit', () => ({
  rateLimitFileUploads: jest.fn(),
}));

jest.mock('@/lib/crypto', () => ({
  EncryptionService: {
    encryptFile: jest.fn(),
  },
}));

import { AuthService } from '@/lib/auth-enhanced';
import { FileStorage } from '@/lib/storage';
import { validateCSRFToken, validateFileUpload } from '@/lib/security';
import { rateLimitFileUploads } from '@/lib/rate-limit';
import { EncryptionService } from '@/lib/crypto';

const mockAuthService = AuthService as jest.Mocked<typeof AuthService>;
const mockFileStorage = FileStorage as jest.Mocked<typeof FileStorage>;
const mockValidateCSRF = validateCSRFToken as jest.Mock;
const mockValidateFile = validateFileUpload as jest.Mock;
const mockRateLimit = rateLimitFileUploads as jest.Mock;
const mockEncryption = EncryptionService as jest.Mocked<typeof EncryptionService>;

describe('File Upload API Integration Tests', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateCSRF.mockReturnValue(true);
    mockValidateFile.mockReturnValue({ valid: true });
    mockRateLimit.mockResolvedValue({ success: true });
    mockAuthService.verifyToken.mockResolvedValue(mockUser);
    mockFileStorage.init.mockResolvedValue(undefined);
  });

  it('should upload file successfully', async () => {
    const fileContent = 'test file content';
    const fileBuffer = Buffer.from(fileContent);
    
    const mockFile = {
      name: 'test.txt',
      size: fileBuffer.length,
      type: 'text/plain',
      arrayBuffer: () => Promise.resolve(fileBuffer.buffer),
    } as File;

    const formData = new FormData();
    formData.append('file', mockFile);
    formData.append('password', 'testpassword');
    formData.append('expiresIn', '24');

    mockEncryption.encryptFile.mockResolvedValue({
      encryptedContent: 'encrypted-content',
      salt: 'salt',
      iv: 'iv',
    });

    mockFileStorage.saveFile.mockResolvedValue({
      id: 'file-123',
      fileName: 'test.txt',
      fileSize: fileBuffer.length,
      downloadUrl: '/file/file-123',
    });

    const request = new NextRequest('http://localhost:3000/api/upload', {
      method: 'POST',
      headers: {
        'X-CSRF-Token': 'valid-csrf-token',
        Cookie: 'token=valid-jwt-token',
      },
      body: formData,
    });

    const response = await uploadPOST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.file.id).toBe('file-123');
    expect(data.file.downloadUrl).toBe('/file/file-123');
    expect(mockFileStorage.saveFile).toHaveBeenCalled();
  });

  it('should fail without authentication', async () => {
    mockAuthService.verifyToken.mockRejectedValue(new Error('Unauthorized'));

    const formData = new FormData();
    const request = new NextRequest('http://localhost:3000/api/upload', {
      method: 'POST',
      headers: {
        'X-CSRF-Token': 'valid-csrf-token',
      },
      body: formData,
    });

    const response = await uploadPOST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should fail without CSRF token', async () => {
    mockValidateCSRF.mockReturnValue(false);

    const formData = new FormData();
    const request = new NextRequest('http://localhost:3000/api/upload', {
      method: 'POST',
      headers: {
        Cookie: 'token=valid-jwt-token',
      },
      body: formData,
    });

    const response = await uploadPOST(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Invalid CSRF token');
  });

  it('should fail with invalid file', async () => {
    mockValidateFile.mockReturnValue({
      valid: false,
      error: 'File type not allowed',
    });

    const mockFile = {
      name: 'malware.exe',
      size: 1024,
      type: 'application/octet-stream',
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024)),
    } as File;

    const formData = new FormData();
    formData.append('file', mockFile);

    const request = new NextRequest('http://localhost:3000/api/upload', {
      method: 'POST',
      headers: {
        'X-CSRF-Token': 'valid-csrf-token',
        Cookie: 'token=valid-jwt-token',
      },
      body: formData,
    });

    const response = await uploadPOST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('File type not allowed');
  });

  it('should fail with rate limiting', async () => {
    mockRateLimit.mockResolvedValue({
      success: false,
      limit: 10,
      remaining: 0,
      reset: new Date(Date.now() + 60 * 60 * 1000),
    });

    const formData = new FormData();
    const request = new NextRequest('http://localhost:3000/api/upload', {
      method: 'POST',
      headers: {
        'X-CSRF-Token': 'valid-csrf-token',
        Cookie: 'token=valid-jwt-token',
      },
      body: formData,
    });

    const response = await uploadPOST(request);
    const data = await response.json();

    expect(response.status).toBe(429);
    expect(data.error).toBe('Too many upload attempts. Please try again later.');
  });

  it('should fail without file', async () => {
    const formData = new FormData();
    // No file attached

    const request = new NextRequest('http://localhost:3000/api/upload', {
      method: 'POST',
      headers: {
        'X-CSRF-Token': 'valid-csrf-token',
        Cookie: 'token=valid-jwt-token',
      },
      body: formData,
    });

    const response = await uploadPOST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('No file provided');
  });

  it('should handle large files', async () => {
    const largeFileSize = 20 * 1024 * 1024; // 20MB
    const mockFile = {
      name: 'large-file.txt',
      size: largeFileSize,
      type: 'text/plain',
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(largeFileSize)),
    } as File;

    const formData = new FormData();
    formData.append('file', mockFile);

    mockEncryption.encryptFile.mockResolvedValue({
      encryptedContent: 'encrypted-large-content',
      salt: 'salt',
      iv: 'iv',
    });

    mockFileStorage.saveFile.mockResolvedValue({
      id: 'large-file-123',
      fileName: 'large-file.txt',
      fileSize: largeFileSize,
      downloadUrl: '/file/large-file-123',
    });

    const request = new NextRequest('http://localhost:3000/api/upload', {
      method: 'POST',
      headers: {
        'X-CSRF-Token': 'valid-csrf-token',
        Cookie: 'token=valid-jwt-token',
      },
      body: formData,
    });

    const response = await uploadPOST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.file.fileSize).toBe(largeFileSize);
  });

  it('should handle encryption errors', async () => {
    const mockFile = {
      name: 'test.txt',
      size: 1024,
      type: 'text/plain',
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024)),
    } as File;

    const formData = new FormData();
    formData.append('file', mockFile);
    formData.append('password', 'testpassword');

    mockEncryption.encryptFile.mockRejectedValue(new Error('Encryption failed'));

    const request = new NextRequest('http://localhost:3000/api/upload', {
      method: 'POST',
      headers: {
        'X-CSRF-Token': 'valid-csrf-token',
        Cookie: 'token=valid-jwt-token',
      },
      body: formData,
    });

    const response = await uploadPOST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('File encryption failed');
  });

  it('should handle storage errors', async () => {
    const mockFile = {
      name: 'test.txt',
      size: 1024,
      type: 'text/plain',
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024)),
    } as File;

    const formData = new FormData();
    formData.append('file', mockFile);

    mockEncryption.encryptFile.mockResolvedValue({
      encryptedContent: 'encrypted-content',
      salt: 'salt',
      iv: 'iv',
    });

    mockFileStorage.saveFile.mockRejectedValue(new Error('Storage full'));

    const request = new NextRequest('http://localhost:3000/api/upload', {
      method: 'POST',
      headers: {
        'X-CSRF-Token': 'valid-csrf-token',
        Cookie: 'token=valid-jwt-token',
      },
      body: formData,
    });

    const response = await uploadPOST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('File upload failed');
  });
});
