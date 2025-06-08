import { test, expect } from '@playwright/test'
import { ContactHelpers, PerformanceHelpers } from '../helpers/test-helpers'
import { setupTestEnvironment, teardownTestEnvironment } from '../fixtures/seed'

test.describe('Contact Form E2E Tests', () => {
  let contactHelpers: ContactHelpers
  let perfHelpers: PerformanceHelpers

  test.beforeEach(async ({ page }) => {
    contactHelpers = new ContactHelpers(page)
    perfHelpers = new PerformanceHelpers(page)
    
    await setupTestEnvironment(page, { seedData: false, minimal: true })
  })

  test.afterEach(async ({ page }) => {
    await teardownTestEnvironment(page)
  })

  test.describe('Form Accessibility and UI', () => {
    test('should display contact form with all required fields', async ({ page }) => {
      await page.goto('/contact')
      await page.waitForLoadState('networkidle')
      
      // Verify all form fields are present
      await expect(page.locator('[data-testid="contact-name-input"]')).toBeVisible()
      await expect(page.locator('[data-testid="contact-email-input"]')).toBeVisible()
      await expect(page.locator('[data-testid="contact-subject-input"]')).toBeVisible()
      await expect(page.locator('[data-testid="contact-message-input"]')).toBeVisible()
      await expect(page.locator('[data-testid="submit-contact-button"]')).toBeVisible()
    })

    test('should be accessible via keyboard navigation', async ({ page }) => {
      await page.goto('/contact')
      
      // Test tab navigation through form
      await page.keyboard.press('Tab')
      await expect(page.locator('[data-testid="contact-name-input"]')).toBeFocused()
      
      await page.keyboard.press('Tab')
      await expect(page.locator('[data-testid="contact-email-input"]')).toBeFocused()
      
      await page.keyboard.press('Tab')
      await expect(page.locator('[data-testid="contact-subject-input"]')).toBeFocused()
      
      await page.keyboard.press('Tab')
      await expect(page.locator('[data-testid="contact-message-input"]')).toBeFocused()
    })

    test('should be responsive across different screen sizes', async ({ page }) => {
      await perfHelpers.testResponsiveDesign()
      
      const viewports = [
        { width: 1920, height: 1080 }, // Desktop
        { width: 768, height: 1024 },  // Tablet
        { width: 375, height: 667 }    // Mobile
      ]

      for (const viewport of viewports) {
        await page.setViewportSize(viewport)
        await page.goto('/contact')
        
        // Verify form is still usable at this viewport
        await expect(page.locator('[data-testid="contact-form"]')).toBeVisible()
        await expect(page.locator('[data-testid="submit-contact-button"]')).toBeVisible()
      }
    })

    test('should display proper ARIA labels and roles', async ({ page }) => {
      await page.goto('/contact')
      
      // Check ARIA attributes for accessibility
      const nameInput = page.locator('[data-testid="contact-name-input"]')
      await expect(nameInput).toHaveAttribute('aria-label')
      await expect(nameInput).toHaveAttribute('aria-required', 'true')
      
      const emailInput = page.locator('[data-testid="contact-email-input"]')
      await expect(emailInput).toHaveAttribute('type', 'email')
      await expect(emailInput).toHaveAttribute('aria-required', 'true')
    })
  })

  test.describe('Form Validation', () => {
    test('should validate required fields on submission', async ({ page }) => {
      await contactHelpers.testFormValidation()
    })

    test('should validate email format', async ({ page }) => {
      await page.goto('/contact')
      
      // Fill form with invalid email
      await page.fill('[data-testid="contact-name-input"]', 'John Doe')
      await page.fill('[data-testid="contact-email-input"]', 'invalid-email')
      await page.fill('[data-testid="contact-subject-input"]', 'Test Subject')
      await page.fill('[data-testid="contact-message-input"]', 'Test message content')
      
      await page.click('[data-testid="submit-contact-button"]')
      
      // Should show email validation error
      await expect(page.locator('[data-testid="email-error"]')).toBeVisible()
      await expect(page.locator('[data-testid="email-error"]')).toContainText('valid email')
    })

    test('should enforce character limits', async ({ page }) => {
      await page.goto('/contact')
      
      // Test message character limit
      const longMessage = 'A'.repeat(5001) // Assuming 5000 char limit
      await page.fill('[data-testid="contact-message-input"]', longMessage)
      await page.click('[data-testid="submit-contact-button"]')
      
      // Should show character limit error
      await expect(page.locator('[data-testid="message-length-error"]')).toBeVisible()
    })

    test('should sanitize input fields', async ({ page }) => {
      await page.goto('/contact')
      
      // Test XSS prevention
      const maliciousInput = '<script>alert("xss")</script>'
      await page.fill('[data-testid="contact-name-input"]', maliciousInput)
      await page.fill('[data-testid="contact-subject-input"]', maliciousInput)
      
      // Submit form
      await page.fill('[data-testid="contact-email-input"]', 'test@example.com')
      await page.fill('[data-testid="contact-message-input"]', 'Test message')
      await page.click('[data-testid="submit-contact-button"]')
      
      // Form should handle malicious input gracefully
      await page.waitForSelector('[data-testid="contact-success-message"]')
    })

    test('should provide real-time validation feedback', async ({ page }) => {
      await page.goto('/contact')
        // Test email field real-time validation
      await page.fill('[data-testid="contact-email-input"]', 'invalid')
      await page.locator('[data-testid="contact-email-input"]').blur()
      
      // Should show immediate feedback
      await expect(page.locator('[data-testid="email-validation-feedback"]')).toBeVisible()
      
      // Fix the email
      await page.fill('[data-testid="contact-email-input"]', 'valid@example.com')
      await page.locator('[data-testid="contact-email-input"]').blur()
      
      // Error should disappear
      await expect(page.locator('[data-testid="email-validation-feedback"]')).not.toBeVisible()
    })
  })

  test.describe('Form Submission', () => {
    test('should successfully submit valid contact form', async ({ page }) => {
      const formData = {
        name: 'John Doe',
        email: 'john.doe@example.com',
        subject: 'Feature Request',
        message: 'I would like to request a new feature for the application.'
      }
      
      await contactHelpers.submitContactForm(formData)
    })

    test('should handle form submission with special characters', async ({ page }) => {
      const formData = {
        name: 'José María',
        email: 'jose@example.com',
        subject: 'Información & Soporte',
        message: 'Necesito ayuda con caracteres especiales: àáâãäåæçèéêë'
      }
      
      await contactHelpers.submitContactForm(formData)
    })

    test('should show loading state during submission', async ({ page }) => {
      await page.goto('/contact')
      
      // Fill form
      await page.fill('[data-testid="contact-name-input"]', 'John Doe')
      await page.fill('[data-testid="contact-email-input"]', 'john@example.com')
      await page.fill('[data-testid="contact-subject-input"]', 'Test Subject')
      await page.fill('[data-testid="contact-message-input"]', 'Test message')
      
      // Intercept the submission to simulate slow network
      await page.route('**/api/contact', async route => {
        await new Promise(resolve => setTimeout(resolve, 2000))
        await route.continue()
      })
      
      // Submit form
      await page.click('[data-testid="submit-contact-button"]')
      
      // Should show loading state
      await expect(page.locator('[data-testid="submit-loading"]')).toBeVisible()
      await expect(page.locator('[data-testid="submit-contact-button"]')).toBeDisabled()
    })

    test('should clear form after successful submission', async ({ page }) => {
      const formData = {
        name: 'John Doe',
        email: 'john@example.com',
        subject: 'Test Subject',
        message: 'Test message content'
      }
      
      await contactHelpers.submitContactForm(formData)
      
      // Verify form is cleared
      await expect(page.locator('[data-testid="contact-name-input"]')).toHaveValue('')
      await expect(page.locator('[data-testid="contact-email-input"]')).toHaveValue('')
      await expect(page.locator('[data-testid="contact-subject-input"]')).toHaveValue('')
      await expect(page.locator('[data-testid="contact-message-input"]')).toHaveValue('')
    })
  })

  test.describe('Rate Limiting and Security', () => {
    test('should implement rate limiting for submissions', async ({ page }) => {
      const formData = {
        name: 'Spammer',
        email: 'spam@example.com',
        subject: 'Spam',
        message: 'Spam message'
      }
      
      // Submit multiple times rapidly
      for (let i = 0; i < 5; i++) {
        await contactHelpers.submitContactForm(formData)
        await page.waitForTimeout(100)
      }
      
      // Should show rate limit error
      await page.goto('/contact')
      await page.fill('[data-testid="contact-name-input"]', formData.name)
      await page.fill('[data-testid="contact-email-input"]', formData.email)
      await page.fill('[data-testid="contact-subject-input"]', formData.subject)
      await page.fill('[data-testid="contact-message-input"]', formData.message)
      await page.click('[data-testid="submit-contact-button"]')
      
      await expect(page.locator('[data-testid="rate-limit-error"]')).toBeVisible()
    })

    test('should implement CAPTCHA for security', async ({ page }) => {
      await page.goto('/contact')
      
      // Fill form
      await page.fill('[data-testid="contact-name-input"]', 'John Doe')
      await page.fill('[data-testid="contact-email-input"]', 'john@example.com')
      await page.fill('[data-testid="contact-subject-input"]', 'Test Subject')
      await page.fill('[data-testid="contact-message-input"]', 'Test message')
      
      // CAPTCHA should be present
      await expect(page.locator('[data-testid="captcha-container"]')).toBeVisible()
      
      // Should not be able to submit without completing CAPTCHA
      await page.click('[data-testid="submit-contact-button"]')
      await expect(page.locator('[data-testid="captcha-error"]')).toBeVisible()
    })

    test('should prevent automated submissions', async ({ page }) => {
      // Set user agent to simulate bot
      await page.setExtraHTTPHeaders({
        'User-Agent': 'Bot/1.0'
      })
      
      await page.goto('/contact')
      
      // Should show bot detection message or redirect
      await expect(
        page.locator('[data-testid="bot-detection-message"]')
      ).toBeVisible({ timeout: 5000 })
    })
  })

  test.describe('Error Handling', () => {
    test('should handle server errors gracefully', async ({ page }) => {
      await page.goto('/contact')
      
      // Mock server error
      await page.route('**/api/contact', route => 
        route.fulfill({ status: 500, body: 'Internal Server Error' })
      )
      
      // Fill and submit form
      await page.fill('[data-testid="contact-name-input"]', 'John Doe')
      await page.fill('[data-testid="contact-email-input"]', 'john@example.com')
      await page.fill('[data-testid="contact-subject-input"]', 'Test Subject')
      await page.fill('[data-testid="contact-message-input"]', 'Test message')
      await page.click('[data-testid="submit-contact-button"]')
      
      // Should show error message
      await expect(page.locator('[data-testid="submission-error"]')).toBeVisible()
      await expect(page.locator('[data-testid="retry-button"]')).toBeVisible()
    })

    test('should handle network connectivity issues', async ({ page }) => {
      await page.goto('/contact')
      
      // Simulate network failure
      await page.route('**/api/contact', route => route.abort())
      
      // Fill and submit form
      await page.fill('[data-testid="contact-name-input"]', 'John Doe')
      await page.fill('[data-testid="contact-email-input"]', 'john@example.com')
      await page.fill('[data-testid="contact-subject-input"]', 'Test Subject')
      await page.fill('[data-testid="contact-message-input"]', 'Test message')
      await page.click('[data-testid="submit-contact-button"]')
      
      // Should show network error
      await expect(page.locator('[data-testid="network-error"]')).toBeVisible()
    })

    test('should allow retry after errors', async ({ page }) => {
      await page.goto('/contact')
      
      // Mock initial failure then success
      let callCount = 0
      await page.route('**/api/contact', route => {
        callCount++
        if (callCount === 1) {
          route.fulfill({ status: 500, body: 'Error' })
        } else {
          route.fulfill({ status: 200, body: JSON.stringify({ success: true }) })
        }
      })
      
      // Submit form (will fail)
      await page.fill('[data-testid="contact-name-input"]', 'John Doe')
      await page.fill('[data-testid="contact-email-input"]', 'john@example.com')
      await page.fill('[data-testid="contact-subject-input"]', 'Test Subject')
      await page.fill('[data-testid="contact-message-input"]', 'Test message')
      await page.click('[data-testid="submit-contact-button"]')
      
      // Wait for error and retry
      await expect(page.locator('[data-testid="submission-error"]')).toBeVisible()
      await page.click('[data-testid="retry-button"]')
      
      // Should succeed on retry
      await expect(page.locator('[data-testid="contact-success-message"]')).toBeVisible()
    })
  })

  test.describe('Performance and Optimization', () => {
    test('should load contact form quickly', async ({ page }) => {
      const loadTime = await perfHelpers.measurePageLoad('/contact')
      
      // Contact form should load within 3 seconds
      expect(loadTime).toBeLessThan(3000)
    })

    test('should optimize for mobile performance', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 })
      
      const loadTime = await perfHelpers.measurePageLoad('/contact')
      
      // Mobile should still perform well
      expect(loadTime).toBeLessThan(4000)
    })

    test('should minimize network requests', async ({ page }) => {
      const requests = await perfHelpers.monitorNetworkRequests(async () => {
        await page.goto('/contact')
        await page.waitForLoadState('networkidle')
      })
      
      // Should not make excessive requests
      const relevantRequests = requests.filter(req => 
        req.url.includes('/contact') && !req.url.includes('.js') && !req.url.includes('.css')
      )
      expect(relevantRequests.length).toBeLessThan(5)
    })
  })

  test.describe('Integration with Backend', () => {
    test('should send notification emails to administrators', async ({ page }) => {
      // This would typically require email testing infrastructure
      // For now, we'll verify the API call is made correctly
      
      let emailSent = false
      await page.route('**/api/contact', async route => {
        const postData = route.request().postDataJSON()
        
        // Verify email data structure
        expect(postData).toHaveProperty('name')
        expect(postData).toHaveProperty('email')
        expect(postData).toHaveProperty('subject')
        expect(postData).toHaveProperty('message')
        
        emailSent = true
        await route.fulfill({ 
          status: 200, 
          body: JSON.stringify({ success: true, messageId: 'test-123' })
        })
      })
      
      await contactHelpers.submitContactForm({
        name: 'John Doe',
        email: 'john@example.com',
        subject: 'Test Subject',
        message: 'Test message'
      })
      
      expect(emailSent).toBe(true)
    })

    test('should log contact submissions for tracking', async ({ page }) => {
      // Verify submission logging
      let loggedData: any
      await page.route('**/api/contact', async route => {
        loggedData = route.request().postDataJSON()
        await route.fulfill({ 
          status: 200, 
          body: JSON.stringify({ success: true })
        })
      })
      
      const formData = {
        name: 'Jane Smith',
        email: 'jane@example.com',
        subject: 'Support Request',
        message: 'I need help with my account'
      }
      
      await contactHelpers.submitContactForm(formData)
      
      // Verify data was logged correctly
      expect(loggedData).toMatchObject(formData)
    })
  })
})
