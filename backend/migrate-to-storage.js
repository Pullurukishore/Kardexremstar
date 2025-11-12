const fs = require('fs');
const path = require('path');

console.log('🚀 Migrating from uploads/ to storage/ system...\n');

// Check if uploads folder exists
const uploadsDir = 'C:\\KardexCare\\backend\\uploads';
const storageDir = 'C:\\KardexCare\\storage';

if (fs.existsSync(uploadsDir)) {
  console.log('📁 Found uploads folder with files:');
  
  // List current files
  const files = fs.readdirSync(uploadsDir);
  files.forEach(file => {
    const stats = fs.statSync(path.join(uploadsDir, file));
    console.log(`   - ${file} (${stats.size} bytes)`);
  });
  
  console.log(`\n📊 Total files: ${files.length}`);
  console.log('💡 These files can be safely deleted since you\'re using the new storage system');
  
  // Move files to storage (optional)
  console.log('\n🔄 Moving files to new storage structure...');
  
  files.forEach(file => {
    const oldPath = path.join(uploadsDir, file);
    const newPath = path.join(storageDir, 'images', 'legacy', file);
    
    // Create legacy folder
    const legacyDir = path.join(storageDir, 'images', 'legacy');
    if (!fs.existsSync(legacyDir)) {
      fs.mkdirSync(legacyDir, { recursive: true });
    }
    
    // Move file
    fs.renameSync(oldPath, newPath);
    console.log(`   ✅ Moved: ${file} → storage/images/legacy/`);
  });
  
  // Remove empty uploads folder
  fs.rmdirSync(uploadsDir);
  console.log('\n🗑️ Removed empty uploads/ folder');
  
} else {
  console.log('📁 No uploads folder found - already clean!');
}

console.log('\n🎉 Migration complete!');
console.log('\n📋 Next steps:');
console.log('1. Update your .env to use only storage paths');
console.log('2. Remove legacy upload code (optional)');
console.log('3. All new uploads will use organized storage structure');
