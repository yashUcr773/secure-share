import { NextRequest } from 'next/server'
import { POST } from '../contact/route'

// Mock all dependencies
jest.mock('@/lib/storage', () => ({
  ContactStorage: {
    saveContact: jest.fn(),
    getContacts: jest.fn(),
    getContactById: jest.fn()
  }
}))

jest.mock('@/lib/rate-limit', () => ({
  generalRateLimit: { requests: 10, window: 60000 },
  createRateLimitIdentifier: jest.fn(),
  checkRateLimit: jest.fn()
}))

jest.mock('@/lib/security', () => ({
  addSecurityHeaders: jest.fn((response) => response),
  validateOrigin: jest.fn(() => true),
  handleCORSPreflight: jest.fn(() => null),
  sanitizeInput: jest.fn((input) => input),
  validateCSRFToken: jest.fn(() => true)
}))

jest.mock('@/lib/notification', () => ({
  NotificationService: {
    sendContactNotification: jest.fn()
  }
}))

const { ContactStorage } = require('@/lib/storage')
const { checkRateLimit, createRateLimitIdentifier } = require('@/lib/rate-limit')
const { validateOrigin, validateCSRFToken } = require('@/lib/security')
const { NotificationService } = require('@/lib/notification')

describe('/api/contact Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.NEXT_PUBLIC_BASE_URL = 'http://localhost:3000'
  })

  describe('POST /api/contact', () => {
    const validContactData = {
      name: 'John Doe',
      email: 'john@example.com',
      subject: 'General Inquiry',
      message: 'This is a test message with enough characters to pass validation.'
    }

    it('should submit contact form successfully', async () => {
      // Setup mocks
      checkRateLimit.mockResolvedValue({ success: true, headers: {} })
      createRateLimitIdentifier.mockReturnValue('contact:127.0.0.1')
      validateOrigin.mockReturnValue(true)
      validateCSRFToken.mockReturnValue(true)
      ContactStorage.saveContact.mockResolvedValue({
        id: 'contact123',
        ...validContactData,
        createdAt: new Date()
      })

      const request = new NextRequest('http://localhost:3000/api/contact', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-forwarded-for': '127.0.0.1',
          'origin': 'http://localhost:3000',
          'x-csrf-token': 'valid-csrf-token'
        },
        body: JSON.stringify(validContactData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Contact form submitted successfully')
      expect(ContactStorage.saveContact).toHaveBeenCalledWith(validContactData)
    })

    it('should handle rate limiting', async () => {
      checkRateLimit.mockResolvedValue({ 
        success: false, 
        headers: { 
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': (Date.now() + 60000).toString()
        }
      })

      const request = new NextRequest('http://localhost:3000/api/contact', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-forwarded-for': '127.0.0.1'
        },
        body: JSON.stringify(validContactData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(429)
      expect(data.error).toBe('Too many requests. Please try again later.')
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('0')
    })

    it('should validate request origin', async () => {
      checkRateLimit.mockResolvedValue({ success: true, headers: {} })
      validateOrigin.mockReturnValue(false)

      const request = new NextRequest('http://localhost:3000/api/contact', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'origin': 'http://malicious-site.com'
        },
        body: JSON.stringify(validContactData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Invalid request origin')
    })

    it('should validate CSRF token', async () => {
      checkRateLimit.mockResolvedValue({ success: true, headers: {} })
      validateOrigin.mockReturnValue(true)
      validateCSRFToken.mockReturnValue(false)

      const request = new NextRequest('http://localhost:3000/api/contact', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'origin': 'http://localhost:3000'
        },
        body: JSON.stringify(validContactData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Invalid CSRF token')
    })

    describe('Input Validation', () => {
      beforeEach(() => {
        checkRateLimit.mockResolvedValue({ success: true, headers: {} })
        validateOrigin.mockReturnValue(true)
        validateCSRFToken.mockReturnValue(true)
      })

      it('should validate required name field', async () => {
        const invalidData = { ...validContactData, name: '' }

        const request = new NextRequest('http://localhost:3000/api/contact', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'origin': 'http://localhost:3000'
          },
          body: JSON.stringify(invalidData)
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toContain('Name is required')
      })

      it('should validate email format', async () => {
        const invalidData = { ...validContactData, email: 'invalid-email' }

        const request = new NextRequest('http://localhost:3000/api/contact', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'origin': 'http://localhost:3000'
          },
          body: JSON.stringify(invalidData)
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toContain('Invalid email address')
      })

      it('should validate subject length', async () => {
        const invalidData = { 
          ...validContactData, 
          subject: 'A'.repeat(201) // Exceeds max length
        }

        const request = new NextRequest('http://localhost:3000/api/contact', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'origin': 'http://localhost:3000'
          },
          body: JSON.stringify(invalidData)
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toContain('Subject too long')
      })

      it('should validate message minimum length', async () => {
        const invalidData = { ...validContactData, message: 'Too short' }

        const request = new NextRequest('http://localhost:3000/api/contact', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'origin': 'http://localhost:3000'
          },
          body: JSON.stringify(invalidData)
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toContain('Message must be at least 10 characters')
      })

      it('should validate message maximum length', async () => {
        const invalidData = { 
          ...validContactData, 
          message: 'A'.repeat(1001) // Exceeds max length
        }

        const request = new NextRequest('http://localhost:3000/api/contact', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'origin': 'http://localhost:3000'
          },
          body: JSON.stringify(invalidData)
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toContain('Message too long')
      })

      it('should validate name maximum length', async () => {
        const invalidData = { 
          ...validContactData, 
          name: 'A'.repeat(101) // Exceeds max length
        }

        const request = new NextRequest('http://localhost:3000/api/contact', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'origin': 'http://localhost:3000'
          },
          body: JSON.stringify(invalidData)
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toContain('Name too long')
      })
    })

    it('should handle invalid JSON', async () => {
      checkRateLimit.mockResolvedValue({ success: true, headers: {} })
      validateOrigin.mockReturnValue(true)
      validateCSRFToken.mockReturnValue(true)

      const request = new NextRequest('http://localhost:3000/api/contact', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'origin': 'http://localhost:3000'
        },
        body: 'invalid json'
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid JSON in request body')
    })

    it('should handle missing content-type', async () => {
      checkRateLimit.mockResolvedValue({ success: true, headers: {} })
      validateOrigin.mockReturnValue(true)
      validateCSRFToken.mockReturnValue(true)

      const request = new NextRequest('http://localhost:3000/api/contact', {
        method: 'POST',
        headers: {
          'origin': 'http://localhost:3000'
        },
        body: JSON.stringify(validContactData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Content-Type must be application/json')
    })

    it('should handle storage errors', async () => {
      checkRateLimit.mockResolvedValue({ success: true, headers: {} })
      validateOrigin.mockReturnValue(true)
      validateCSRFToken.mockReturnValue(true)
      ContactStorage.saveContact.mockRejectedValue(new Error('Storage error'))

      const request = new NextRequest('http://localhost:3000/api/contact', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'origin': 'http://localhost:3000'
        },
        body: JSON.stringify(validContactData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to submit contact form')
    })

    it('should sanitize input data', async () => {
      const maliciousData = {
        name: 'John <script>alert("xss")</script> Doe',
        email: 'john@example.com',
        subject: 'Test Subject',
        message: 'Clean message content for testing purposes.'
      }

      checkRateLimit.mockResolvedValue({ success: true, headers: {} })
      validateOrigin.mockReturnValue(true)
      validateCSRFToken.mockReturnValue(true)
      ContactStorage.saveContact.mockResolvedValue({ id: 'contact123', ...maliciousData })

      const request = new NextRequest('http://localhost:3000/api/contact', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'origin': 'http://localhost:3000'
        },
        body: JSON.stringify(maliciousData)
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(ContactStorage.saveContact).toHaveBeenCalled()
    })

    it('should send notification on successful submission', async () => {
      checkRateLimit.mockResolvedValue({ success: true, headers: {} })
      validateOrigin.mockReturnValue(true)
      validateCSRFToken.mockReturnValue(true)
      ContactStorage.saveContact.mockResolvedValue({
        id: 'contact123',
        ...validContactData,
        createdAt: new Date()
      })
      NotificationService.sendContactNotification.mockResolvedValue(true)

      const request = new NextRequest('http://localhost:3000/api/contact', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'origin': 'http://localhost:3000'
        },
        body: JSON.stringify(validContactData)
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(NotificationService.sendContactNotification).toHaveBeenCalledWith(validContactData)
    })

    it('should handle notification errors gracefully', async () => {
      checkRateLimit.mockResolvedValue({ success: true, headers: {} })
      validateOrigin.mockReturnValue(true)
      validateCSRFToken.mockReturnValue(true)
      ContactStorage.saveContact.mockResolvedValue({
        id: 'contact123',
        ...validContactData
      })
      NotificationService.sendContactNotification.mockRejectedValue(new Error('Email error'))

      const request = new NextRequest('http://localhost:3000/api/contact', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'origin': 'http://localhost:3000'
        },
        body: JSON.stringify(validContactData)
      })

      const response = await POST(request)

      // Should still succeed even if notification fails
      expect(response.status).toBe(200)
    })

    it('should handle special characters in contact data', async () => {
      const specialCharData = {
        name: 'José María Ñuñez',
        email: 'jose@example.com',
        subject: 'Inquiry about "Special" Products & Services',
        message: 'Hello! I have questions about your products & services. Thanks!'
      }

      checkRateLimit.mockResolvedValue({ success: true, headers: {} })
      validateOrigin.mockReturnValue(true)
      validateCSRFToken.mockReturnValue(true)
      ContactStorage.saveContact.mockResolvedValue({
        id: 'contact123',
        ...specialCharData
      })

      const request = new NextRequest('http://localhost:3000/api/contact', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'origin': 'http://localhost:3000'
        },
        body: JSON.stringify(specialCharData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should handle different email formats', async () => {
      const testEmails = [
        'user@example.com',
        'user.name@example.com',
        'user+tag@example.co.uk',
        'user123@subdomain.example.org'
      ]

      for (const email of testEmails) {
        const testData = { ...validContactData, email }
        
        checkRateLimit.mockResolvedValue({ success: true, headers: {} })
        validateOrigin.mockReturnValue(true)
        validateCSRFToken.mockReturnValue(true)
        ContactStorage.saveContact.mockResolvedValue({ id: 'contact123', ...testData })

        const request = new NextRequest('http://localhost:3000/api/contact', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'origin': 'http://localhost:3000'
          },
          body: JSON.stringify(testData)
        })

        const response = await POST(request)
        expect(response.status).toBe(200)
      }
    })
  })
})
