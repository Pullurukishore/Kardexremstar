const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const fs = require('fs');
const path = require('path');

async function runLighthouseTest() {
  const chrome = await chromeLauncher.launch({chromeFlags: ['--headless']});
  
  const options = {
    logLevel: 'info',
    output: 'json',
    onlyCategories: ['performance'],
    port: chrome.port,
  };
  
  const runnerResult = await lighthouse('http://localhost:3000/admin/customers', options);
  
  // Extract key metrics
  const lhr = runnerResult.lhr;
  const metrics = {
    performanceScore: Math.round(lhr.categories.performance.score * 100),
    firstContentfulPaint: lhr.audits['first-contentful-paint'].numericValue,
    largestContentfulPaint: lhr.audits['largest-contentful-paint'].numericValue,
    totalBlockingTime: lhr.audits['total-blocking-time'].numericValue,
    cumulativeLayoutShift: lhr.audits['cumulative-layout-shift'].numericValue,
    speedIndex: lhr.audits['speed-index'].numericValue,
  };
  
  console.log('\n🚀 Performance Test Results:');
  console.log('================================');
  console.log(`Performance Score: ${metrics.performanceScore}/100`);
  console.log(`First Contentful Paint: ${metrics.firstContentfulPaint.toFixed(0)}ms`);
  console.log(`Largest Contentful Paint: ${metrics.largestContentfulPaint.toFixed(0)}ms`);
  console.log(`Total Blocking Time: ${metrics.totalBlockingTime.toFixed(0)}ms`);
  console.log(`Cumulative Layout Shift: ${metrics.cumulativeLayoutShift.toFixed(3)}`);
  console.log(`Speed Index: ${metrics.speedIndex.toFixed(0)}ms`);
  
  // Performance thresholds
  const thresholds = {
    performanceScore: 90,
    largestContentfulPaint: 2500,
    totalBlockingTime: 300,
    cumulativeLayoutShift: 0.1,
  };
  
  console.log('\n📊 Performance Analysis:');
  console.log('========================');
  
  Object.entries(thresholds).forEach(([metric, threshold]) => {
    const value = metrics[metric];
    const status = value <= threshold ? '✅ PASS' : '❌ FAIL';
    console.log(`${metric}: ${status} (${value} <= ${threshold})`);
  });
  
  // Save detailed report
  const reportPath = path.join(__dirname, '../performance-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(lhr, null, 2));
  console.log(`\n📄 Detailed report saved to: ${reportPath}`);
  
  await chrome.kill();
  
  return metrics;
}

// Bundle analysis function
function analyzeBundles() {
  console.log('\n📦 Bundle Analysis:');
  console.log('==================');
  
  const buildDir = path.join(__dirname, '../.next');
  
  if (!fs.existsSync(buildDir)) {
    console.log('❌ No build found. Run "npm run build" first.');
    return;
  }
  
  // Check for common performance issues
  const staticDir = path.join(buildDir, 'static');
  if (fs.existsSync(staticDir)) {
    const jsDir = path.join(staticDir, 'chunks');
    if (fs.existsSync(jsDir)) {
      const files = fs.readdirSync(jsDir);
      const jsFiles = files.filter(f => f.endsWith('.js'));
      
      console.log(`Total JS chunks: ${jsFiles.length}`);
      
      // Check for large chunks
      jsFiles.forEach(file => {
        const filePath = path.join(jsDir, file);
        const stats = fs.statSync(filePath);
        const sizeKB = Math.round(stats.size / 1024);
        
        if (sizeKB > 200) {
          console.log(`⚠️  Large chunk detected: ${file} (${sizeKB}KB)`);
        }
      });
    }
  }
}

// Main execution
async function main() {
  console.log('🔍 Starting Performance Analysis...\n');
  
  try {
    // Run bundle analysis
    analyzeBundles();
    
    // Run Lighthouse test
    const metrics = await runLighthouseTest();
    
    // Overall assessment
    const overallScore = metrics.performanceScore;
    let assessment = '';
    
    if (overallScore >= 90) {
      assessment = '🎉 Excellent performance!';
    } else if (overallScore >= 70) {
      assessment = '👍 Good performance, room for improvement';
    } else if (overallScore >= 50) {
      assessment = '⚠️  Needs optimization';
    } else {
      assessment = '❌ Poor performance, requires immediate attention';
    }
    
    console.log(`\n${assessment}`);
    console.log(`Overall Performance Score: ${overallScore}/100`);
    
  } catch (error) {
    console.error('❌ Performance test failed:', error.message);
    console.log('\nMake sure:');
    console.log('1. Your Next.js app is running on http://localhost:3000');
    console.log('2. You have lighthouse and chrome-launcher installed');
    console.log('3. Chrome is available on your system');
  }
}

if (require.main === module) {
  main();
}

module.exports = { runLighthouseTest, analyzeBundles };
