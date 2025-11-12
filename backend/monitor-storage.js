const fs = require('fs');
const path = require('path');

function getDirectorySize(dirPath) {
  let totalSize = 0;
  let fileCount = 0;
  
  try {
    const files = fs.readdirSync(dirPath, { withFileTypes: true });
    
    for (const file of files) {
      const filePath = path.join(dirPath, file.name);
      
      if (file.isDirectory()) {
        const subDirStats = getDirectorySize(filePath);
        totalSize += subDirStats.size;
        fileCount += subDirStats.count;
      } else {
        const stats = fs.statSync(filePath);
        totalSize += stats.size;
        fileCount++;
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dirPath}:`, error.message);
  }
  
  return { size: totalSize, count: fileCount };
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function monitorStorage() {
  console.log('📊 KardexCare Storage Monitor\n');
  
  const storageRoot = path.join(process.cwd(), '..', 'storage');
  
  if (!fs.existsSync(storageRoot)) {
    console.log('❌ Storage directory not found');
    return;
  }
  
  // Monitor each subdirectory
  const directories = [
    'images/tickets',
    'images/activities', 
    'images/profiles',
    'images/legacy',
    'documents',
    'temp'
  ];
  
  let totalSize = 0;
  let totalFiles = 0;
  
  directories.forEach(dir => {
    const fullPath = path.join(storageRoot, dir);
    if (fs.existsSync(fullPath)) {
      const stats = getDirectorySize(fullPath);
      totalSize += stats.size;
      totalFiles += stats.count;
      
      console.log(`📁 ${dir.padEnd(20)} ${stats.count.toString().padStart(6)} files  ${formatBytes(stats.size).padStart(10)}`);
    }
  });
  
  console.log('─'.repeat(50));
  console.log(`📊 Total Storage:        ${totalFiles.toString().padStart(6)} files  ${formatBytes(totalSize).padStart(10)}`);
  
  // Storage warnings
  const totalGB = totalSize / (1024 * 1024 * 1024);
  
  if (totalGB > 50) {
    console.log('⚠️  Warning: Storage usage over 50GB');
  } else if (totalGB > 100) {
    console.log('🚨 Alert: Storage usage over 100GB - consider cleanup');
  } else {
    console.log('✅ Storage usage is healthy');
  }
  
  // Daily upload estimate
  const dailyEstimate = totalFiles / 30; // Rough 30-day estimate
  console.log(`📈 Estimated daily uploads: ${Math.round(dailyEstimate)} files`);
  
  // 50-user capacity check
  const currentUsersEstimate = Math.ceil(dailyEstimate / 5); // 5 photos per user per day
  console.log(`👥 Current load equivalent: ~${currentUsersEstimate} active users`);
  console.log(`🎯 50-user capacity: ${currentUsersEstimate <= 50 ? '✅ Well within limits' : '⚠️ Approaching limits'}`);
}

// Run monitor
monitorStorage();
