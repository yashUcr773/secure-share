// Global Jest teardown - runs once after all tests
module.exports = async () => {
  console.log('🧹 Cleaning up test environment...');
  
  // Clean up test data
  try {
    const fs = require('fs');
    const path = require('path');
    
    const testDataDir = path.join(__dirname, 'test-data');
    if (fs.existsSync(testDataDir)) {
      const files = fs.readdirSync(testDataDir);
      for (const file of files) {
        if (file !== '.gitkeep') {
          fs.unlinkSync(path.join(testDataDir, file));
        }
      }
    }
    
    console.log('✅ Test data cleaned up');
  } catch (error) {
    console.warn('⚠️ Could not clean up test data:', error.message);
  }
};
