// Debug JWT token generation
const jwt = require('jsonwebtoken');

console.log('Testing JWT sign function...');

const payload = {
  userId: 'test-user',
  email: 'test@example.com',
  role: 'user'
};

const secret = 'test-secret';

// Test synchronous version
try {
  console.log('Testing synchronous JWT sign...');
  const syncToken = jwt.sign(payload, secret, { expiresIn: '1h' });
  console.log('Sync token:', syncToken);
} catch (error) {
  console.error('Sync error:', error);
}

// Test asynchronous version
console.log('Testing asynchronous JWT sign...');
jwt.sign(payload, secret, { expiresIn: '1h' }, (err, token) => {
  if (err) {
    console.error('Async error:', err);
  } else {
    console.log('Async token:', token);
  }
});

console.log('Script completed');
