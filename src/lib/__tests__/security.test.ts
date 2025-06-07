// Security utilities tests
import { 
  sanitizeInput, 
  validateEmail, 
  validatePassword, 
  validateFileType,
  generateCSRFToken,
  validateCSRFToken,
  validateCSRFWithSession,
  getClientIP,
  logSecurityEvent
} from '../security';
import { NextRequest } from 'next/server';

// Mock NextRequest for testing
class MockNextRequest {
  public headers: Map<string, string>;
  public url: string;
  public ip?: string;

  constructor(headers: Record<string, string> = {}, url = 'http://localhost:3000/test', ip?: string) {
    this.headers = new Map(Object.entries(headers));
    this.url = url;
    this.ip = ip;
  }

  get(name: string): string | null {
    return this.headers.get(name.toLowerCase()) || null;
  }
}

describe('Security Utilities', () => {
  describe('Input Sanitization', () => {
    it('should sanitize HTML tags', () => {
      const maliciousInput = '<script>alert("xss")</script>';
      const sanitized = sanitizeInput(maliciousInput);
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('</script>');
    });

    it('should sanitize JavaScript protocols', () => {
      const maliciousInput = 'javascript:alert("xss")';
      const sanitized = sanitizeInput(maliciousInput);
      expect(sanitized).not.toContain('javascript:');
    });

    it('should sanitize event handlers', () => {
      const maliciousInput = 'onclick="alert(1)"';
      const sanitized = sanitizeInput(maliciousInput);
      expect(sanitized).not.toContain('onclick=');
    });    it('should handle null bytes', () => {
      const maliciousInput = 'test\x00hidden';
      const sanitized = sanitizeInput(maliciousInput);
      expect(sanitized).not.toContain('\x00');
    });

    it('should preserve safe text', () => {
      const safeInput = 'This is safe text with numbers 123 and symbols !@#';
      const sanitized = sanitizeInput(safeInput);
      expect(sanitized).toBe(safeInput);
    });
  });

  describe('Email Validation', () => {
    it('should validate correct email formats', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'user+tag@example.org',
        'firstname.lastname@subdomain.example.com'
      ];

      validEmails.forEach(email => {
        expect(validateEmail(email)).toBe(true);
      });
    });

    it('should reject invalid email formats', () => {
      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'user@',
        'user..double.dot@example.com',
        'user@.example.com',
        '',
        'user@example',
        'user name@example.com',
        'user@exam ple.com'
      ];      invalidEmails.forEach(email => {
        expect(validateEmail(email)).toBe(false);
      });
    });
  });

  describe('Password Validation', () => {    it('should accept strong passwords', () => {
      const strongPasswords = [
        'SecurePass123!',
        'MyP@ssw0rd2023',
        'C0mplex!ty&Strength',
        'LongPasswordWithNumbers123!'
      ];      strongPasswords.forEach(password => {
        const result = validatePassword(password);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    it('should reject weak passwords', () => {
      const weakPasswords = [
        { password: 'short', expectedError: 'at least 8 characters' },
        { password: 'nouppercase123', expectedError: 'uppercase letter' },
        { password: 'NOLOWERCASE123', expectedError: 'lowercase letter' },
        { password: 'NoNumbers!', expectedError: 'number' },
        { password: 'password123', expectedError: 'special character' },
        { password: '12345678', expectedError: 'letter' }
      ];

      weakPasswords.forEach(({ password, expectedError }) => {
        const result = validatePassword(password);
        expect(result.isValid).toBe(false);
        expect(result.errors.some(error => error.includes(expectedError))).toBe(true);
      });
    });

    it('should handle empty and null passwords', () => {
      const result1 = validatePassword('');
      expect(result1.isValid).toBe(false);
      expect(result1.errors.length).toBeGreaterThan(0);

      const result2 = validatePassword(null as any);
      expect(result2.isValid).toBe(false);
      expect(result2.errors.length).toBeGreaterThan(0);
    });
  });

  describe('File Type Validation', () => {
    it('should validate allowed file types', () => {
      const allowedTypes = ['.txt', '.pdf', '.jpg', '.png'];

      expect(validateFileType('document.txt', allowedTypes)).toBe(true);
      expect(validateFileType('image.jpg', allowedTypes)).toBe(true);
      expect(validateFileType('file.PDF', allowedTypes)).toBe(true); // Case insensitive
    });

    it('should reject disallowed file types', () => {
      const allowedTypes = ['.txt', '.pdf'];

      expect(validateFileType('malware.exe', allowedTypes)).toBe(false);
      expect(validateFileType('script.js', allowedTypes)).toBe(false);
      expect(validateFileType('batch.bat', allowedTypes)).toBe(false);
    });

    it('should handle files without extensions', () => {
      const allowedTypes = ['.txt', '.pdf'];
      expect(validateFileType('noextension', allowedTypes)).toBe(false);
    });
  });

  describe('CSRF Token Management', () => {
    it('should generate valid CSRF tokens', () => {
      const token1 = generateCSRFToken();
      const token2 = generateCSRFToken();

      expect(token1).toBeTruthy();
      expect(token2).toBeTruthy();
      expect(token1).not.toBe(token2);
      expect(token1).toMatch(/^[a-f0-9]{64}$/);
      expect(token2).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should validate CSRF tokens correctly', () => {
      const validToken = 'a'.repeat(64);
      const mockRequest = new MockNextRequest({
        'x-csrf-token': validToken
      }) as unknown as NextRequest;

      expect(validateCSRFToken(mockRequest)).toBe(true);
    });

    it('should reject invalid CSRF tokens', () => {
      const invalidTokens = [
        'too-short',
        'g'.repeat(64), // Invalid hex characters
        '1'.repeat(65), // Too long
        '',
      ];

      invalidTokens.forEach(token => {
        const mockRequest = new MockNextRequest({
          'x-csrf-token': token
        }) as unknown as NextRequest;

        expect(validateCSRFToken(mockRequest)).toBe(false);
      });
    });

    it('should reject requests without CSRF tokens', () => {
      const mockRequest = new MockNextRequest() as unknown as NextRequest;
      expect(validateCSRFToken(mockRequest)).toBe(false);
    });

    it('should validate CSRF with session context', async () => {
      const validToken = 'a'.repeat(64);
      const mockRequest = new MockNextRequest({
        'x-csrf-token': validToken
      }) as unknown as NextRequest;

      const result = await validateCSRFWithSession(mockRequest, 'user123');
      expect(result).toBe(true);
    });

    it('should reject CSRF validation with invalid session', async () => {
      const validToken = 'a'.repeat(64);
      const mockRequest = new MockNextRequest({
        'x-csrf-token': validToken
      }) as unknown as NextRequest;

      const result = await validateCSRFWithSession(mockRequest, '');
      expect(result).toBe(false);
    });
  });

  describe('Client IP Detection', () => {
    it('should extract IP from X-Forwarded-For header', () => {
      const mockRequest = new MockNextRequest({
        'x-forwarded-for': '192.168.1.1, 10.0.0.1'
      }) as unknown as NextRequest;

      const ip = getClientIP(mockRequest);
      expect(ip).toBe('192.168.1.1');
    });

    it('should extract IP from X-Real-IP header', () => {
      const mockRequest = new MockNextRequest({
        'x-real-ip': '203.0.113.1'
      }) as unknown as NextRequest;

      const ip = getClientIP(mockRequest);
      expect(ip).toBe('203.0.113.1');
    });

    it('should fall back to connection IP', () => {
      const mockRequest = new MockNextRequest({}, 'http://localhost:3000', '127.0.0.1') as unknown as NextRequest;
      const ip = getClientIP(mockRequest);
      expect(ip).toBe('127.0.0.1');
    });

    it('should return unknown for missing IP', () => {
      const mockRequest = new MockNextRequest() as unknown as NextRequest;
      const ip = getClientIP(mockRequest);
      expect(ip).toBe('unknown');
    });
  });

  describe('Security Event Logging', () => {
    // Mock console.log to capture log output
    const originalConsoleLog = console.log;
    let logOutput: any[] = [];

    beforeEach(() => {
      logOutput = [];
      console.log = jest.fn((...args) => {
        logOutput.push(args);
      });
    });

    afterEach(() => {
      console.log = originalConsoleLog;
    });

    it('should log security events with proper format', () => {
      const mockRequest = new MockNextRequest({
        'user-agent': 'TestAgent/1.0'
      }, 'http://localhost:3000/test') as unknown as NextRequest;

      logSecurityEvent('TEST_EVENT', mockRequest, { userId: '123' });

      expect(console.log).toHaveBeenCalled();
      expect(logOutput.length).toBeGreaterThan(0);
    });

    it('should handle security events without additional details', () => {
      const mockRequest = new MockNextRequest() as unknown as NextRequest;

      expect(() => {
        logSecurityEvent('SIMPLE_EVENT', mockRequest);
      }).not.toThrow();
    });
  });
});
