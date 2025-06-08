import { test, expect } from '@playwright/test'
import { TestHelpers, TestDataFactory } from '../helpers/test-helpers'
import { setupTestEnvironment, teardownTestEnvironment } from '../fixtures/seed'

test.describe('Contact Form E2E Tests', () => {
  let helpers: TestHelpers

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page)
    await helpers.clearBrowserStorage()
    await setupTestEnvironment(page, { seedData: true, clearFirst: true, minimal: true })
  })

  test.afterEach(async ({ page }) => {
    await teardownTestEnvironment(page)
  })

  test.describe('Contact Form Display', () => {
    test('should display contact form with all required fields', async ({ page }) => {
      await helpers.navigateToContact()
      
      // Verify form fields are present
      await helpers.expectElementToBeVisible('[data-testid="contact-name"]')
      await helpers.expectElementToBeVisible('[data-testid="contact-email"]')
      await helpers.expectElementToBeVisible('[data-testid="contact-subject"]')
      await helpers.expectElementToBeVisible('[data-testid="contact-message"]')
      await helpers.expectElementToBeVisible('[data-testid="submit-contact-form"]')
      
      // Verify contact information is displayed
      await helpers.expectElementToBeVisible('[data-testid="contact-info"]')
      await helpers.expectElementToBeVisible('[data-testid="contact-email-info"]')
      await helpers.expectElementToBeVisible('[data-testid="contact-phone-info"]')
    })

    test('should show proper form labels and placeholders', async ({ page }) => {
      await helpers.navigateToContact()
      
      // Check form labels
      await helpers.expectElementToHaveText('[data-testid="name-label"]', 'Full Name')
      await helpers.expectElementToHaveText('[data-testid="email-label"]', 'Email Address')
      await helpers.expectElementToHaveText('[data-testid="subject-label"]', 'Subject')
      await helpers.expectElementToHaveText('[data-testid="message-label"]', 'Message')
      
      // Check placeholders
      await expect(page.locator('[data-testid="contact-name"]')).toHaveAttribute('placeholder', 'Enter your full name')
      await expect(page.locator('[data-testid="contact-email"]')).toHaveAttribute('placeholder', 'Enter your email address')
      await expect(page.locator('[data-testid="contact-subject"]')).toHaveAttribute('placeholder', 'Enter the subject')
      await expect(page.locator('[data-testid="contact-message"]')).toHaveAttribute('placeholder', 'Enter your message')
    })

    test('should be accessible and properly structured', async ({ page }) => {
      await helpers.navigateToContact()
      
      // Check form accessibility
      await expect(page.locator('form')).toHaveAttribute('role', 'form')
      await expect(page.locator('[data-testid="contact-name"]')).toHaveAttribute('required')
      await expect(page.locator('[data-testid="contact-email"]')).toHaveAttribute('required')
      await expect(page.locator('[data-testid="contact-subject"]')).toHaveAttribute('required')
      await expect(page.locator('[data-testid="contact-message"]')).toHaveAttribute('required')
    })
  })

  test.describe('Form Validation', () => {
    test('should validate required fields', async ({ page }) => {
      await helpers.navigateToContact()
      
      // Try to submit empty form
      await helpers.submitContactForm()
      
      // Verify validation errors appear
      await helpers.expectContactFormValidationError('contact-name')
      await helpers.expectContactFormValidationError('contact-email')
      await helpers.expectContactFormValidationError('contact-subject')
      await helpers.expectContactFormValidationError('contact-message')
    })

    test('should validate email format', async ({ page }) => {
      await helpers.navigateToContact()
      
      // Fill form with invalid email
      const invalidData = {
        name: 'John Doe',
        email: 'invalid-email',
        subject: 'Test Subject',
        message: 'Test message'
      }
      
      await helpers.fillContactForm(invalidData)
      await helpers.submitContactForm()
      
      // Verify email validation error
      await helpers.expectContactFormValidationError('contact-email')
      await helpers.expectElementToHaveText(
        '[data-testid="contact-email-error"]',
        'Please enter a valid email address'
      )
    })

    test('should validate minimum message length', async ({ page }) => {
      await helpers.navigateToContact()
      
      // Fill form with short message
      const shortMessageData = {
        name: 'John Doe',
        email: 'john@example.com',
        subject: 'Test Subject',
        message: 'Hi'
      }
      
      await helpers.fillContactForm(shortMessageData)
      await helpers.submitContactForm()
      
      // Verify message length validation
      await helpers.expectContactFormValidationError('contact-message')
      await helpers.expectElementToHaveText(
        '[data-testid="contact-message-error"]',
        'Message must be at least 10 characters long'
      )
    })

    test('should validate maximum field lengths', async ({ page }) => {
      await helpers.navigateToContact()
      
      // Fill form with overly long content
      const longData = TestDataFactory.contactMessages.invalid()
      longData.name = 'A'.repeat(101) // Assuming 100 char limit
      longData.subject = 'B'.repeat(201) // Assuming 200 char limit
      longData.message = 'C'.repeat(2001) // Assuming 2000 char limit
      longData.email = 'valid@example.com'
      
      await helpers.fillContactForm(longData)
      await helpers.submitContactForm()
      
      // Verify length validation errors
      await helpers.expectContactFormValidationError('contact-name')
      await helpers.expectContactFormValidationError('contact-subject')
      await helpers.expectContactFormValidationError('contact-message')
    })

    test('should show character count for message field', async ({ page }) => {
      await helpers.navigateToContact()
      
      const message = 'This is a test message'
      await page.fill('[data-testid="contact-message"]', message)
      
      // Verify character count is displayed
      await helpers.expectElementToBeVisible('[data-testid="message-char-count"]')
      await helpers.expectElementToHaveText(
        '[data-testid="message-char-count"]',
        `${message.length}/2000`
      )
    })
  })

  test.describe('Form Submission', () => {
    test('should successfully submit valid contact form', async ({ page }) => {
      await helpers.navigateToContact()
      
      const validData = TestDataFactory.contactMessages.valid()
      await helpers.fillContactForm(validData)
      await helpers.submitContactForm()
      
      // Verify success message
      await helpers.expectContactFormSuccess()
      await helpers.expectNotificationToShow('Message sent successfully!')
      
      // Verify form is cleared or shows success state
      await helpers.expectElementToBeVisible('[data-testid="contact-success-state"]')
    })

    test('should show loading state during submission', async ({ page }) => {
      await helpers.navigateToContact()
      
      // Simulate slow network
      await helpers.simulateSlowNetwork(2000)
      
      const validData = TestDataFactory.contactMessages.valid()
      await helpers.fillContactForm(validData)
      await helpers.submitContactForm()
      
      // Verify loading state
      await helpers.expectElementToBeVisible('[data-testid="submit-loading"]')
      await expect(page.locator('[data-testid="submit-contact-form"]')).toBeDisabled()
      
      // Wait for completion
      await helpers.waitForLoadingToFinish()
      await helpers.expectContactFormSuccess()
    })

    test('should handle server errors gracefully', async ({ page }) => {
      await helpers.navigateToContact()
      
      // Simulate server error
      await helpers.simulateServerError('/api/contact')
      
      const validData = TestDataFactory.contactMessages.valid()
      await helpers.fillContactForm(validData)
      await helpers.submitContactForm()
      
      // Verify error handling
      await helpers.expectElementToBeVisible('[data-testid="contact-error-message"]')
      await helpers.expectNotificationToShow('Failed to send message')
      
      // Verify form remains filled for retry
      await expect(page.locator('[data-testid="contact-name"]')).toHaveValue(validData.name)
      await expect(page.locator('[data-testid="contact-email"]')).toHaveValue(validData.email)
    })

    test('should retry failed submissions', async ({ page }) => {
      await helpers.navigateToContact()
      
      const validData = TestDataFactory.contactMessages.valid()
      await helpers.fillContactForm(validData)
      
      // Simulate network failure
      await helpers.simulateNetworkError()
      await helpers.submitContactForm()
      
      // Verify retry option appears
      await helpers.expectElementToBeVisible('[data-testid="retry-submission"]')
      
      // Clear network simulation and retry
      await page.unroute('**/api/contact')
      await page.click('[data-testid="retry-submission"]')
      
      // Verify successful submission on retry
      await helpers.expectContactFormSuccess()
    })

    test('should prevent duplicate submissions', async ({ page }) => {
      await helpers.navigateToContact()
      
      const validData = TestDataFactory.contactMessages.valid()
      await helpers.fillContactForm(validData)
      
      // Submit form multiple times quickly
      await Promise.all([
        page.click('[data-testid="submit-contact-form"]'),
        page.click('[data-testid="submit-contact-form"]'),
        page.click('[data-testid="submit-contact-form"]')
      ])
      
      // Verify only one submission went through
      await helpers.expectContactFormSuccess()
      
      // Check that duplicate submission is prevented
      await helpers.expectElementToBeVisible('[data-testid="submission-cooldown"]')
    })
  })

  test.describe('CSRF Protection', () => {
    test('should include CSRF token in form submission', async ({ page }) => {
      await helpers.navigateToContact()
      
      // Verify CSRF token is present in form
      await helpers.expectElementToBeVisible('[data-testid="csrf-token"]')
      
      const validData = TestDataFactory.contactMessages.valid()
      await helpers.fillContactForm(validData)
      
      // Intercept form submission to verify CSRF token
      let csrfTokenSent = false
      await page.route('/api/contact', async route => {
        const request = route.request()
        const headers = request.headers()
        csrfTokenSent = !!headers['x-csrf-token']
        route.continue()
      })
      
      await helpers.submitContactForm()
      
      // Verify CSRF token was sent
      expect(csrfTokenSent).toBe(true)
    })

    test('should reject submissions without valid CSRF token', async ({ page }) => {
      // Test CSRF protection by making direct API call without token
      await helpers.expectCSRFProtection('/api/contact')
    })
  })

  test.describe('Rate Limiting', () => {
    test('should enforce rate limiting on form submissions', async ({ page }) => {
      await helpers.navigateToContact()
      
      const validData = TestDataFactory.contactMessages.valid()
      
      // Test rate limiting (assuming 3 submissions per minute)
      const responses = await helpers.testRateLimit('/api/contact', 3)
      
      // First 3 should succeed, 4th should be rate limited
      expect(responses.slice(0, 3)).toEqual([200, 200, 200])
      expect(responses[3]).toBe(429) // Too Many Requests
    })

    test('should show rate limit message to user', async ({ page }) => {
      await helpers.navigateToContact()
      
      // Submit multiple times to trigger rate limit
      const validData = TestDataFactory.contactMessages.valid()
      
      for (let i = 0; i < 4; i++) {
        await helpers.fillContactForm(validData)
        await helpers.submitContactForm()
        await page.waitForTimeout(500)
      }
      
      // Verify rate limit message appears
      await helpers.expectElementToBeVisible('[data-testid="rate-limit-message"]')
      await helpers.expectNotificationToShow('Too many requests. Please wait before submitting again.')
    })
  })

  test.describe('Spam Detection', () => {
    test('should detect and handle spam submissions', async ({ page }) => {
      await helpers.navigateToContact()
      
      const spamData = TestDataFactory.contactMessages.spam()
      await helpers.fillContactForm(spamData)
      await helpers.submitContactForm()
      
      // Verify spam detection
      await helpers.expectElementToBeVisible('[data-testid="spam-detected-message"]')
      await helpers.expectNotificationToShow('Message flagged for review')
    })

    test('should require additional verification for suspicious content', async ({ page }) => {
      await helpers.navigateToContact()
      
      const suspiciousData = {
        name: 'Test User',
        email: 'test@example.com',
        subject: 'URGENT BUSINESS PROPOSAL',
        message: 'Dear Sir/Madam, I have a business proposal that will benefit you greatly...'
      }
      
      await helpers.fillContactForm(suspiciousData)
      await helpers.submitContactForm()
      
      // Verify additional verification is required
      await helpers.expectElementToBeVisible('[data-testid="verification-challenge"]')
      await helpers.expectElementToBeVisible('[data-testid="captcha-widget"]')
    })
  })

  test.describe('User Experience', () => {
    test('should save form data on page refresh', async ({ page }) => {
      await helpers.navigateToContact()
      
      const formData = TestDataFactory.contactMessages.valid()
      await helpers.fillContactForm(formData)
      
      // Refresh page
      await page.reload()
      
      // Verify form data is restored
      await expect(page.locator('[data-testid="contact-name"]')).toHaveValue(formData.name)
      await expect(page.locator('[data-testid="contact-email"]')).toHaveValue(formData.email)
      await expect(page.locator('[data-testid="contact-subject"]')).toHaveValue(formData.subject)
      await expect(page.locator('[data-testid="contact-message"]')).toHaveValue(formData.message)
    })

    test('should show confirmation before clearing form', async ({ page }) => {
      await helpers.navigateToContact()
      
      const formData = TestDataFactory.contactMessages.valid()
      await helpers.fillContactForm(formData)
      
      // Try to clear form
      await page.click('[data-testid="clear-form"]')
      
      // Verify confirmation dialog
      await helpers.expectElementToBeVisible('[data-testid="clear-form-confirmation"]')
      
      // Cancel clearing
      await page.click('[data-testid="cancel-clear"]')
      
      // Verify form data is still there
      await expect(page.locator('[data-testid="contact-name"]')).toHaveValue(formData.name)
    })

    test('should provide helpful error messages', async ({ page }) => {
      await helpers.navigateToContact()
      
      // Test network error
      await helpers.simulateNetworkError()
      
      const validData = TestDataFactory.contactMessages.valid()
      await helpers.fillContactForm(validData)
      await helpers.submitContactForm()
      
      // Verify helpful error message
      await helpers.expectElementToBeVisible('[data-testid="network-error-help"]')
      await helpers.expectElementToHaveText(
        '[data-testid="network-error-help"]',
        'Please check your internet connection and try again.'
      )
    })

    test('should show success message with next steps', async ({ page }) => {
      await helpers.navigateToContact()
      
      const validData = TestDataFactory.contactMessages.valid()
      await helpers.fillContactForm(validData)
      await helpers.submitContactForm()
      
      // Verify success message with helpful information
      await helpers.expectContactFormSuccess()
      await helpers.expectElementToBeVisible('[data-testid="success-next-steps"]')
      await helpers.expectElementToHaveText(
        '[data-testid="success-next-steps"]',
        "We'll get back to you within 24 hours."
      )
    })
  })

  test.describe('Mobile Responsiveness', () => {
    test('should display properly on mobile devices', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 })
      await helpers.navigateToContact()
      
      // Verify mobile layout
      await helpers.expectElementToBeVisible('[data-testid="contact-form"]')
      await helpers.expectElementToBeVisible('[data-testid="mobile-contact-header"]')
      
      // Test form interaction on mobile
      const validData = TestDataFactory.contactMessages.valid()
      await helpers.fillContactForm(validData)
      await helpers.submitContactForm()
      
      await helpers.expectContactFormSuccess()
    })

    test('should handle touch interactions', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await helpers.navigateToContact()
      
      // Test touch interactions
      await page.tap('[data-testid="contact-name"]')
      await page.fill('[data-testid="contact-name"]', 'Test User')
      
      // Verify virtual keyboard doesn't interfere
      await helpers.expectElementToBeVisible('[data-testid="submit-contact-form"]')
    })
  })

  test.describe('Performance', () => {
    test('should load contact form quickly', async ({ page }) => {
      const loadTime = await helpers.measurePageLoadTime()
      await helpers.navigateToContact()
      
      // Verify page loads within acceptable time
      expect(loadTime).toBeLessThan(3000) // 3 seconds
    })

    test('should handle large message content efficiently', async ({ page }) => {
      await helpers.navigateToContact()
      
      const largeData = TestDataFactory.contactMessages.valid()
      largeData.message = 'Large message content. '.repeat(100)
      
      await helpers.fillContactForm(largeData)
      
      // Verify no performance degradation
      const submitTime = await helpers.measureApiResponseTime('/api/contact')
      expect(submitTime).toBeLessThan(5000) // 5 seconds
    })
  })
})
