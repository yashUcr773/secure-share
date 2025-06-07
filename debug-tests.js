// Simple test runner to debug AuthContext issues
import { execSync } from 'child_process';

const testPattern = 'AuthContext';

try {
  console.log('Running AuthContext tests...');
  const result = execSync(`npm test -- --testPathPattern=${testPattern} --forceExit --detectOpenHandles`, {
    encoding: 'utf-8',
    stdio: 'pipe',
    timeout: 30000,
    cwd: process.cwd()
  });
  
  console.log('Test Results:');
  console.log(result);
} catch (error) {
  console.error('Test Error:');
  console.error(error.stdout || error.message);
  console.error(error.stderr);
}
