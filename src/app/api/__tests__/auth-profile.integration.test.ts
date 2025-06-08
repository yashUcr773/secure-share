import { NextRequest } from 'next/server'
import { PUT, OPTIONS } from '@/app/api/auth/profile/route'
import { AuthService } from '@/lib/auth-enhanced'
import { RateLimitService, UserService } from '@/lib/database'
import { CacheService } from '@/lib/cache'
import { jobQueue } from '@/lib/job-queue'

// Mock dependencies
jest.mock('@/lib/auth-enhanced')
jest.mock('@/lib/database')
jest.mock('@/lib/cache')
jest.mock('@/lib/job-queue')
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
const mockUserService = UserService as jest.Mocked<typeof UserService>
const mockCacheService = CacheService as jest.Mocked<typeof CacheService>
const mockJobQueue = jobQueue as jest.Mocked<typeof jobQueue>

describe('/api/auth/profile', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Default mock implementations
    mockRateLimitService.checkRateLimit.mockResolvedValue({
      allowed: true,
      remaining: 9,
      resetTime: Date.now() + 60000
    })
    
    mockAuthService.verifyToken.mockResolvedValue({
      valid: true,
      user: {
        id: 'user123',
        email: 'test@example.com',
        name: 'Test User'
      }
    })
    
    mockUserService.getUserByEmail.mockResolvedValue(null)
    mockAuthService.updateProfile.mockResolvedValue({ success: true })
    mockCacheService.delete.mockResolvedValue(undefined)
    mockJobQueue.addJob.mockResolvedValue(undefined)
  })

  describe('OPTIONS method', () => {
    it('handles CORS preflight request', async () => {
      const request = new Request('http://localhost:3000/api/auth/profile', {
        method: 'OPTIONS',
        headers: {
          'Origin': 'http://localhost:3000',
          'Access-Control-Request-Method': 'PUT'
        }
      })
      
      const response = await OPTIONS(request as NextRequest)
      
      expect(response).toBeDefined()
      expect(response.status).toBe(405)
    })
  })

  describe('PUT method - Authentication', () => {
    it('returns 401 when no auth token provided', async () => {
      const request = new Request('http://localhost:3000/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'new@example.com' })
      })
      
      const response = await PUT(request as NextRequest)
      const data = await response.json()
      
      expect(response.status).toBe(401)
      expect(data.error).toBe('Not authenticated')
    })

    it('returns 401 when auth token is invalid', async () => {
      mockAuthService.verifyToken.mockResolvedValue({
        valid: false,
        user: null
      })
      
      const request = new Request('http://localhost:3000/api/auth/profile', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': 'auth-token=invalid-token'
        },
        body: JSON.stringify({ email: 'new@example.com' })
      })
      
      const response = await PUT(request as NextRequest)
      const data = await response.json()
      
      expect(response.status).toBe(401)
      expect(data.error).toBe('Invalid token')
      expect(mockAuthService.verifyToken).toHaveBeenCalledWith('invalid-token')
    })

    it('successfully authenticates with valid token', async () => {
      const request = new Request('http://localhost:3000/api/auth/profile', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': 'auth-token=valid-token'
        },
        body: JSON.stringify({ email: 'new@example.com' })
      })
      
      const response = await PUT(request as NextRequest)
      
      expect(mockAuthService.verifyToken).toHaveBeenCalledWith('valid-token')
      expect(response.status).toBe(200)
    })
  })

  describe('PUT method - Rate Limiting', () => {
    it('returns 429 when rate limit exceeded', async () => {
      mockRateLimitService.checkRateLimit.mockResolvedValue({
        allowed: false,
        remaining: 0,
        resetTime: Date.now() + 60000
      })
      
      const request = new Request('http://localhost:3000/api/auth/profile', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': 'auth-token=valid-token'
        },
        body: JSON.stringify({ email: 'new@example.com' })
      })
      
      const response = await PUT(request as NextRequest)
      const data = await response.json()
      
      expect(response.status).toBe(429)
      expect(data.error).toContain('Too many profile update attempts')
      expect(mockRateLimitService.checkRateLimit).toHaveBeenCalledWith(
        'auth_profile:127.0.0.1',
        'profile_update',
        10,
        3600000
      )
    })

    it('applies correct rate limiting parameters', async () => {
      const request = new Request('http://localhost:3000/api/auth/profile', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': 'auth-token=valid-token'
        },
        body: JSON.stringify({ email: 'new@example.com' })
      })
      
      await PUT(request as NextRequest)
      
      expect(mockRateLimitService.checkRateLimit).toHaveBeenCalledWith(
        'auth_profile:127.0.0.1',
        'profile_update',
        10, // 10 updates
        3600000 // per hour
      )
    })
  })

  describe('PUT method - Input Validation', () => {
    it('returns 400 for invalid email format', async () => {
      const request = new Request('http://localhost:3000/api/auth/profile', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': 'auth-token=valid-token'
        },
        body: JSON.stringify({ email: 'invalid-email' })
      })
      
      const response = await PUT(request as NextRequest)
      const data = await response.json()
      
      expect(response.status).toBe(400)
      expect(data.error).toBe('Validation failed')
      expect(data.details).toBeDefined()
    })

    it('returns 400 for missing email field', async () => {
      const request = new Request('http://localhost:3000/api/auth/profile', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': 'auth-token=valid-token'
        },
        body: JSON.stringify({})
      })
      
      const response = await PUT(request as NextRequest)
      const data = await response.json()
      
      expect(response.status).toBe(400)
      expect(data.error).toBe('Validation failed')
    })

    it('accepts valid email format', async () => {
      const request = new Request('http://localhost:3000/api/auth/profile', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': 'auth-token=valid-token'
        },
        body: JSON.stringify({ email: 'valid@example.com' })
      })
      
      const response = await PUT(request as NextRequest)
      
      expect(response.status).toBe(200)
    })

    it('handles malformed JSON gracefully', async () => {
      const request = new Request('http://localhost:3000/api/auth/profile', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': 'auth-token=valid-token'
        },
        body: 'invalid-json'
      })
      
      const response = await PUT(request as NextRequest)
      
      expect(response.status).toBe(500)
    })
  })

  describe('PUT method - Email Uniqueness', () => {
    it('returns 400 when email is already in use by another user', async () => {
      mockUserService.getUserByEmail.mockResolvedValue({
        id: 'other-user',
        email: 'existing@example.com',
        name: 'Other User'
      })
      
      const request = new Request('http://localhost:3000/api/auth/profile', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': 'auth-token=valid-token'
        },
        body: JSON.stringify({ email: 'existing@example.com' })
      })
      
      const response = await PUT(request as NextRequest)
      const data = await response.json()
      
      expect(response.status).toBe(400)
      expect(data.error).toBe('Email already in use')
      expect(mockUserService.getUserByEmail).toHaveBeenCalledWith('existing@example.com')
    })

    it('allows user to keep their current email', async () => {
      const request = new Request('http://localhost:3000/api/auth/profile', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': 'auth-token=valid-token'
        },
        body: JSON.stringify({ email: 'test@example.com' }) // Same as current user
      })
      
      const response = await PUT(request as NextRequest)
      
      expect(response.status).toBe(200)
      expect(mockUserService.getUserByEmail).not.toHaveBeenCalled()
    })

    it('allows email update when not in use', async () => {
      mockUserService.getUserByEmail.mockResolvedValue(null)
      
      const request = new Request('http://localhost:3000/api/auth/profile', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': 'auth-token=valid-token'
        },
        body: JSON.stringify({ email: 'new@example.com' })
      })
      
      const response = await PUT(request as NextRequest)
      
      expect(response.status).toBe(200)
      expect(mockUserService.getUserByEmail).toHaveBeenCalledWith('new@example.com')
    })

    it('handles case insensitive email comparison', async () => {
      const request = new Request('http://localhost:3000/api/auth/profile', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': 'auth-token=valid-token'
        },
        body: JSON.stringify({ email: 'TEST@EXAMPLE.COM' }) // Different case, same email
      })
      
      const response = await PUT(request as NextRequest)
      
      expect(response.status).toBe(200)
      expect(mockUserService.getUserByEmail).not.toHaveBeenCalled()
    })
  })

  describe('PUT method - Profile Update', () => {
    it('successfully updates user profile', async () => {
      const request = new Request('http://localhost:3000/api/auth/profile', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': 'auth-token=valid-token'
        },
        body: JSON.stringify({ email: 'updated@example.com' })
      })
      
      const response = await PUT(request as NextRequest)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.message).toBe('Profile updated successfully')
      expect(data.user).toEqual({
        id: 'user123',
        email: 'updated@example.com',
        name: 'Test User'
      })
      expect(mockAuthService.updateProfile).toHaveBeenCalledWith('user123', {
        email: 'updated@example.com'
      })
    })

    it('returns 500 when profile update fails', async () => {
      mockAuthService.updateProfile.mockResolvedValue({
        success: false,
        error: 'Database error'
      })
      
      const request = new Request('http://localhost:3000/api/auth/profile', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': 'auth-token=valid-token'
        },
        body: JSON.stringify({ email: 'new@example.com' })
      })
      
      const response = await PUT(request as NextRequest)
      const data = await response.json()
      
      expect(response.status).toBe(500)
      expect(data.error).toBe('Database error')
    })

    it('handles update service throwing error', async () => {
      mockAuthService.updateProfile.mockRejectedValue(new Error('Service error'))
      
      const request = new Request('http://localhost:3000/api/auth/profile', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': 'auth-token=valid-token'
        },
        body: JSON.stringify({ email: 'new@example.com' })
      })
      
      const response = await PUT(request as NextRequest)
      const data = await response.json()
      
      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to update profile')
    })
  })

  describe('PUT method - Cache Invalidation', () => {
    it('invalidates user-related caches after successful update', async () => {
      const request = new Request('http://localhost:3000/api/auth/profile', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': 'auth-token=valid-token'
        },
        body: JSON.stringify({ email: 'new@example.com' })
      })
      
      await PUT(request as NextRequest)
      
      expect(mockCacheService.delete).toHaveBeenCalledWith('user:user123')
      expect(mockCacheService.delete).toHaveBeenCalledWith('folders:user123')
      expect(mockCacheService.delete).toHaveBeenCalledWith('dashboard_files:user123')
      expect(mockCacheService.delete).toHaveBeenCalledWith('dashboard_shared:user123')
    })

    it('handles cache deletion errors gracefully', async () => {
      mockCacheService.delete.mockRejectedValue(new Error('Cache error'))
      
      const request = new Request('http://localhost:3000/api/auth/profile', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': 'auth-token=valid-token'
        },
        body: JSON.stringify({ email: 'new@example.com' })
      })
      
      const response = await PUT(request as NextRequest)
      
      // Should still succeed despite cache errors
      expect(response.status).toBe(200)
    })
  })

  describe('PUT method - Analytics Job Queue', () => {
    it('queues analytics job for profile update', async () => {
      const request = new Request('http://localhost:3000/api/auth/profile', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': 'auth-token=valid-token',
          'User-Agent': 'Mozilla/5.0 Test Browser'
        },
        body: JSON.stringify({ email: 'new@example.com' })
      })
      
      await PUT(request as NextRequest)
      
      expect(mockJobQueue.addJob).toHaveBeenCalledWith('analytics-processing', 
        expect.objectContaining({
          type: 'profile_updated',
          userId: 'user123',
          emailChanged: true,
          oldEmail: 'test@example.com',
          newEmail: 'new@example.com',
          ip: '127.0.0.1',
          userAgent: 'Mozilla/5.0 Test Browser'
        })
      )
    })

    it('tracks when email is not changed', async () => {
      const request = new Request('http://localhost:3000/api/auth/profile', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': 'auth-token=valid-token'
        },
        body: JSON.stringify({ email: 'test@example.com' }) // Same email
      })
      
      await PUT(request as NextRequest)
      
      expect(mockJobQueue.addJob).toHaveBeenCalledWith('analytics-processing', 
        expect.objectContaining({
          emailChanged: false,
          oldEmail: 'test@example.com',
          newEmail: 'test@example.com'
        })
      )
    })

    it('handles missing user agent header', async () => {
      const request = new Request('http://localhost:3000/api/auth/profile', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': 'auth-token=valid-token'
        },
        body: JSON.stringify({ email: 'new@example.com' })
      })
      
      await PUT(request as NextRequest)
      
      expect(mockJobQueue.addJob).toHaveBeenCalledWith('analytics-processing', 
        expect.objectContaining({
          userAgent: 'unknown'
        })
      )
    })

    it('continues on job queue failure', async () => {
      mockJobQueue.addJob.mockRejectedValue(new Error('Queue error'))
      
      const request = new Request('http://localhost:3000/api/auth/profile', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': 'auth-token=valid-token'
        },
        body: JSON.stringify({ email: 'new@example.com' })
      })
      
      const response = await PUT(request as NextRequest)
      
      // Should still succeed despite queue errors
      expect(response.status).toBe(200)
    })
  })

  describe('PUT method - Input Sanitization', () => {
    it('sanitizes email input', async () => {
      const request = new Request('http://localhost:3000/api/auth/profile', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': 'auth-token=valid-token'
        },
        body: JSON.stringify({ email: '  NEW@EXAMPLE.COM  ' })
      })
      
      const response = await PUT(request as NextRequest)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(mockAuthService.updateProfile).toHaveBeenCalledWith('user123', {
        email: '  new@example.com  ' // Lowercase
      })
    })

    it('handles special characters in email', async () => {
      const email = 'test+tag@example.com'
      const request = new Request('http://localhost:3000/api/auth/profile', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': 'auth-token=valid-token'
        },
        body: JSON.stringify({ email })
      })
      
      const response = await PUT(request as NextRequest)
      
      expect(response.status).toBe(200)
      expect(mockAuthService.updateProfile).toHaveBeenCalledWith('user123', {
        email: email.toLowerCase()
      })
    })
  })

  describe('PUT method - Error Handling', () => {
    it('handles general exceptions gracefully', async () => {
      mockAuthService.verifyToken.mockRejectedValue(new Error('Unexpected error'))
      
      const request = new Request('http://localhost:3000/api/auth/profile', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': 'auth-token=valid-token'
        },
        body: JSON.stringify({ email: 'new@example.com' })
      })
      
      const response = await PUT(request as NextRequest)
      const data = await response.json()
      
      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })

    it('logs errors appropriately', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
      mockAuthService.updateProfile.mockRejectedValue(new Error('Test error'))
      
      const request = new Request('http://localhost:3000/api/auth/profile', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': 'auth-token=valid-token'
        },
        body: JSON.stringify({ email: 'new@example.com' })
      })
      
      await PUT(request as NextRequest)
      
      expect(consoleSpy).toHaveBeenCalledWith('Failed to update user profile:', expect.any(Error))
      consoleSpy.mockRestore()
    })
  })

  describe('PUT method - Security Headers', () => {
    it('applies security headers to all responses', async () => {
      const { addSecurityHeaders } = require('@/lib/security')
      
      const request = new Request('http://localhost:3000/api/auth/profile', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': 'auth-token=valid-token'
        },
        body: JSON.stringify({ email: 'new@example.com' })
      })
      
      await PUT(request as NextRequest)
      
      expect(addSecurityHeaders).toHaveBeenCalled()
    })

    it('applies security headers to error responses', async () => {
      const { addSecurityHeaders } = require('@/lib/security')
      
      const request = new Request('http://localhost:3000/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'new@example.com' })
      })
      
      await PUT(request as NextRequest)
      
      expect(addSecurityHeaders).toHaveBeenCalled()
    })
  })

  describe('PUT method - Integration Scenarios', () => {
    it('handles complete successful profile update flow', async () => {
      const request = new Request('http://localhost:3000/api/auth/profile', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': 'auth-token=valid-token',
          'User-Agent': 'Test Browser'
        },
        body: JSON.stringify({ email: 'completely-new@example.com' })
      })
      
      const response = await PUT(request as NextRequest)
      const data = await response.json()
      
      // Verify complete flow
      expect(mockRateLimitService.checkRateLimit).toHaveBeenCalled()
      expect(mockAuthService.verifyToken).toHaveBeenCalled()
      expect(mockUserService.getUserByEmail).toHaveBeenCalledWith('completely-new@example.com')
      expect(mockAuthService.updateProfile).toHaveBeenCalled()
      expect(mockCacheService.delete).toHaveBeenCalledTimes(4)
      expect(mockJobQueue.addJob).toHaveBeenCalled()
      
      expect(response.status).toBe(200)
      expect(data.message).toBe('Profile updated successfully')
      expect(data.user.email).toBe('completely-new@example.com')
    })

    it('handles multiple validation failures', async () => {
      const request = new Request('http://localhost:3000/api/auth/profile', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': 'auth-token=valid-token'
        },
        body: JSON.stringify({ email: '', extraField: 'not-allowed' })
      })
      
      const response = await PUT(request as NextRequest)
      const data = await response.json()
      
      expect(response.status).toBe(400)
      expect(data.error).toBe('Validation failed')
      expect(data.details).toBeDefined()
    })
  })
})
