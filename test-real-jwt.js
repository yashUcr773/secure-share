// Simple test to verify JWT functionality without mocking
const jwt = require('jsonwebtoken');

const payload = { test: 'data' };
const secret = 'test-secret';

try {
  console.log('Testing real JWT...');
  const token = jwt.sign(payload, secret);
  console.log('Token generated:', token);
  
  const decoded = jwt.verify(token, secret);
  console.log('Token verified:', decoded);
  
  console.log('JWT test successful');
} catch (error) {
  console.error('JWT test failed:', error);
}
