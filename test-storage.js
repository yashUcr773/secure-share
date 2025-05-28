// Test script for persistent storage functionality
// Run with: npm run test:storage

import { FileStorage } from '../src/lib/storage';
import { config, initConfig } from '../src/lib/config';

async function testStorage() {
  console.log('🧪 Testing SecureShare Persistent Storage...\n');

  // Initialize configuration
  if (!initConfig()) {
    console.error('❌ Configuration initialization failed');
    return;
  }

  try {
    // Test 1: Initialize storage
    console.log('1️⃣ Testing storage initialization...');
    await FileStorage.init();
    console.log('✅ Storage initialized successfully\n');

    // Test 2: Save a test file
    console.log('2️⃣ Testing file save...');
    const testFile = {
      id: 'test-file-12345',
      fileName: 'test.txt',
      fileSize: 1024,
      encryptedContent: 'encrypted-test-content-base64',
      salt: 'test-salt-base64',
      iv: 'test-iv-base64',
      key: null,
      isPasswordProtected: true,
      createdAt: new Date().toISOString(),
      userId: 'test-user-123'
    };

    await FileStorage.saveFile(testFile);
    console.log('✅ File saved successfully\n');

    // Test 3: Retrieve file metadata
    console.log('3️⃣ Testing file metadata retrieval...');
    const metadata = await FileStorage.getFileMetadata('test-file-12345');
    console.log('✅ Metadata retrieved:', {
      id: metadata?.id,
      fileName: metadata?.fileName,
      isPasswordProtected: metadata?.isPasswordProtected
    });
    console.log('');

    // Test 4: Retrieve full file
    console.log('4️⃣ Testing full file retrieval...');
    const fullFile = await FileStorage.getFile('test-file-12345');
    console.log('✅ Full file retrieved with encrypted content:', {
      id: fullFile?.id,
      hasEncryptedContent: !!fullFile?.encryptedContent
    });
    console.log('');

    // Test 5: Get storage stats
    console.log('5️⃣ Testing storage statistics...');
    const stats = await FileStorage.getStats();
    console.log('✅ Storage stats:', stats);
    console.log('');

    // Test 6: Clean up test file
    console.log('6️⃣ Testing file deletion...');
    const deleted = await FileStorage.deleteFile('test-file-12345');
    console.log('✅ File deleted:', deleted);
    console.log('');

    // Test 7: Verify file is gone
    console.log('7️⃣ Verifying file deletion...');
    const deletedFile = await FileStorage.getFile('test-file-12345');
    console.log('✅ File not found (as expected):', deletedFile === null);
    console.log('');

    console.log('🎉 All storage tests passed!\n');
    console.log('📂 Storage directory:', config.storageDir);
    console.log('💾 Max file size:', config.maxFileSize, 'bytes');
    console.log('🧹 Cleanup after:', config.cleanupDays, 'days');

  } catch (error) {
    console.error('❌ Storage test failed:', error);
    process.exit(1);
  }
}

// Run the test
testStorage().catch(console.error);
