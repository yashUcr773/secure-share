// Test script for CSRF validation implementation
// This script tests the CSRF token validation logic

const { validateCSRFToken, validateCSRFWithSession, generateCSRFToken } = require('../src/lib/security');

// Mock NextRequest for testing
class MockNextRequest {
  constructor(headers = {}) {
    this.headers = new Map(Object.entries(headers));
  }
  
  get(name) {
    return this.headers.get(name.toLowerCase());
  }
}

// Test cases
function testCSRFValidation() {
  console.log('🔒 Testing CSRF Token Validation...\n');
  
  // Test 1: Valid token format
  console.log('Test 1: Valid token format');
  const validToken = 'a'.repeat(64); // 64 hex characters
  const mockRequest1 = new MockNextRequest({
    'x-csrf-token': validToken
  });
  const result1 = validateCSRFToken(mockRequest1);
  console.log(`Result: ${result1 ? '✅ PASS' : '❌ FAIL'} - Valid token accepted\n`);
  
  // Test 2: Invalid token format (too short)
  console.log('Test 2: Invalid token format (too short)');
  const invalidToken = 'abc123';
  const mockRequest2 = new MockNextRequest({
    'x-csrf-token': invalidToken
  });
  const result2 = validateCSRFToken(mockRequest2);
  console.log(`Result: ${!result2 ? '✅ PASS' : '❌ FAIL'} - Invalid token rejected\n`);
  
  // Test 3: Missing token
  console.log('Test 3: Missing token');
  const mockRequest3 = new MockNextRequest({});
  const result3 = validateCSRFToken(mockRequest3);
  console.log(`Result: ${!result3 ? '✅ PASS' : '❌ FAIL'} - Missing token rejected\n`);
  
  // Test 4: Invalid characters in token
  console.log('Test 4: Invalid characters in token');
  const invalidCharsToken = 'g'.repeat(64); // 'g' is not a valid hex character
  const mockRequest4 = new MockNextRequest({
    'x-csrf-token': invalidCharsToken
  });
  const result4 = validateCSRFToken(mockRequest4);
  console.log(`Result: ${!result4 ? '✅ PASS' : '❌ FAIL'} - Token with invalid chars rejected\n`);
  
  // Test 5: Session-based validation
  console.log('Test 5: Session-based validation');
  async function testSessionValidation() {
    const result5 = await validateCSRFWithSession(mockRequest1, 'user123');
    console.log(`Result: ${result5 ? '✅ PASS' : '❌ FAIL'} - Session validation with valid user ID\n`);
    
    const result6 = await validateCSRFWithSession(mockRequest2, 'user123');
    console.log(`Result: ${!result6 ? '✅ PASS' : '❌ FAIL'} - Session validation with invalid token\n`);
    
    const result7 = await validateCSRFWithSession(mockRequest1, '');
    console.log(`Result: ${!result7 ? '✅ PASS' : '❌ FAIL'} - Session validation with empty user ID\n`);
  }
  
  testSessionValidation().then(() => {
    console.log('🎉 CSRF validation tests completed!');
  });
}

// Test token generation
function testTokenGeneration() {
  console.log('\n🔑 Testing CSRF Token Generation...\n');
  
  try {
    const token1 = generateCSRFToken();
    const token2 = generateCSRFToken();
    
    console.log(`Token 1: ${token1}`);
    console.log(`Token 2: ${token2}`);
    console.log(`Length: ${token1.length} characters`);
    console.log(`Unique: ${token1 !== token2 ? '✅ PASS' : '❌ FAIL'} - Tokens are unique`);
    console.log(`Format: ${/^[a-f0-9]{64}$/.test(token1) ? '✅ PASS' : '❌ FAIL'} - Valid hex format\n`);
  } catch (error) {
    console.error('❌ Token generation failed:', error);
  }
}

// Run tests
if (require.main === module) {
  testTokenGeneration();
  testCSRFValidation();
}

module.exports = {
  testCSRFValidation,
  testTokenGeneration
};
