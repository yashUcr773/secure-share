// Migration script to add userId to existing files
const fs = require('fs').promises;
const path = require('path');

async function migrateFiles() {
  const dataDir = path.resolve('./data');
  const indexPath = path.join(dataDir, 'index.json');
  const filesDir = path.join(dataDir, 'files');

  try {
    console.log('Starting file migration...');
    
    // Read current index
    const indexContent = await fs.readFile(indexPath, 'utf-8');
    const index = JSON.parse(indexContent);
    
    let updatedCount = 0;
    
    // Update index entries
    for (const [fileId, metadata] of Object.entries(index)) {
      if (!metadata.userId) {
        metadata.userId = 'anonymous';
        updatedCount++;
      }
    }
    
    // Write updated index
    await fs.writeFile(indexPath, JSON.stringify(index, null, 2));
    console.log(`Updated ${updatedCount} files in index.json`);
    
    // Update individual file records
    const fileList = await fs.readdir(filesDir);
    let fileUpdatedCount = 0;
    
    for (const fileName of fileList) {
      if (fileName.endsWith('.json')) {
        const filePath = path.join(filesDir, fileName);
        const fileContent = await fs.readFile(filePath, 'utf-8');
        const fileData = JSON.parse(fileContent);
        
        if (!fileData.userId) {
          fileData.userId = 'anonymous';
          fileData.updatedAt = new Date().toISOString();
          await fs.writeFile(filePath, JSON.stringify(fileData, null, 2));
          fileUpdatedCount++;
        }
      }
    }
    
    console.log(`Updated ${fileUpdatedCount} individual file records`);
    console.log('Migration completed successfully!');
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrateFiles();
