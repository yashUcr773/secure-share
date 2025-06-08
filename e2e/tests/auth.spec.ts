import { test, expect } from '@playwright/test'
import { TestHelpers, generateTestUser } from '../helpers/test-helpers'

test.describe('Authentication Flow', () => {
  let helpers: TestHelpers

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page)
    await helpers.clearBrowserStorage()
  })

  test.describe('Login', () => {
    test('should login with valid credentials', async ({ page }) => {
      await helpers.navigateToLogin()

      // Verify login page elements
      await helpers.expectElementToBeVisible('[data-testid="email-input"]')
      await helpers.expectElementToBeVisible('[data-testid="password-input"]')
      await helpers.expectElementToBeVisible('[data-testid="login-button"]')

      // Login with test credentials
      await page.fill('[data-testid="email-input"]', 'test@example.com')
      await page.fill('[data-testid="password-input"]', 'TestPassword123!')
      await page.click('[data-testid="login-button"]')

      // Should redirect to dashboard
      await helpers.expectToBeOnPage('/dashboard')
      await helpers.expectElementToBeVisible('[data-testid="dashboard-header"]')
    })

    test('should show error for invalid credentials', async ({ page }) => {
      await helpers.navigateToLogin()

      await page.fill('[data-testid="email-input"]', 'invalid@example.com')
      await page.fill('[data-testid="password-input"]', 'wrongpassword')
      await page.click('[data-testid="login-button"]')

      // Should show error message
      await helpers.expectElementToBeVisible('[data-testid="error-message"]')
      await helpers.expectToBeOnPage('/login')
    })

    test('should validate email format', async ({ page }) => {
      await helpers.navigateToLogin()

      await page.fill('[data-testid="email-input"]', 'invalid-email')
      await page.fill('[data-testid="password-input"]', 'password123')
      await page.click('[data-testid="login-button"]')

      await helpers.expectElementToBeVisible('[data-testid="email-error"]')
    })

    test('should validate required fields', async ({ page }) => {
      await helpers.navigateToLogin()

      await page.click('[data-testid="login-button"]')

      await helpers.expectElementToBeVisible('[data-testid="email-error"]')
      await helpers.expectElementToBeVisible('[data-testid="password-error"]')
    })

    test('should remember user with remember me checkbox', async ({ page }) => {
      await helpers.navigateToLogin()

      await page.fill('[data-testid="email-input"]', 'test@example.com')
      await page.fill('[data-testid="password-input"]', 'TestPassword123!')
      await page.check('[data-testid="remember-me"]')
      await page.click('[data-testid="login-button"]')

      await helpers.expectToBeOnPage('/dashboard')

      // Check localStorage for remember token
      const rememberToken = await helpers.getLocalStorageItem('remember_token')
      expect(rememberToken).toBeTruthy()
    })

    test('should handle network errors gracefully', async ({ page }) => {
      await helpers.interceptApiError('**/api/auth/login', 500)
      await helpers.navigateToLogin()

      await page.fill('[data-testid="email-input"]', 'test@example.com')
      await page.fill('[data-testid="password-input"]', 'TestPassword123!')
      await page.click('[data-testid="login-button"]')

      await helpers.expectElementToBeVisible('[data-testid="network-error"]')
    })
  })

  test.describe('Signup', () => {
    test('should signup with valid data', async ({ page }) => {
      const testUser = generateTestUser(Date.now().toString())
      
      await helpers.navigateToSignup()

      // Verify signup form elements
      await helpers.expectElementToBeVisible('[data-testid="name-input"]')
      await helpers.expectElementToBeVisible('[data-testid="email-input"]')
      await helpers.expectElementToBeVisible('[data-testid="password-input"]')
      await helpers.expectElementToBeVisible('[data-testid="confirm-password-input"]')
      await helpers.expectElementToBeVisible('[data-testid="signup-button"]')

      // Fill signup form
      await page.fill('[data-testid="name-input"]', testUser.name)
      await page.fill('[data-testid="email-input"]', testUser.email)
      await page.fill('[data-testid="password-input"]', testUser.password)
      await page.fill('[data-testid="confirm-password-input"]', testUser.confirmPassword)
      await page.click('[data-testid="signup-button"]')

      // Should redirect to email verification or dashboard
      await page.waitForURL(url => 
        url.pathname === '/verify-email' || url.pathname === '/dashboard'
      )
    })

    test('should validate password confirmation match', async ({ page }) => {
      await helpers.navigateToSignup()

      const testUser = generateTestUser()
      await page.fill('[data-testid="name-input"]', testUser.name)
      await page.fill('[data-testid="email-input"]', testUser.email)
      await page.fill('[data-testid="password-input"]', testUser.password)
      await page.fill('[data-testid="confirm-password-input"]', 'DifferentPassword123!')
      await page.click('[data-testid="signup-button"]')

      await helpers.expectElementToBeVisible('[data-testid="password-match-error"]')
    })

    test('should validate password strength', async ({ page }) => {
      await helpers.navigateToSignup()

      const testUser = generateTestUser()
      await page.fill('[data-testid="name-input"]', testUser.name)
      await page.fill('[data-testid="email-input"]', testUser.email)
      await page.fill('[data-testid="password-input"]', 'weak')
      await page.fill('[data-testid="confirm-password-input"]', 'weak')
      await page.click('[data-testid="signup-button"]')

      await helpers.expectElementToBeVisible('[data-testid="password-strength-error"]')
    })

    test('should handle duplicate email registration', async ({ page }) => {
      await helpers.interceptApiError('**/api/auth/signup', 409)
      await helpers.navigateToSignup()

      const testUser = generateTestUser()
      await page.fill('[data-testid="name-input"]', testUser.name)
      await page.fill('[data-testid="email-input"]', 'existing@example.com')
      await page.fill('[data-testid="password-input"]', testUser.password)
      await page.fill('[data-testid="confirm-password-input"]', testUser.confirmPassword)
      await page.click('[data-testid="signup-button"]')

      await helpers.expectElementToBeVisible('[data-testid="email-exists-error"]')
    })

    test('should show password strength indicator', async ({ page }) => {
      await helpers.navigateToSignup()

      const passwordInput = page.locator('[data-testid="password-input"]')
      
      // Weak password
      await passwordInput.fill('weak')
      await helpers.expectElementToBeVisible('[data-testid="strength-weak"]')

      // Medium password
      await passwordInput.fill('Medium1!')
      await helpers.expectElementToBeVisible('[data-testid="strength-medium"]')

      // Strong password
      await passwordInput.fill('StrongPassword123!')
      await helpers.expectElementToBeVisible('[data-testid="strength-strong"]')
    })
  })

  test.describe('Logout', () => {
    test.beforeEach(async () => {
      // Login before each logout test
      await helpers.loginUser('test@example.com', 'TestPassword123!')
    })

    test('should logout successfully', async ({ page }) => {
      await helpers.expectToBeOnPage('/dashboard')

      await page.click('[data-testid="user-menu"]')
      await helpers.expectElementToBeVisible('[data-testid="logout-button"]')
      
      await page.click('[data-testid="logout-button"]')
      await helpers.expectToBeOnPage('/login')

      // Should clear authentication tokens
      const authToken = await helpers.getLocalStorageItem('auth_token')
      expect(authToken).toBeNull()
    })

    test('should logout from all devices', async ({ page }) => {
      await page.click('[data-testid="user-menu"]')
      await page.click('[data-testid="logout-all-devices"]')
      
      await helpers.expectToBeOnPage('/login')
      await helpers.expectNotificationToShow('Logged out from all devices')
    })
  })

  test.describe('Session Management', () => {
    test('should redirect to login when session expires', async ({ page }) => {
      await helpers.loginUser('test@example.com', 'TestPassword123!')
      
      // Mock expired session
      await helpers.interceptApiError('**/api/auth/me', 401)
      
      // Try to access protected route
      await page.goto('/dashboard')
      await helpers.expectToBeOnPage('/login')
    })

    test('should refresh token automatically', async ({ page }) => {
      await helpers.loginUser('test@example.com', 'TestPassword123!')
      
      // Mock token refresh
      await helpers.interceptApiCall('**/api/auth/refresh', {
        success: true,
        token: 'new-token',
        expiresAt: Date.now() + 3600000
      })
      
      // Wait for automatic token refresh
      await page.waitForTimeout(2000)
      
      // Should still be on dashboard
      await helpers.expectToBeOnPage('/dashboard')
    })

    test('should handle refresh token failure', async ({ page }) => {
      await helpers.loginUser('test@example.com', 'TestPassword123!')
      
      // Mock refresh token failure
      await helpers.interceptApiError('**/api/auth/refresh', 401)
      
      // Trigger token refresh
      await page.reload()
      
      // Should redirect to login
      await helpers.expectToBeOnPage('/login')
    })
  })

  test.describe('Protected Routes', () => {
    test('should redirect unauthenticated users to login', async ({ page }) => {
      await page.goto('/dashboard')
      await helpers.expectToBeOnPage('/login')

      await page.goto('/settings')
      await helpers.expectToBeOnPage('/login')

      await page.goto('/files')
      await helpers.expectToBeOnPage('/login')
    })

    test('should allow access to protected routes when authenticated', async () => {
      await helpers.loginUser('test@example.com', 'TestPassword123!')
      
      await helpers.navigateToDashboard()
      await helpers.expectToBeOnPage('/dashboard')
      
      await helpers.page.goto('/settings')
      await helpers.expectToBeOnPage('/settings')
    })
  })

  test.describe('Password Reset', () => {
    test('should request password reset', async ({ page }) => {
      await page.goto('/forgot-password')
      
      await page.fill('[data-testid="email-input"]', 'test@example.com')
      await page.click('[data-testid="reset-password-button"]')
      
      await helpers.expectNotificationToShow('Password reset email sent')
    })

    test('should validate email for password reset', async ({ page }) => {
      await page.goto('/forgot-password')
      
      await page.fill('[data-testid="email-input"]', 'invalid-email')
      await page.click('[data-testid="reset-password-button"]')
      
      await helpers.expectElementToBeVisible('[data-testid="email-error"]')
    })

    test('should handle password reset with token', async ({ page }) => {
      await page.goto('/reset-password?token=valid-reset-token')
      
      await page.fill('[data-testid="new-password"]', 'NewPassword123!')
      await page.fill('[data-testid="confirm-password"]', 'NewPassword123!')
      await page.click('[data-testid="update-password-button"]')
      
      await helpers.expectToBeOnPage('/login')
      await helpers.expectNotificationToShow('Password updated successfully')
    })

    test('should handle invalid reset token', async ({ page }) => {
      await helpers.interceptApiError('**/api/auth/reset-password', 400)
      
      await page.goto('/reset-password?token=invalid-token')
      
      await helpers.expectElementToBeVisible('[data-testid="invalid-token-error"]')
    })
  })

  test.describe('Email Verification', () => {
    test('should show email verification page for unverified users', async ({ page }) => {
      await helpers.interceptApiCall('**/api/auth/login', {
        success: true,
        user: { id: '1', email: 'test@example.com', emailVerified: false },
        token: 'test-token'
      })
      
      await helpers.navigateToLogin()
      await page.fill('[data-testid="email-input"]', 'test@example.com')
      await page.fill('[data-testid="password-input"]', 'TestPassword123!')
      await page.click('[data-testid="login-button"]')
      
      await helpers.expectToBeOnPage('/verify-email')
    })

    test('should resend verification email', async ({ page }) => {
      await page.goto('/verify-email')
      
      await page.click('[data-testid="resend-verification"]')
      
      await helpers.expectNotificationToShow('Verification email sent')
    })

    test('should verify email with valid token', async ({ page }) => {
      await page.goto('/verify-email?token=valid-verification-token')
      
      await helpers.expectToBeOnPage('/dashboard')
      await helpers.expectNotificationToShow('Email verified successfully')
    })
  })
})
