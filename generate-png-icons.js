const fs = require('fs');

console.log('Starting PNG icon generation...');

// Simple PNG creation for icons
function createSimplePNG(width, height, filename) {
  console.log(`Creating ${width}x${height} icon...`);
  
  try {
    const { createCanvas } = require('canvas');
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    // Background
    ctx.fillStyle = '#2563eb';
    ctx.fillRect(0, 0, width, height);
    
    // Diamond shape
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.moveTo(width * 0.25, height * 0.5);
    ctx.lineTo(width * 0.5, width * 0.25);
    ctx.lineTo(width * 0.75, height * 0.5);
    ctx.lineTo(width * 0.5, width * 0.75);
    ctx.closePath();
    ctx.fill();
    
    // Center circle
    ctx.fillStyle = '#2563eb';
    ctx.beginPath();
    ctx.arc(width * 0.5, height * 0.5, width * 0.125, 0, 2 * Math.PI);
    ctx.fill();
    
    // Save as PNG
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(filename, buffer);
    console.log(`✓ Created ${filename}`);
    
    return true;
  } catch (error) {
    console.error(`Error creating ${filename}:`, error.message);
    return false;
  }
}

// Check if canvas is available
try {
  require('canvas');
  console.log('Canvas library found, generating PNG icons...');
  
  // Ensure icons directory exists
  if (!fs.existsSync('./public/icons')) {
    fs.mkdirSync('./public/icons', { recursive: true });
  }
  // Generate the PNG files for all sizes
  const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
  let allSuccess = true;
    for (const size of sizes) {
    const success = createSimplePNG(size, size, `./public/icons/icon-${size}x${size}.png`);
    if (!success) allSuccess = false;
  }
  
  // Generate shortcut icons
  createSimplePNG(96, 96, './public/icons/upload-96x96.png');
  createSimplePNG(96, 96, './public/icons/search-96x96.png');
    if (allSuccess) {
    console.log('✅ All PNG icons generated successfully!');
  } else {
    console.log('⚠️ Some icons failed to generate');
  }
} catch (error) {
  console.log('Canvas not available, creating placeholder PNGs...');
  
  // Create simple placeholder PNG files
  // A minimal valid PNG file (1x1 blue pixel)
  const bluePNG = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
    0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, 0x00, 0x00, 0x00,
    0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0x99, 0x01, 0x01, 0x00, 0x00, 0xFF,
    0xFF, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01, 0x73, 0x75, 0x01, 0x18, 0x00,
    0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
  ]);
  
  fs.writeFileSync('./public/icons/icon-192x192.png', bluePNG);
  fs.writeFileSync('./public/icons/icon-512x512.png', bluePNG);
  
  console.log('✅ Basic PNG placeholders created. You may want to replace with actual icons.');
}
