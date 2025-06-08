import { NextRequest } from 'next/server'
import { POST, OPTIONS } from '@/app/api/auth/password/route'
import { AuthService } from '@/lib/auth-enhanced'
import { RateLimitService } from '@/lib/database'

// Mock dependencies
jest.mock('@/lib/auth-enhanced')
jest.mock('@/lib/database')
jest.mock('@/lib/security', () => ({
  addSecurityHeaders: jest.fn((response) => response),
  validateOrigin: jest.fn(() => true),
  handleCORSPreflight: jest.fn(() => null),
  sanitizeInput: jest.fn((input) => input),
  validateCSRFWithSession: jest.fn(() => ({ valid: true }))
}))
jest.mock('@/lib/rate-limit', () => ({
  getClientIP: jest.fn(() => '127.0.0.1')
}))

const mockAuthService = AuthService as jest.Mocked<typeof AuthService>
const mockRateLimitService = RateLimitService as jest.Mocked<typeof RateLimitService>

describe('/api/auth/password', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Default mock implementations
    mockRateLimitService.checkRateLimit.mockResolvedValue({
      allowed: true,
      remaining: 4,
      resetTime: Date.now() + 60000,
      headers: {
        'X-RateLimit-Limit': '5',
        'X-RateLimit-Remaining': '4',
        'X-RateLimit-Reset': (Date.now() + 60000).toString()
      }
    })
    
    mockAuthService.verifyToken.mockResolvedValue({
      valid: true,
      user: {
        id: 'user123',
        email: 'test@example.com',
        name: 'Test User',
        passwordHash: '$2b$10$hashedPassword'
      }
    })
    
    mockAuthService.verifyPassword.mockResolvedValue(true)
    mockAuthService.updatePassword.mockResolvedValue({ success: true })
  })

  describe('OPTIONS method', () => {
    it('handles CORS preflight request', async () => {
      const request = new Request('http://localhost:3000/api/auth/password', {
        method: 'OPTIONS',
        headers: {
          'Origin': 'http://localhost:3000',
          'Access-Control-Request-Method': 'POST'
        }
      })
      
      const response = await OPTIONS(request as NextRequest)
      
      expect(response).toBeDefined()
      expect(response.status).toBe(405)
    })
  })

  describe('POST method - Authentication', () => {
    it('returns 401 when no auth token provided', async () => {
      const request = new Request('http://localhost:3000/api/auth/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: 'current123',
          newPassword: 'newPassword123'
        })
      })
      
      const response = await POST(request as NextRequest)
      const data = await response.json()
      
      expect(response.status).toBe(401)
      expect(data.error).toBe('Not authenticated')
    })

    it('returns 401 when auth token is invalid', async () => {
      mockAuthService.verifyToken.mockResolvedValue({
        valid: false,
        user: null
      })
      
      const request = new Request('http://localhost:3000/api/auth/password', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': 'auth-token=invalid-token'
        },
        body: JSON.stringify({
          currentPassword: 'current123',
          newPassword: 'newPassword123'
        })
      })
      
      const response = await POST(request as NextRequest)
      const data = await response.json()
      
      expect(response.status).toBe(401)
      expect(data.error).toBe('Invalid token')
      expect(mockAuthService.verifyToken).toHaveBeenCalledWith('invalid-token')
    })

    it('successfully authenticates with valid token', async () => {
      const request = new Request('http://localhost:3000/api/auth/password', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': 'auth-token=valid-token'
        },
        body: JSON.stringify({
          currentPassword: 'current123',
          newPassword: 'newPassword123'
        })
      })
      
      const response = await POST(request as NextRequest)
      
      expect(mockAuthService.verifyToken).toHaveBeenCalledWith('valid-token')
      expect(response.status).toBe(200)
    })
  })

  describe('POST method - Rate Limiting', () => {
    it('returns 429 when rate limit exceeded', async () => {
      mockRateLimitService.checkRateLimit.mockResolvedValue({
        allowed: false,
        remaining: 0,
        resetTime: Date.now() + 60000,
        headers: {}
      })
      
      const request = new Request('http://localhost:3000/api/auth/password', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': 'auth-token=valid-token'
        },
        body: JSON.stringify({
          currentPassword: 'current123',
          newPassword: 'newPassword123'
        })
      })
      
      const response = await POST(request as NextRequest)
      const data = await response.json()
      
      expect(response.status).toBe(429)
      expect(data.error).toContain('Too many password change attempts')
      expect(mockRateLimitService.checkRateLimit).toHaveBeenCalledWith(
        'auth_password:127.0.0.1',
        'password_change',
        5,
        3600000
      )
    })

    it('applies correct rate limiting parameters', async () => {
      const request = new Request('http://localhost:3000/api/auth/password', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': 'auth-token=valid-token'
        },
        body: JSON.stringify({
          currentPassword: 'current123',
          newPassword: 'newPassword123'
        })
      })
      
      await POST(request as NextRequest)
      
      expect(mockRateLimitService.checkRateLimit).toHaveBeenCalledWith(
        'auth_password:127.0.0.1',
        'password_change',
        5, // 5 attempts
        3600000 // per hour
      )
    })

    it('includes rate limit headers in response', async () => {
      const request = new Request('http://localhost:3000/api/auth/password', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': 'auth-token=valid-token'
        },
        body: JSON.stringify({
          currentPassword: 'current123',
          newPassword: 'newPassword123'
        })
      })
      
      const response = await POST(request as NextRequest)
      
      expect(response.headers.get('X-RateLimit-Limit')).toBe('5')
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('4')
      expect(response.headers.get('X-RateLimit-Reset')).toBeDefined()
    })
  })

  describe('POST method - Input Validation', () => {
    it('returns 400 for missing current password', async () => {
      const request = new Request('http://localhost:3000/api/auth/password', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': 'auth-token=valid-token'
        },
        body: JSON.stringify({
          newPassword: 'newPassword123'
        })
      })
      
      const response = await POST(request as NextRequest)
      const data = await response.json()
      
      expect(response.status).toBe(400)
      expect(data.error).toBe('Validation failed')
      expect(data.details).toBeDefined()
    })

    it('returns 400 for missing new password', async () => {
      const request = new Request('http://localhost:3000/api/auth/password', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': 'auth-token=valid-token'
        },
        body: JSON.stringify({
          currentPassword: 'current123'
        })
      })
      
      const response = await POST(request as NextRequest)
      const data = await response.json()
      
      expect(response.status).toBe(400)
      expect(data.error).toBe('Validation failed')
    })

    it('returns 400 for empty current password', async () => {
      const request = new Request('http://localhost:3000/api/auth/password', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': 'auth-token=valid-token'
        },
        body: JSON.stringify({
          currentPassword: '',
          newPassword: 'newPassword123'
        })
      })
      
      const response = await POST(request as NextRequest)
      const data = await response.json()
      
      expect(response.status).toBe(400)
      expect(data.error).toBe('Validation failed')
    })

    it('returns 400 for short new password', async () => {
      const request = new Request('http://localhost:3000/api/auth/password', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': 'auth-token=valid-token'
        },
        body: JSON.stringify({
          currentPassword: 'current123',
          newPassword: '1234567' // 7 characters, too short
        })
      })
      
      const response = await POST(request as NextRequest)
      const data = await response.json()
      
      expect(response.status).toBe(400)
      expect(data.error).toBe('Validation failed')
      expect(data.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: 'New password must be at least 8 characters'
          })
        ])
      )
    })

    it('accepts valid password inputs', async () => {
      const request = new Request('http://localhost:3000/api/auth/password', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': 'auth-token=valid-token'
        },
        body: JSON.stringify({
          currentPassword: 'current123',
          newPassword: 'newPassword123'
        })
      })
      
      const response = await POST(request as NextRequest)
      
      expect(response.status).toBe(200)
    })

    it('handles malformed JSON gracefully', async () => {
      const request = new Request('http://localhost:3000/api/auth/password', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': 'auth-token=valid-token'
        },
        body: 'invalid-json'
      })
      
      const response = await POST(request as NextRequest)
      
      expect(response.status).toBe(500)
    })
  })

  describe('POST method - Password Verification', () => {
    it('returns 400 when current password is incorrect', async () => {
      mockAuthService.verifyPassword.mockResolvedValue(false)
      
      const request = new Request('http://localhost:3000/api/auth/password', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': 'auth-token=valid-token'
        },
        body: JSON.stringify({
          currentPassword: 'wrongPassword',
          newPassword: 'newPassword123'
        })
      })
      
      const response = await POST(request as NextRequest)
      const data = await response.json()
      
      expect(response.status).toBe(400)
      expect(data.error).toBe('Current password is incorrect')
      expect(mockAuthService.verifyPassword).toHaveBeenCalledWith(
        'wrongPassword',
        '$2b$10$hashedPassword'
      )
    })

    it('proceeds when current password is correct', async () => {
      mockAuthService.verifyPassword.mockResolvedValue(true)
      
      const request = new Request('http://localhost:3000/api/auth/password', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': 'auth-token=valid-token'
        },
        body: JSON.stringify({
          currentPassword: 'correctPassword',
          newPassword: 'newPassword123'
        })
      })
      
      const response = await POST(request as NextRequest)
      
      expect(response.status).toBe(200)
      expect(mockAuthService.verifyPassword).toHaveBeenCalledWith(
        'correctPassword',
        '$2b$10$hashedPassword'
      )
    })

    it('handles password verification errors', async () => {
      mockAuthService.verifyPassword.mockRejectedValue(new Error('Verification error'))
      
      const request = new Request('http://localhost:3000/api/auth/password', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': 'auth-token=valid-token'
        },
        body: JSON.stringify({
          currentPassword: 'current123',
          newPassword: 'newPassword123'
        })
      })
      
      const response = await POST(request as NextRequest)
      
      expect(response.status).toBe(500)
    })
  })

  describe('POST method - Password Update', () => {
    it('successfully updates password', async () => {
      const request = new Request('http://localhost:3000/api/auth/password', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': 'auth-token=valid-token'
        },
        body: JSON.stringify({
          currentPassword: 'current123',
          newPassword: 'newPassword123'
        })
      })
      
      const response = await POST(request as NextRequest)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.message).toBe('Password changed successfully')
      expect(mockAuthService.updatePassword).toHaveBeenCalledWith(
        'user123',
        'current123',
        'newPassword123'
      )
    })

    it('returns 500 when password update fails', async () => {
      mockAuthService.updatePassword.mockResolvedValue({
        success: false,
        error: 'Password update failed'
      })
      
      const request = new Request('http://localhost:3000/api/auth/password', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': 'auth-token=valid-token'
        },
        body: JSON.stringify({
          currentPassword: 'current123',
          newPassword: 'newPassword123'
        })
      })
      
      const response = await POST(request as NextRequest)
      const data = await response.json()
      
      expect(response.status).toBe(500)
      expect(data.error).toBe('Password update failed')
    })

    it('handles update service errors', async () => {
      mockAuthService.updatePassword.mockRejectedValue(new Error('Service error'))
      
      const request = new Request('http://localhost:3000/api/auth/password', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': 'auth-token=valid-token'
        },
        body: JSON.stringify({
          currentPassword: 'current123',
          newPassword: 'newPassword123'
        })
      })
      
      const response = await POST(request as NextRequest)
      
      expect(response.status).toBe(500)
    })

    it('returns generic error message when no specific error provided', async () => {
      mockAuthService.updatePassword.mockResolvedValue({
        success: false
      })
      
      const request = new Request('http://localhost:3000/api/auth/password', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': 'auth-token=valid-token'
        },
        body: JSON.stringify({
          currentPassword: 'current123',
          newPassword: 'newPassword123'
        })
      })
      
      const response = await POST(request as NextRequest)
      const data = await response.json()
      
      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to update password')
    })
  })

  describe('POST method - Input Sanitization', () => {
    it('sanitizes input before validation', async () => {
      const { sanitizeInput } = require('@/lib/security')
      
      const request = new Request('http://localhost:3000/api/auth/password', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': 'auth-token=valid-token'
        },
        body: JSON.stringify({
          currentPassword: 'current123',
          newPassword: 'newPassword123'
        })
      })
      
      await POST(request as NextRequest)
      
      expect(sanitizeInput).toHaveBeenCalledWith('current123')
      expect(sanitizeInput).toHaveBeenCalledWith('newPassword123')
    })

    it('handles special characters in passwords', async () => {
      const specialPassword = 'P@ssw0rd!#$%'
      const request = new Request('http://localhost:3000/api/auth/password', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': 'auth-token=valid-token'
        },
        body: JSON.stringify({
          currentPassword: specialPassword,
          newPassword: 'newP@ssw0rd!#$%'
        })
      })
      
      const response = await POST(request as NextRequest)
      
      expect(response.status).toBe(200)
      expect(mockAuthService.verifyPassword).toHaveBeenCalledWith(
        specialPassword,
        '$2b$10$hashedPassword'
      )
    })

    it('handles whitespace in passwords', async () => {
      const passwordWithSpaces = 'password with spaces'
      const request = new Request('http://localhost:3000/api/auth/password', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': 'auth-token=valid-token'
        },
        body: JSON.stringify({
          currentPassword: passwordWithSpaces,
          newPassword: 'new password with spaces'
        })
      })
      
      const response = await POST(request as NextRequest)
      
      expect(response.status).toBe(200)
      expect(mockAuthService.verifyPassword).toHaveBeenCalledWith(
        passwordWithSpaces,
        '$2b$10$hashedPassword'
      )
    })
  })

  describe('POST method - Security Features', () => {
    it('validates request origin for CSRF protection', async () => {
      const { validateOrigin } = require('@/lib/security')
      
      const request = new Request('http://localhost:3000/api/auth/password', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': 'auth-token=valid-token'
        },
        body: JSON.stringify({
          currentPassword: 'current123',
          newPassword: 'newPassword123'
        })
      })
      
      await POST(request as NextRequest)
      
      expect(validateOrigin).toHaveBeenCalledWith(
        request,
        ['http://localhost:3000']
      )
    })

    it('rejects requests from invalid origins', async () => {
      const { validateOrigin } = require('@/lib/security')
      validateOrigin.mockReturnValue(false)
      
      const request = new Request('http://localhost:3000/api/auth/password', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': 'auth-token=valid-token'
        },
        body: JSON.stringify({
          currentPassword: 'current123',
          newPassword: 'newPassword123'
        })
      })
      
      const response = await POST(request as NextRequest)
      const data = await response.json()
      
      expect(response.status).toBe(403)
      expect(data.error).toBe('Invalid request origin')
    })

    it('applies security headers to all responses', async () => {
      const { addSecurityHeaders } = require('@/lib/security')
      
      const request = new Request('http://localhost:3000/api/auth/password', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': 'auth-token=valid-token'
        },
        body: JSON.stringify({
          currentPassword: 'current123',
          newPassword: 'newPassword123'
        })
      })
      
      await POST(request as NextRequest)
      
      expect(addSecurityHeaders).toHaveBeenCalled()
    })
  })

  describe('POST method - Error Handling', () => {
    it('handles general exceptions gracefully', async () => {
      mockAuthService.verifyToken.mockRejectedValue(new Error('Unexpected error'))
      
      const request = new Request('http://localhost:3000/api/auth/password', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': 'auth-token=valid-token'
        },
        body: JSON.stringify({
          currentPassword: 'current123',
          newPassword: 'newPassword123'
        })
      })
      
      const response = await POST(request as NextRequest)
      const data = await response.json()
      
      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })

    it('logs errors appropriately', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
      mockAuthService.updatePassword.mockRejectedValue(new Error('Test error'))
      
      const request = new Request('http://localhost:3000/api/auth/password', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': 'auth-token=valid-token'
        },
        body: JSON.stringify({
          currentPassword: 'current123',
          newPassword: 'newPassword123'
        })
      })
      
      await POST(request as NextRequest)
      
      expect(consoleSpy).toHaveBeenCalledWith('Password change error:', expect.any(Error))
      consoleSpy.mockRestore()
    })
  })

  describe('POST method - Edge Cases', () => {
    it('handles very long passwords', async () => {
      const longPassword = 'a'.repeat(1000)
      const request = new Request('http://localhost:3000/api/auth/password', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': 'auth-token=valid-token'
        },
        body: JSON.stringify({
          currentPassword: 'current123',
          newPassword: longPassword
        })
      })
      
      const response = await POST(request as NextRequest)
      
      expect(response.status).toBe(200)
      expect(mockAuthService.updatePassword).toHaveBeenCalledWith(
        'user123',
        'current123',
        longPassword
      )
    })

    it('handles empty JSON body', async () => {
      const request = new Request('http://localhost:3000/api/auth/password', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': 'auth-token=valid-token'
        },
        body: JSON.stringify({})
      })
      
      const response = await POST(request as NextRequest)
      const data = await response.json()
      
      expect(response.status).toBe(400)
      expect(data.error).toBe('Validation failed')
    })

    it('handles null values in request body', async () => {
      const request = new Request('http://localhost:3000/api/auth/password', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': 'auth-token=valid-token'
        },
        body: JSON.stringify({
          currentPassword: null,
          newPassword: null
        })
      })
      
      const response = await POST(request as NextRequest)
      const data = await response.json()
      
      expect(response.status).toBe(400)
      expect(data.error).toBe('Validation failed')
    })
  })

  describe('POST method - Integration Scenarios', () => {
    it('handles complete successful password change flow', async () => {
      const request = new Request('http://localhost:3000/api/auth/password', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': 'auth-token=valid-token'
        },
        body: JSON.stringify({
          currentPassword: 'oldPassword123',
          newPassword: 'newSecurePassword456'
        })
      })
      
      const response = await POST(request as NextRequest)
      const data = await response.json()
      
      // Verify complete flow
      expect(mockRateLimitService.checkRateLimit).toHaveBeenCalled()
      expect(mockAuthService.verifyToken).toHaveBeenCalled()
      expect(mockAuthService.verifyPassword).toHaveBeenCalledWith(
        'oldPassword123',
        '$2b$10$hashedPassword'
      )
      expect(mockAuthService.updatePassword).toHaveBeenCalledWith(
        'user123',
        'oldPassword123',
        'newSecurePassword456'
      )
      
      expect(response.status).toBe(200)
      expect(data.message).toBe('Password changed successfully')
      expect(response.headers.get('X-RateLimit-Limit')).toBe('5')
    })

    it('handles password change with minimum valid length', async () => {
      const minValidPassword = '12345678' // exactly 8 characters
      const request = new Request('http://localhost:3000/api/auth/password', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': 'auth-token=valid-token'
        },
        body: JSON.stringify({
          currentPassword: 'current123',
          newPassword: minValidPassword
        })
      })
      
      const response = await POST(request as NextRequest)
      
      expect(response.status).toBe(200)
      expect(mockAuthService.updatePassword).toHaveBeenCalledWith(
        'user123',
        'current123',
        minValidPassword
      )
    })

    it('handles password change with complex requirements', async () => {
      const complexPassword = 'MyC0mpl3x!P@ssw0rd#123'
      const request = new Request('http://localhost:3000/api/auth/password', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': 'auth-token=valid-token'
        },
        body: JSON.stringify({
          currentPassword: 'current123',
          newPassword: complexPassword
        })
      })
      
      const response = await POST(request as NextRequest)
      
      expect(response.status).toBe(200)
      expect(mockAuthService.updatePassword).toHaveBeenCalledWith(
        'user123',
        'current123',
        complexPassword
      )
    })
  })
})
