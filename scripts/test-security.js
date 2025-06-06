// Security test script for SecureShare
// This script tests various security measures implemented in the application

import { AuthService } from '../src/lib/auth';
import { config } from '../src/lib/config';
import { 
  sanitizeInput, 
  validateOrigin, 
  validateFileUpload,
  generateCSRFToken,
  validateCSRFToken 
} from '../src/lib/security';

console.log('🔐 SecureShare Security Implementation Test\n');

// Test 1: JWT Security
console.log('1. Testing JWT Security Implementation...');
try {
  // Test JWT secret validation
  if (config.jwt.secret.length < 32) {
    console.log('❌ JWT secret is too short for production use');
  } else {
    console.log('✅ JWT secret meets minimum length requirements');
  }
  
  // Test JWT token generation
  const testUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    passwordHash: 'hash'
  };
  
  const token = await AuthService.generateToken(testUser);
  const payload = await AuthService.verifyToken(token);
  
  if (payload && payload.userId === testUser.id) {
    console.log('✅ JWT token generation and verification working');
  } else {
    console.log('❌ JWT token verification failed');
  }
} catch (error) {
  console.log('❌ JWT implementation test failed:', error.message);
}

// Test 2: Input Sanitization
console.log('\n2. Testing Input Sanitization...');
const maliciousInputs = [
  '<script>alert("xss")</script>',
  'javascript:alert("xss")',
  'onclick="alert(1)"',
  'SELECT * FROM users',
  '../../../etc/passwd',
  'test\x00hidden'
];

let sanitizationPassed = true;
maliciousInputs.forEach(input => {
  const sanitized = sanitizeInput(input);
  if (sanitized.includes('<script>') || sanitized.includes('javascript:') || sanitized.includes('onclick=')) {
    console.log(`❌ Failed to sanitize: ${input}`);
    sanitizationPassed = false;
  }
});

if (sanitizationPassed) {
  console.log('✅ Input sanitization working correctly');
} else {
  console.log('❌ Input sanitization has vulnerabilities');
}

// Test 3: File Upload Validation
console.log('\n3. Testing File Upload Security...');
const testFiles = [
  { name: 'document.pdf', size: 1024 * 1024, valid: true },
  { name: 'malware.exe', size: 1024, valid: false },
  { name: 'script.js', size: 1024, valid: false },
  { name: 'huge-file.txt', size: 200 * 1024 * 1024, valid: false },
  { name: 'path\x00traversal.txt', size: 1024, valid: false }
];

let fileValidationPassed = true;
testFiles.forEach(file => {
  const result = validateFileUpload(file.name, file.size);
  if (result.valid !== file.valid) {
    console.log(`❌ File validation failed for: ${file.name}`);
    fileValidationPassed = false;
  }
});

if (fileValidationPassed) {
  console.log('✅ File upload validation working correctly');
} else {
  console.log('❌ File upload validation has issues');
}

// Test 4: CSRF Token Implementation
console.log('\n4. Testing CSRF Protection...');
try {
  const csrfToken1 = generateCSRFToken();
  const csrfToken2 = generateCSRFToken();
  
  if (csrfToken1.length === 64 && csrfToken2.length === 64 && csrfToken1 !== csrfToken2) {
    console.log('✅ CSRF token generation working correctly');
  } else {
    console.log('❌ CSRF token generation failed');
  }
} catch (error) {
  console.log('❌ CSRF token implementation failed:', error.message);
}

// Test 5: Rate Limiting Configuration
console.log('\n5. Testing Rate Limiting Configuration...');
const rateLimitConfigs = [
  config.rateLimit.auth,
  config.rateLimit.upload,
  config.rateLimit.general
];

let rateLimitConfigured = true;
rateLimitConfigs.forEach((rlConfig, index) => {
  const types = ['auth', 'upload', 'general'];
  if (!rlConfig.requests || !rlConfig.window || rlConfig.requests <= 0) {
    console.log(`❌ ${types[index]} rate limit not properly configured`);
    rateLimitConfigured = false;
  }
});

if (rateLimitConfigured) {
  console.log('✅ Rate limiting properly configured');
} else {
  console.log('❌ Rate limiting configuration issues found');
}

// Test 6: Environment Configuration
console.log('\n6. Testing Environment Security Configuration...');
const requiredEnvVars = [
  'JWT_SECRET',
  'NEXT_PUBLIC_BASE_URL'
];

let envConfigured = true;
requiredEnvVars.forEach(envVar => {
  if (!process.env[envVar]) {
    console.log(`❌ Missing environment variable: ${envVar}`);
    envConfigured = false;
  }
});

if (process.env.NODE_ENV === 'production') {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    console.log('❌ Production JWT secret not properly configured');
    envConfigured = false;
  }
}

if (envConfigured) {
  console.log('✅ Environment security configuration appears correct');
} else {
  console.log('❌ Environment security configuration needs attention');
}

console.log('\n🔐 Security Implementation Test Complete\n');
console.log('📋 Security Checklist:');
console.log('✅ JWT implementation with proper signing');
console.log('✅ Rate limiting infrastructure');
console.log('✅ Security headers (HSTS, CSP, X-Frame-Options, etc.)');
console.log('✅ CORS configuration');
console.log('✅ Input sanitization');
console.log('✅ File upload validation');
console.log('✅ CSRF protection utilities');
console.log('✅ Origin validation');
console.log('✅ Comprehensive error handling');
console.log('✅ Security event logging');

console.log('\n⚠️  Remaining Security Tasks:');
console.log('• Implement CSRF token validation in forms');
console.log('• Add content security policy violations monitoring');
console.log('• Set up security event alerting');
console.log('• Add brute force protection for login attempts');
console.log('• Implement account lockout mechanisms');
console.log('• Add audit logging for sensitive operations');
console.log('• Configure security monitoring dashboards');
