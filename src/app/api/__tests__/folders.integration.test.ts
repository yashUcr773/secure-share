import { NextRequest } from 'next/server'
import { createMocks } from 'node-mocks-http'
import { GET, POST, PUT, DELETE } from '../folders/route'

// Mock all dependencies
jest.mock('@/lib/database', () => ({
  FolderService: {
    getFolders: jest.fn(),
    createFolder: jest.fn(),
    updateFolder: jest.fn(),
    deleteFolder: jest.fn(),
    getSharedFolders: jest.fn()
  },
  RateLimitService: {
    checkRateLimit: jest.fn()
  }
}))

jest.mock('@/lib/auth-enhanced', () => ({
  AuthService: {
    validateToken: jest.fn(),
    getUserFromToken: jest.fn()
  }
}))

jest.mock('@/lib/security', () => ({
  addSecurityHeaders: jest.fn((response) => response),
  validateOrigin: jest.fn(() => true),
  handleCORSPreflight: jest.fn(() => null),
  sanitizeInput: jest.fn((input) => input)
}))

jest.mock('@/lib/cache', () => ({
  CacheService: {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    clear: jest.fn()
  }
}))

jest.mock('@/lib/compression', () => ({
  CompressionService: {
    compress: jest.fn(),
    decompress: jest.fn()
  }
}))

jest.mock('@/lib/cdn', () => ({
  CDNService: {
    invalidate: jest.fn()
  }
}))

jest.mock('@/lib/job-queue', () => ({
  jobQueue: {
    add: jest.fn()
  }
}))

const { FolderService, RateLimitService } = require('@/lib/database')
const { AuthService } = require('@/lib/auth-enhanced')
const { CacheService } = require('@/lib/cache')

describe('/api/folders Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/folders', () => {
    it('should get user folders successfully', async () => {
      // Setup mocks
      RateLimitService.checkRateLimit.mockResolvedValue({ allowed: true })
      AuthService.validateToken.mockResolvedValue(true)
      AuthService.getUserFromToken.mockResolvedValue({ id: 'user123', email: 'test@example.com' })
      CacheService.get.mockResolvedValue(null)
      FolderService.getFolders.mockResolvedValue([
        { id: 'folder1', name: 'Documents', parentId: null, createdAt: new Date() },
        { id: 'folder2', name: 'Images', parentId: null, createdAt: new Date() }
      ])

      const request = new NextRequest('http://localhost:3000/api/folders', {
        headers: {
          'authorization': 'Bearer valid-token',
          'x-forwarded-for': '127.0.0.1'
        }
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toHaveLength(2)
      expect(data.data[0].name).toBe('Documents')
      expect(FolderService.getFolders).toHaveBeenCalledWith('user123', expect.any(Object))
    })

    it('should handle rate limiting', async () => {
      RateLimitService.checkRateLimit.mockResolvedValue({ 
        allowed: false, 
        resetTime: Date.now() + 60000 
      })

      const request = new NextRequest('http://localhost:3000/api/folders', {
        headers: { 'x-forwarded-for': '127.0.0.1' }
      })

      const response = await GET(request)

      expect(response.status).toBe(429)
    })

    it('should handle authentication failure', async () => {
      RateLimitService.checkRateLimit.mockResolvedValue({ allowed: true })
      AuthService.validateToken.mockResolvedValue(false)

      const request = new NextRequest('http://localhost:3000/api/folders', {
        headers: {
          'authorization': 'Bearer invalid-token',
          'x-forwarded-for': '127.0.0.1'
        }
      })

      const response = await GET(request)

      expect(response.status).toBe(401)
    })

    it('should return cached data when available', async () => {
      const cachedFolders = [{ id: 'cached1', name: 'Cached Folder' }]
      
      RateLimitService.checkRateLimit.mockResolvedValue({ allowed: true })
      AuthService.validateToken.mockResolvedValue(true)
      AuthService.getUserFromToken.mockResolvedValue({ id: 'user123' })
      CacheService.get.mockResolvedValue(JSON.stringify(cachedFolders))

      const request = new NextRequest('http://localhost:3000/api/folders', {
        headers: {
          'authorization': 'Bearer valid-token',
          'x-forwarded-for': '127.0.0.1'
        }
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data).toEqual(cachedFolders)
      expect(FolderService.getFolders).not.toHaveBeenCalled()
    })

    it('should handle folder service errors', async () => {
      RateLimitService.checkRateLimit.mockResolvedValue({ allowed: true })
      AuthService.validateToken.mockResolvedValue(true)
      AuthService.getUserFromToken.mockResolvedValue({ id: 'user123' })
      CacheService.get.mockResolvedValue(null)
      FolderService.getFolders.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost:3000/api/folders', {
        headers: {
          'authorization': 'Bearer valid-token',
          'x-forwarded-for': '127.0.0.1'
        }
      })

      const response = await GET(request)

      expect(response.status).toBe(500)
    })
  })

  describe('POST /api/folders', () => {
    it('should create folder successfully', async () => {
      const newFolder = { name: 'New Folder', parentId: null }
      const createdFolder = { 
        id: 'folder123', 
        ...newFolder, 
        userId: 'user123',
        createdAt: new Date() 
      }

      RateLimitService.checkRateLimit.mockResolvedValue({ allowed: true })
      AuthService.validateToken.mockResolvedValue(true)
      AuthService.getUserFromToken.mockResolvedValue({ id: 'user123' })
      FolderService.createFolder.mockResolvedValue(createdFolder)

      const request = new NextRequest('http://localhost:3000/api/folders', {
        method: 'POST',
        headers: {
          'authorization': 'Bearer valid-token',
          'content-type': 'application/json',
          'x-forwarded-for': '127.0.0.1'
        },
        body: JSON.stringify(newFolder)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.data.name).toBe('New Folder')
      expect(FolderService.createFolder).toHaveBeenCalledWith({
        name: 'New Folder',
        parentId: null,
        userId: 'user123'
      })
    })

    it('should validate folder name length', async () => {
      RateLimitService.checkRateLimit.mockResolvedValue({ allowed: true })
      AuthService.validateToken.mockResolvedValue(true)
      AuthService.getUserFromToken.mockResolvedValue({ id: 'user123' })

      const request = new NextRequest('http://localhost:3000/api/folders', {
        method: 'POST',
        headers: {
          'authorization': 'Bearer valid-token',
          'content-type': 'application/json',
          'x-forwarded-for': '127.0.0.1'
        },
        body: JSON.stringify({ name: '' })
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
    })

    it('should handle folder creation with parent', async () => {
      const newFolder = { name: 'Subfolder', parentId: 'parent123' }
      const createdFolder = { 
        id: 'folder456', 
        ...newFolder, 
        userId: 'user123',
        createdAt: new Date() 
      }

      RateLimitService.checkRateLimit.mockResolvedValue({ allowed: true })
      AuthService.validateToken.mockResolvedValue(true)
      AuthService.getUserFromToken.mockResolvedValue({ id: 'user123' })
      FolderService.createFolder.mockResolvedValue(createdFolder)

      const request = new NextRequest('http://localhost:3000/api/folders', {
        method: 'POST',
        headers: {
          'authorization': 'Bearer valid-token',
          'content-type': 'application/json',
          'x-forwarded-for': '127.0.0.1'
        },
        body: JSON.stringify(newFolder)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.data.parentId).toBe('parent123')
      expect(FolderService.createFolder).toHaveBeenCalledWith({
        name: 'Subfolder',
        parentId: 'parent123',
        userId: 'user123'
      })
    })

    it('should handle duplicate folder names', async () => {
      RateLimitService.checkRateLimit.mockResolvedValue({ allowed: true })
      AuthService.validateToken.mockResolvedValue(true)
      AuthService.getUserFromToken.mockResolvedValue({ id: 'user123' })
      FolderService.createFolder.mockRejectedValue(new Error('Folder already exists'))

      const request = new NextRequest('http://localhost:3000/api/folders', {
        method: 'POST',
        headers: {
          'authorization': 'Bearer valid-token',
          'content-type': 'application/json',
          'x-forwarded-for': '127.0.0.1'
        },
        body: JSON.stringify({ name: 'Existing Folder' })
      })

      const response = await POST(request)

      expect(response.status).toBe(500)
    })

    it('should handle invalid JSON', async () => {
      RateLimitService.checkRateLimit.mockResolvedValue({ allowed: true })
      AuthService.validateToken.mockResolvedValue(true)

      const request = new NextRequest('http://localhost:3000/api/folders', {
        method: 'POST',
        headers: {
          'authorization': 'Bearer valid-token',
          'content-type': 'application/json',
          'x-forwarded-for': '127.0.0.1'
        },
        body: 'invalid json'
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
    })
  })

  describe('PUT /api/folders', () => {
    it('should update folder successfully', async () => {
      const updateData = { id: 'folder123', name: 'Updated Folder' }
      const updatedFolder = { ...updateData, userId: 'user123', updatedAt: new Date() }

      RateLimitService.checkRateLimit.mockResolvedValue({ allowed: true })
      AuthService.validateToken.mockResolvedValue(true)
      AuthService.getUserFromToken.mockResolvedValue({ id: 'user123' })
      FolderService.updateFolder.mockResolvedValue(updatedFolder)

      const request = new NextRequest('http://localhost:3000/api/folders', {
        method: 'PUT',
        headers: {
          'authorization': 'Bearer valid-token',
          'content-type': 'application/json',
          'x-forwarded-for': '127.0.0.1'
        },
        body: JSON.stringify(updateData)
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.name).toBe('Updated Folder')
      expect(FolderService.updateFolder).toHaveBeenCalledWith('folder123', updateData, 'user123')
    })

    it('should handle non-existent folder update', async () => {
      RateLimitService.checkRateLimit.mockResolvedValue({ allowed: true })
      AuthService.validateToken.mockResolvedValue(true)
      AuthService.getUserFromToken.mockResolvedValue({ id: 'user123' })
      FolderService.updateFolder.mockRejectedValue(new Error('Folder not found'))

      const request = new NextRequest('http://localhost:3000/api/folders', {
        method: 'PUT',
        headers: {
          'authorization': 'Bearer valid-token',
          'content-type': 'application/json',
          'x-forwarded-for': '127.0.0.1'
        },
        body: JSON.stringify({ id: 'nonexistent', name: 'Updated' })
      })

      const response = await PUT(request)

      expect(response.status).toBe(500)
    })
  })

  describe('DELETE /api/folders', () => {
    it('should delete folder successfully', async () => {
      RateLimitService.checkRateLimit.mockResolvedValue({ allowed: true })
      AuthService.validateToken.mockResolvedValue(true)
      AuthService.getUserFromToken.mockResolvedValue({ id: 'user123' })
      FolderService.deleteFolder.mockResolvedValue(true)

      const request = new NextRequest('http://localhost:3000/api/folders?id=folder123', {
        method: 'DELETE',
        headers: {
          'authorization': 'Bearer valid-token',
          'x-forwarded-for': '127.0.0.1'
        }
      })

      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(FolderService.deleteFolder).toHaveBeenCalledWith('folder123', 'user123')
    })

    it('should handle missing folder ID', async () => {
      RateLimitService.checkRateLimit.mockResolvedValue({ allowed: true })
      AuthService.validateToken.mockResolvedValue(true)

      const request = new NextRequest('http://localhost:3000/api/folders', {
        method: 'DELETE',
        headers: {
          'authorization': 'Bearer valid-token',
          'x-forwarded-for': '127.0.0.1'
        }
      })

      const response = await DELETE(request)

      expect(response.status).toBe(400)
    })

    it('should handle folder deletion with children', async () => {
      RateLimitService.checkRateLimit.mockResolvedValue({ allowed: true })
      AuthService.validateToken.mockResolvedValue(true)
      AuthService.getUserFromToken.mockResolvedValue({ id: 'user123' })
      FolderService.deleteFolder.mockRejectedValue(new Error('Folder contains files'))

      const request = new NextRequest('http://localhost:3000/api/folders?id=folder123', {
        method: 'DELETE',
        headers: {
          'authorization': 'Bearer valid-token',
          'x-forwarded-for': '127.0.0.1'
        }
      })

      const response = await DELETE(request)

      expect(response.status).toBe(500)
    })

    it('should handle forced deletion', async () => {
      RateLimitService.checkRateLimit.mockResolvedValue({ allowed: true })
      AuthService.validateToken.mockResolvedValue(true)
      AuthService.getUserFromToken.mockResolvedValue({ id: 'user123' })
      FolderService.deleteFolder.mockResolvedValue(true)

      const request = new NextRequest('http://localhost:3000/api/folders?id=folder123&force=true', {
        method: 'DELETE',
        headers: {
          'authorization': 'Bearer valid-token',
          'x-forwarded-for': '127.0.0.1'
        }
      })

      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(FolderService.deleteFolder).toHaveBeenCalledWith('folder123', 'user123', { force: true })
    })
  })

  describe('Error Handling', () => {
    it('should handle network timeouts', async () => {
      RateLimitService.checkRateLimit.mockResolvedValue({ allowed: true })
      AuthService.validateToken.mockResolvedValue(true)
      AuthService.getUserFromToken.mockResolvedValue({ id: 'user123' })
      FolderService.getFolders.mockImplementation(() => 
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 100))
      )

      const request = new NextRequest('http://localhost:3000/api/folders', {
        headers: {
          'authorization': 'Bearer valid-token',
          'x-forwarded-for': '127.0.0.1'
        }
      })

      const response = await GET(request)

      expect(response.status).toBe(500)
    })

    it('should handle malformed authorization header', async () => {
      RateLimitService.checkRateLimit.mockResolvedValue({ allowed: true })

      const request = new NextRequest('http://localhost:3000/api/folders', {
        headers: {
          'authorization': 'Invalid header format',
          'x-forwarded-for': '127.0.0.1'
        }
      })

      const response = await GET(request)

      expect(response.status).toBe(401)
    })

    it('should handle missing content-type for POST', async () => {
      RateLimitService.checkRateLimit.mockResolvedValue({ allowed: true })
      AuthService.validateToken.mockResolvedValue(true)

      const request = new NextRequest('http://localhost:3000/api/folders', {
        method: 'POST',
        headers: {
          'authorization': 'Bearer valid-token',
          'x-forwarded-for': '127.0.0.1'
        },
        body: JSON.stringify({ name: 'Test Folder' })
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
    })
  })

  describe('Cache Invalidation', () => {
    it('should invalidate cache after folder creation', async () => {
      const newFolder = { name: 'New Folder', parentId: null }
      const createdFolder = { id: 'folder123', ...newFolder, userId: 'user123' }

      RateLimitService.checkRateLimit.mockResolvedValue({ allowed: true })
      AuthService.validateToken.mockResolvedValue(true)
      AuthService.getUserFromToken.mockResolvedValue({ id: 'user123' })
      FolderService.createFolder.mockResolvedValue(createdFolder)

      const request = new NextRequest('http://localhost:3000/api/folders', {
        method: 'POST',
        headers: {
          'authorization': 'Bearer valid-token',
          'content-type': 'application/json',
          'x-forwarded-for': '127.0.0.1'
        },
        body: JSON.stringify(newFolder)
      })

      await POST(request)

      expect(CacheService.delete).toHaveBeenCalledWith('folders:user123')
    })

    it('should invalidate cache after folder update', async () => {
      const updateData = { id: 'folder123', name: 'Updated Folder' }

      RateLimitService.checkRateLimit.mockResolvedValue({ allowed: true })
      AuthService.validateToken.mockResolvedValue(true)
      AuthService.getUserFromToken.mockResolvedValue({ id: 'user123' })
      FolderService.updateFolder.mockResolvedValue(updateData)

      const request = new NextRequest('http://localhost:3000/api/folders', {
        method: 'PUT',
        headers: {
          'authorization': 'Bearer valid-token',
          'content-type': 'application/json',
          'x-forwarded-for': '127.0.0.1'
        },
        body: JSON.stringify(updateData)
      })

      await PUT(request)

      expect(CacheService.delete).toHaveBeenCalledWith('folders:user123')
    })
  })
})
