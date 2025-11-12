const fs = require('fs');
const path = require('path');

// Storage directories to create
const storageRoot = 'C:\\KardexCare\\storage';
const directories = [
  storageRoot,
  path.join(storageRoot, 'images'),
  path.join(storageRoot, 'images', 'tickets'),
  path.join(storageRoot, 'images', 'activities'),
  path.join(storageRoot, 'images', 'profiles'),
  path.join(storageRoot, 'documents'),
  path.join(storageRoot, 'documents', 'tickets'),
  path.join(storageRoot, 'documents', 'reports'),
  path.join(storageRoot, 'backups'),
  path.join(storageRoot, 'backups', 'daily'),
  path.join(storageRoot, 'backups', 'weekly'),
  path.join(storageRoot, 'temp')
];

console.log('🚀 Setting up KardexCare Storage Directories...\n');

directories.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`✅ Created: ${dir}`);
  } else {
    console.log(`📁 Exists: ${dir}`);
  }
});

console.log('\n🎉 Storage setup complete!');
console.log('\n📋 Directory Structure:');
console.log(`
C:\\KardexCare\\storage\\
├── images\\
│   ├── tickets\\           # Ticket verification photos
│   ├── activities\\        # Activity verification photos
│   └── profiles\\          # User profile pictures
├── documents\\
│   ├── tickets\\           # Ticket PDFs, docs
│   └── reports\\           # Generated reports
├── backups\\
│   ├── daily\\             # Daily backups
│   └── weekly\\            # Weekly backups
└── temp\\                  # Temporary files
`);

console.log('\n⚙️ Next Steps:');
console.log('1. Copy settings from .env.example to your .env file');
console.log('2. Update STORAGE_ROOT path if needed');
console.log('3. Start your application - it will use local storage');
console.log('4. Test photo uploads through ticket status updates');
