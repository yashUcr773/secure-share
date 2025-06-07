// Debug email validation
const { validateEmail, validatePassword } = require('./src/lib/security.ts');

// Test invalid emails from the test file
const invalidEmails = [
  'user@',
  'user..double.dot@example.com',
  'user@.example.com',
  '',
  'user@example',
  'user name@example.com',
  'user@exam ple.com'
];

console.log('Testing invalid emails:');
invalidEmails.forEach(email => {
  const result = validateEmail(email);
  console.log(`Email: "${email}" -> ${result} (should be false)`);
});

// Test strong passwords
const strongPasswords = [
  'SecurePass123!',
  'MyP@ssw0rd2023',
  'C0mplex!ty&Strength',
  'LongPasswordWithNumbers123!'
];

console.log('\nTesting strong passwords:');
strongPasswords.forEach(password => {
  const result = validatePassword(password);
  console.log(`Password: "${password}" -> Valid: ${result.isValid}, Errors: ${result.errors.join(', ')}`);
});
