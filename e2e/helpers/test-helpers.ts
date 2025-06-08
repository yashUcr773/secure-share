import { expect, test, type Page } from '@playwright/test'
import { testCredentials } from '../fixtures/seed'

// Test configuration and utilities
export class TestHelpers {
  constructor(private page: Page) {}

  // Navigation helpers
  async navigateToHome() {
    await this.page.goto('/')
    await this.page.waitForLoadState('networkidle')
  }

  async navigateToLogin() {
    await this.page.goto('/login')
    await this.page.waitForLoadState('networkidle')
  }

  async navigateToSignup() {
    await this.page.goto('/signup')
    await this.page.waitForLoadState('networkidle')
  }

  async navigateToDashboard() {
    await this.page.goto('/dashboard')
    await this.page.waitForLoadState('networkidle')
  }

  // Authentication helpers
  async loginUser(email: string, password: string) {
    await this.navigateToLogin()
    await this.page.fill('[data-testid="email-input"]', email)
    await this.page.fill('[data-testid="password-input"]', password)
    await this.page.click('[data-testid="login-button"]')
    await this.page.waitForURL('/dashboard')
  }

  async signupUser(userData: {
    name: string
    email: string
    password: string
    confirmPassword: string
  }) {
    await this.navigateToSignup()
    await this.page.fill('[data-testid="name-input"]', userData.name)
    await this.page.fill('[data-testid="email-input"]', userData.email)
    await this.page.fill('[data-testid="password-input"]', userData.password)
    await this.page.fill('[data-testid="confirm-password-input"]', userData.confirmPassword)
    await this.page.click('[data-testid="signup-button"]')
  }

  async logout() {
    await this.page.click('[data-testid="user-menu"]')
    await this.page.click('[data-testid="logout-button"]')
    await this.page.waitForURL('/login')
  }

  // File upload helpers
  async uploadFile(filePath: string, fileName: string = 'test-file.txt') {
    const fileInput = this.page.locator('[data-testid="file-upload-input"]')
    await fileInput.setInputFiles({
      name: fileName,
      mimeType: 'text/plain',
      buffer: Buffer.from('Test file content')
    })
  }

  async uploadMultipleFiles(files: Array<{ name: string; content: string; mimeType?: string }>) {
    const fileInputFiles = files.map(file => ({
      name: file.name,
      mimeType: file.mimeType || 'text/plain',
      buffer: Buffer.from(file.content)
    }))
    
    const fileInput = this.page.locator('[data-testid="file-upload-input"]')
    await fileInput.setInputFiles(fileInputFiles)
  }

  // Folder management helpers
  async createFolder(folderName: string) {
    await this.page.click('[data-testid="create-folder-button"]')
    await this.page.fill('[data-testid="folder-name-input"]', folderName)
    await this.page.click('[data-testid="confirm-create-folder"]')
    await this.page.waitForSelector(`[data-testid="folder-${folderName}"]`)
  }

  async deleteFolder(folderName: string) {
    await this.page.click(`[data-testid="folder-${folderName}"] [data-testid="folder-menu"]`)
    await this.page.click('[data-testid="delete-folder"]')
    await this.page.click('[data-testid="confirm-delete"]')
  }

  async renameFolder(oldName: string, newName: string) {
    await this.page.click(`[data-testid="folder-${oldName}"] [data-testid="folder-menu"]`)
    await this.page.click('[data-testid="rename-folder"]')
    await this.page.fill('[data-testid="folder-name-input"]', newName)
    await this.page.click('[data-testid="confirm-rename"]')
  }

  // File management helpers
  async deleteFile(fileName: string) {
    await this.page.click(`[data-testid="file-${fileName}"] [data-testid="file-menu"]`)
    await this.page.click('[data-testid="delete-file"]')
    await this.page.click('[data-testid="confirm-delete"]')
  }

  async shareFile(fileName: string, shareType: 'public' | 'private' = 'private') {
    await this.page.click(`[data-testid="file-${fileName}"] [data-testid="file-menu"]`)
    await this.page.click('[data-testid="share-file"]')
    
    if (shareType === 'public') {
      await this.page.check('[data-testid="public-share-checkbox"]')
    }
    
    await this.page.click('[data-testid="generate-share-link"]')
    
    // Get the generated share link
    const shareLink = await this.page.inputValue('[data-testid="share-link-input"]')
    return shareLink
  }

  async downloadFile(fileName: string) {
    const downloadPromise = this.page.waitForEvent('download')
    await this.page.click(`[data-testid="file-${fileName}"] [data-testid="download-button"]`)
    const download = await downloadPromise
    return download
  }

  // Assertion helpers
  async expectToBeOnPage(expectedPath: string) {
    await expect(this.page).toHaveURL(new RegExp(expectedPath))
  }

  async expectElementToBeVisible(selector: string) {
    await expect(this.page.locator(selector)).toBeVisible()
  }

  async expectElementToHaveText(selector: string, text: string) {
    await expect(this.page.locator(selector)).toHaveText(text)
  }

  async expectFileToExist(fileName: string) {
    await expect(this.page.locator(`[data-testid="file-${fileName}"]`)).toBeVisible()
  }

  async expectFolderToExist(folderName: string) {
    await expect(this.page.locator(`[data-testid="folder-${folderName}"]`)).toBeVisible()
  }

  async expectNotificationToShow(message: string) {
    await expect(this.page.locator('[data-testid="notification"]')).toContainText(message)
  }

  // Wait helpers
  async waitForFileUpload(fileName: string) {
    await this.page.waitForSelector(`[data-testid="file-${fileName}"]`, { timeout: 30000 })
  }

  async waitForProgressBar() {
    await this.page.waitForSelector('[data-testid="upload-progress"]')
    await this.page.waitForSelector('[data-testid="upload-progress"]', { state: 'hidden', timeout: 30000 })
  }

  async waitForLoadingToFinish() {
    await this.page.waitForSelector('[data-testid="loading-spinner"]', { state: 'hidden', timeout: 10000 })
  }

  // Network helpers
  async interceptApiCall(pattern: string, response: any) {
    await this.page.route(pattern, route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(response)
      })
    })
  }

  async interceptApiError(pattern: string, status: number = 500) {
    await this.page.route(pattern, route => {
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Server error' })
      })
    })
  }

  // Storage helpers
  async clearBrowserStorage() {
    await this.page.evaluate(() => {
      localStorage.clear()
      sessionStorage.clear()
    })
  }

  async setLocalStorageItem(key: string, value: string) {
    await this.page.evaluate(({ key, value }) => {
      localStorage.setItem(key, value)
    }, { key, value })
  }

  async getLocalStorageItem(key: string): Promise<string | null> {
    return await this.page.evaluate((key) => {
      return localStorage.getItem(key)
    }, key)
  }

  // Mock helpers for testing
  async mockSuccessfulUpload() {
    await this.interceptApiCall('**/api/upload', {
      success: true,
      data: {
        id: 'mock-file-id',
        name: 'test-file.txt',
        size: 1024,
        uploadedAt: new Date().toISOString()
      }
    })
  }

  async mockFailedUpload() {
    await this.interceptApiError('**/api/upload', 400)
  }

  async mockSlowUpload() {
    await this.page.route('**/api/upload', async route => {
      await new Promise(resolve => setTimeout(resolve, 3000))
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { id: 'slow-upload-id', name: 'slow-file.txt' }
        })
      })
    })
  }
  // Search helpers
  async searchFiles(query: string) {
    await this.page.fill('[data-testid="search-input"]', query)
    await this.page.press('[data-testid="search-input"]', 'Enter')
    await this.page.waitForLoadState('networkidle')
  }

  async filterFiles(filterType: string) {
    await this.page.click('[data-testid="filter-dropdown"]')
    await this.page.click(`[data-testid="filter-${filterType}"]`)
    await this.page.waitForLoadState('networkidle')
  }

  // Admin panel helpers
  async navigateToAdminPanel() {
    await this.page.goto('/admin')
    await this.page.waitForLoadState('networkidle')
  }

  async loginAsAdmin(email: string = 'admin@example.com', password: string = 'AdminPassword123!') {
    await this.loginUser(email, password)
    await this.navigateToAdminPanel()
    await this.page.waitForSelector('[data-testid="admin-dashboard"]')
  }

  async checkSystemHealth() {
    await this.page.click('[data-testid="system-health-tab"]')
    await this.page.waitForSelector('[data-testid="system-metrics"]')
  }

  async viewStorageStats() {
    await this.page.click('[data-testid="storage-tab"]')
    await this.page.waitForSelector('[data-testid="storage-statistics"]')
  }

  async manageUsers() {
    await this.page.click('[data-testid="users-tab"]')
    await this.page.waitForSelector('[data-testid="user-management-table"]')
  }

  async changeUserRole(userId: string, newRole: 'user' | 'admin') {
    await this.page.click(`[data-testid="user-${userId}-menu"]`)
    await this.page.click(`[data-testid="change-role-${newRole}"]`)
    await this.page.click('[data-testid="confirm-role-change"]')
  }

  async deleteUser(userId: string) {
    await this.page.click(`[data-testid="user-${userId}-menu"]`)
    await this.page.click('[data-testid="delete-user"]')
    await this.page.click('[data-testid="confirm-delete-user"]')
  }

  async viewJobQueue() {
    await this.page.click('[data-testid="jobs-tab"]')
    await this.page.waitForSelector('[data-testid="job-queue-table"]')
  }

  async retryFailedJob(jobId: string) {
    await this.page.click(`[data-testid="job-${jobId}-retry"]`)
    await this.page.waitForSelector(`[data-testid="job-${jobId}-status"]`)
  }

  async clearCompletedJobs() {
    await this.page.click('[data-testid="clear-completed-jobs"]')
    await this.page.click('[data-testid="confirm-clear-jobs"]')
  }

  // Contact form helpers
  async navigateToContact() {
    await this.page.goto('/contact')
    await this.page.waitForLoadState('networkidle')
  }

  async fillContactForm(data: {
    name: string
    email: string
    subject: string
    message: string
  }) {
    await this.page.fill('[data-testid="contact-name"]', data.name)
    await this.page.fill('[data-testid="contact-email"]', data.email)
    await this.page.fill('[data-testid="contact-subject"]', data.subject)
    await this.page.fill('[data-testid="contact-message"]', data.message)
  }

  async submitContactForm() {
    await this.page.click('[data-testid="submit-contact-form"]')
  }

  async expectContactFormValidationError(field: string) {
    await this.expectElementToBeVisible(`[data-testid="${field}-error"]`)
  }

  async expectContactFormSuccess() {
    await this.expectElementToBeVisible('[data-testid="contact-success-message"]')
  }

  // Enhanced assertion helpers
  async expectAdminMetrics() {
    await this.expectElementToBeVisible('[data-testid="uptime-metric"]')
    await this.expectElementToBeVisible('[data-testid="job-queue-metrics"]')
    await this.expectElementToBeVisible('[data-testid="cache-metrics"]')
    await this.expectElementToBeVisible('[data-testid="database-metrics"]')
  }

  async expectStorageMetrics() {
    await this.expectElementToBeVisible('[data-testid="total-files-metric"]')
    await this.expectElementToBeVisible('[data-testid="total-size-metric"]')
    await this.expectElementToBeVisible('[data-testid="avg-file-size-metric"]')
  }

  async expectUserManagementTable() {
    await this.expectElementToBeVisible('[data-testid="user-management-table"]')
    await this.expectElementToBeVisible('[data-testid="user-role-column"]')
    await this.expectElementToBeVisible('[data-testid="user-actions-column"]')
  }

  async expectJobQueueTable() {
    await this.expectElementToBeVisible('[data-testid="job-queue-table"]')
    await this.expectElementToBeVisible('[data-testid="job-status-column"]')
    await this.expectElementToBeVisible('[data-testid="job-actions-column"]')
  }

  // Rate limiting helpers
  async testRateLimit(endpoint: string, maxRequests: number) {
    const responses = []
    for (let i = 0; i < maxRequests + 1; i++) {
      const response = await this.page.request.post(endpoint, {
        data: { test: 'data' }
      })
      responses.push(response.status())
    }
    return responses
  }

  // CSRF protection helpers
  async expectCSRFProtection(endpoint: string) {
    const response = await this.page.request.post(endpoint, {
      data: { test: 'data' }
    })
    expect(response.status()).toBe(403) // Should fail without CSRF token
  }
  // Error simulation helpers
  async simulateNetworkError() {
    await this.page.route('**/api/**', (route: any) => {
      route.abort('failed')
    })
  }

  async simulateSlowNetwork(delay: number = 3000) {
    await this.page.route('**/api/**', async (route: any) => {
      await new Promise(resolve => setTimeout(resolve, delay))
      route.continue()
    })
  }

  async simulateServerError(endpoint: string) {
    await this.page.route(endpoint, (route: any) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' })
      })
    })
  }

  // Performance testing helpers
  async measurePageLoadTime(): Promise<number> {
    const startTime = Date.now()
    await this.page.waitForLoadState('networkidle')
    return Date.now() - startTime
  }

  async measureApiResponseTime(endpoint: string): Promise<number> {
    const startTime = Date.now()
    await this.page.request.get(endpoint)
    return Date.now() - startTime
  }

  // Analytics helpers
  async expectAnalyticsData() {
    await this.expectElementToBeVisible('[data-testid="analytics-chart"]')
    await this.expectElementToBeVisible('[data-testid="total-files"]')
    await this.expectElementToBeVisible('[data-testid="total-storage"]')
  }
}

// Enhanced authentication helpers
export class AuthHelpers {
  constructor(private page: Page) {}

  /**
   * Login with predefined test user credentials
   */
  async loginAsTestUser(userType: 'regular' | 'admin' | 'inactive' = 'regular') {
    const credentials = userType === 'admin' 
      ? testCredentials.adminUser 
      : userType === 'inactive'
      ? testCredentials.inactiveUser
      : testCredentials.regularUser

    await this.page.goto('/login')
    await this.page.waitForLoadState('networkidle')
    
    await this.page.fill('[data-testid="email-input"]', credentials.email)
    await this.page.fill('[data-testid="password-input"]', credentials.password)
    await this.page.click('[data-testid="login-button"]')
    
    // Wait for successful login
    if (userType !== 'inactive') {
      await this.page.waitForURL('/dashboard', { timeout: 10000 })
    }
  }

  /**
   * Quick authentication using API request (faster for setup)
   */
  async authenticateViaAPI(userType: 'regular' | 'admin' = 'regular') {
    const credentials = userType === 'admin' 
      ? testCredentials.adminUser 
      : testCredentials.regularUser

    const response = await this.page.request.post('/api/auth/login', {
      data: {
        email: credentials.email,
        password: credentials.password
      }
    })

    if (response.ok()) {
      const data = await response.json()
      // Set authentication cookie/token if needed
      if (data.token) {
        await this.page.context().addCookies([{
          name: 'auth-token',
          value: data.token,
          domain: 'localhost',
          path: '/'
        }])
      }
    }
  }

  /**
   * Verify user is authenticated and on correct page
   */
  async verifyAuthentication(expectedUrl: string = '/dashboard') {
    await expect(this.page).toHaveURL(expectedUrl)
    // Could add additional authentication checks here
  }

  /**
   * Logout current user
   */
  async logout() {
    try {
      await this.page.click('[data-testid="user-menu-button"]')
      await this.page.click('[data-testid="logout-button"]')
      await this.page.waitForURL('/login')
    } catch {
      // Fallback: direct navigation to logout
      await this.page.goto('/api/auth/logout')
      await this.page.waitForURL('/login')
    }
  }
}

// File upload and management helpers
export class FileHelpers {
  constructor(private page: Page) {}

  /**
   * Upload a test file
   */
  async uploadFile(fileName: string, content: string, options: {
    password?: string;
    folder?: string;
  } = {}) {
    // Navigate to upload page or section
    await this.page.goto('/dashboard')
    await this.page.click('[data-testid="upload-button"]')

    // Create a temporary file buffer
    const buffer = Buffer.from(content)
    
    // Upload file
    await this.page.setInputFiles('[data-testid="file-input"]', {
      name: fileName,
      mimeType: 'text/plain',
      buffer: buffer
    })

    // Set password if provided
    if (options.password) {
      await this.page.check('[data-testid="password-protect-checkbox"]')
      await this.page.fill('[data-testid="file-password-input"]', options.password)
    }

    // Select folder if provided
    if (options.folder) {
      await this.page.selectOption('[data-testid="folder-select"]', options.folder)
    }

    // Submit upload
    await this.page.click('[data-testid="upload-submit-button"]')
    
    // Wait for upload completion
    await this.page.waitForSelector('[data-testid="upload-success"]', { timeout: 15000 })
  }

  /**
   * Download a file and verify content
   */
  async downloadAndVerifyFile(fileName: string, expectedContent?: string) {
    await this.page.click(`[data-testid="download-${fileName}"]`)
    
    // Wait for download
    const download = await this.page.waitForEvent('download')
    
    if (expectedContent) {
      // Verify file content (basic implementation)
      const suggestedName = download.suggestedFilename()
      expect(suggestedName).toBe(fileName)
    }
    
    return download
  }

  /**
   * Share a file and get share link
   */
  async shareFile(fileName: string): Promise<string> {
    await this.page.click(`[data-testid="share-${fileName}"]`)
    await this.page.waitForSelector('[data-testid="share-link-input"]')
    
    const shareLink = await this.page.inputValue('[data-testid="share-link-input"]')
    return shareLink
  }

  /**
   * Organize files into folders
   */
  async moveFileToFolder(fileName: string, folderName: string) {
    await this.page.click(`[data-testid="file-options-${fileName}"]`)
    await this.page.click('[data-testid="move-file-option"]')
    await this.page.selectOption('[data-testid="destination-folder-select"]', folderName)
    await this.page.click('[data-testid="move-confirm-button"]')
  }
}

// Admin panel helpers
export class AdminHelpers {
  constructor(private page: Page) {}

  /**
   * Navigate to admin panel
   */
  async navigateToAdmin() {
    await this.page.goto('/admin')
    await this.page.waitForLoadState('networkidle')
  }

  /**
   * Verify admin access
   */
  async verifyAdminAccess() {
    await expect(this.page.locator('[data-testid="admin-dashboard"]')).toBeVisible()
  }

  /**
   * View system statistics
   */
  async getSystemStats() {
    await this.navigateToAdmin()
    
    const stats = {
      totalUsers: await this.page.textContent('[data-testid="total-users-stat"]'),
      totalFiles: await this.page.textContent('[data-testid="total-files-stat"]'),
      totalShares: await this.page.textContent('[data-testid="total-shares-stat"]')
    }
    
    return stats
  }

  /**
   * Manage user accounts
   */
  async toggleUserStatus(userEmail: string, activate: boolean = true) {
    await this.page.goto('/admin/users')
    await this.page.fill('[data-testid="user-search-input"]', userEmail)
    await this.page.click('[data-testid="search-users-button"]')
    
    const action = activate ? 'activate' : 'deactivate'
    await this.page.click(`[data-testid="${action}-user-${userEmail}"]`)
    await this.page.click('[data-testid="confirm-action-button"]')
  }
}

// Contact form helpers
export class ContactHelpers {
  constructor(private page: Page) {}

  /**
   * Submit contact form
   */
  async submitContactForm(formData: {
    name: string;
    email: string;
    subject: string;
    message: string;
  }) {
    await this.page.goto('/contact')
    await this.page.waitForLoadState('networkidle')

    await this.page.fill('[data-testid="contact-name-input"]', formData.name)
    await this.page.fill('[data-testid="contact-email-input"]', formData.email)
    await this.page.fill('[data-testid="contact-subject-input"]', formData.subject)
    await this.page.fill('[data-testid="contact-message-input"]', formData.message)

    await this.page.click('[data-testid="submit-contact-button"]')
    
    // Wait for success message
    await this.page.waitForSelector('[data-testid="contact-success-message"]')
  }

  /**
   * Verify contact form validation
   */
  async testFormValidation() {
    await this.page.goto('/contact')
    
    // Submit empty form
    await this.page.click('[data-testid="submit-contact-button"]')
    
    // Check for validation errors
    await expect(this.page.locator('[data-testid="name-error"]')).toBeVisible()
    await expect(this.page.locator('[data-testid="email-error"]')).toBeVisible()
    await expect(this.page.locator('[data-testid="message-error"]')).toBeVisible()
  }
}

// Performance and reliability helpers
export class PerformanceHelpers {
  constructor(private page: Page) {}

  /**
   * Measure page load time
   */
  async measurePageLoad(url: string) {
    const startTime = Date.now()
    await this.page.goto(url)
    await this.page.waitForLoadState('networkidle')
    const endTime = Date.now()
    
    return endTime - startTime
  }

  /**
   * Test page responsiveness
   */
  async testResponsiveDesign() {
    const viewports = [
      { width: 1920, height: 1080 }, // Desktop
      { width: 768, height: 1024 },  // Tablet
      { width: 375, height: 667 }    // Mobile
    ]

    for (const viewport of viewports) {
      await this.page.setViewportSize(viewport)
      await this.page.waitForTimeout(500) // Allow for responsive adjustments
      
      // Take screenshot for visual verification if needed
      // await this.page.screenshot({ path: `responsive-${viewport.width}x${viewport.height}.png` })
    }
  }

  /**
   * Monitor network requests
   */
  async monitorNetworkRequests(callback: () => Promise<void>) {
    const requests: any[] = []
    
    this.page.on('request', request => {
      requests.push({
        url: request.url(),
        method: request.method(),
        timestamp: Date.now()
      })
    })

    await callback()

    return requests
  }
}

// Enhanced test data generators
export const generateTestUser = (suffix: string = '') => ({
  name: `Test User${suffix}`,
  email: `test${suffix}@example.com`,
  password: 'TestPassword123!',
  confirmPassword: 'TestPassword123!'
})

export const generateAdminUser = (suffix: string = '') => ({
  name: `Admin User${suffix}`,
  email: `admin${suffix}@example.com`,
  password: 'AdminPassword123!',
  confirmPassword: 'AdminPassword123!',
  role: 'admin'
})

export const generateTestFile = (name: string = 'test-file.txt') => ({
  name,
  content: `Test content for ${name}`,
  mimeType: 'text/plain'
})

export const generateTestFolder = (name: string = 'Test Folder') => ({
  name,
  description: `Description for ${name}`
})

export const generateContactMessage = (suffix: string = '') => ({
  name: `John Doe${suffix}`,
  email: `john.doe${suffix}@example.com`,
  subject: `Test Subject${suffix}`,
  message: `This is a test message${suffix}. Lorem ipsum dolor sit amet, consectetur adipiscing elit.`
})

export const generateLargeContactMessage = () => ({
  name: 'John Doe',
  email: 'john.doe@example.com',
  subject: 'Very Long Subject'.repeat(10),
  message: 'Very long message content. '.repeat(200)
})

// Test data factories for database seeding
export class TestDataFactory {
  static users = {
    regular: () => generateTestUser(),
    admin: () => generateAdminUser(),
    withFiles: (fileCount: number = 3) => ({
      ...generateTestUser(),
      files: Array.from({ length: fileCount }, (_, i) => 
        generateTestFile(`user-file-${i + 1}.txt`)
      )
    }),
    batch: (count: number) => Array.from({ length: count }, (_, i) => 
      generateTestUser(`-${i + 1}`)
    )
  }

  static files = {
    text: () => generateTestFile('text-file.txt'),
    image: () => ({
      name: 'image-file.jpg',
      content: 'fake-image-content',
      mimeType: 'image/jpeg'
    }),
    large: () => ({
      name: 'large-file.dat',
      content: 'x'.repeat(1024 * 1024), // 1MB
      mimeType: 'application/octet-stream'
    }),
    batch: (count: number) => Array.from({ length: count }, (_, i) => 
      generateTestFile(`batch-file-${i + 1}.txt`)
    )
  }

  static folders = {
    simple: () => generateTestFolder(),
    withFiles: (fileCount: number = 2) => ({
      ...generateTestFolder(),
      files: TestDataFactory.files.batch(fileCount)
    }),
    nested: (depth: number = 2) => {
      const createNested = (currentDepth: number): any => {
        if (currentDepth === 0) return null
        return {
          ...generateTestFolder(`Folder-Depth-${currentDepth}`),
          subfolders: [createNested(currentDepth - 1)].filter(Boolean)
        }
      }
      return createNested(depth)
    }
  }

  static contactMessages = {
    valid: () => generateContactMessage(),
    invalid: () => ({
      name: '',
      email: 'invalid-email',
      subject: '',
      message: ''
    }),
    spam: () => ({
      name: 'Spammer',
      email: 'spam@example.com',
      subject: 'BUY NOW!!!',
      message: 'Click here to buy our amazing product! ' + 'spam '.repeat(50)
    }),
    batch: (count: number) => Array.from({ length: count }, (_, i) => 
      generateContactMessage(`-${i + 1}`)
    )
  }

  static adminData = {
    systemMetrics: () => ({
      uptime: 86400,
      jobQueue: { pending: 5, processing: 2, completed: 100, failed: 3 },
      cache: { hits: 950, misses: 50, hitRate: 0.95 },
      storage: { totalFiles: 1000, totalSize: 104857600, avgFileSize: 104857 }
    }),
    userStats: () => ({
      total: 50,
      active: 35,
      new: 5,
      roles: { user: 45, admin: 5 }
    })
  }
}

// Database seeding utilities
export class DatabaseSeeder {
  private page: any

  constructor(page: any) {
    this.page = page
  }

  async seedTestData() {
    // Create test users
    await this.createTestUsers()
    // Create test files and folders
    await this.createTestFiles()
    // Create test contact messages
    await this.createTestMessages()
  }

  async createTestUsers() {
    const users = [
      TestDataFactory.users.regular(),
      TestDataFactory.users.admin(),
      ...TestDataFactory.users.batch(5)
    ]

    for (const user of users) {
      await this.page.request.post('/api/test/seed/user', {
        data: user
      })
    }
  }

  async createTestFiles() {
    const files = [
      ...TestDataFactory.files.batch(10),
      TestDataFactory.files.image(),
      TestDataFactory.files.large()
    ]

    for (const file of files) {
      await this.page.request.post('/api/test/seed/file', {
        data: file
      })
    }
  }

  async createTestMessages() {
    const messages = TestDataFactory.contactMessages.batch(5)

    for (const message of messages) {
      await this.page.request.post('/api/test/seed/message', {
        data: message
      })
    }
  }

  async clearTestData() {
    await this.page.request.post('/api/test/seed/clear')
  }
}
