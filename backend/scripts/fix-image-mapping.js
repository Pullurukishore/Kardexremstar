const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixImageMapping() {
  try {
    console.log('🔧 Fixing image mapping by part number...');
    
    // Read Excel file to get part numbers in order
    const excelPath = path.join(__dirname, '../data/BIS applicability analysis sheet (002) (1).xlsx');
    const wb = XLSX.readFile(excelPath);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
    
    // Get headers
    const headers = data[1];
    const partNumberCol = headers.indexOf('Part ID');
    const productNameCol = headers.indexOf('Product Name');
    
    console.log(`✓ Part Number column: ${partNumberCol}`);
    console.log(`✓ Product Name column: ${productNameCol}`);
    
    // Build mapping: partNumber -> imageNumber
    const partNumberToImage = {};
    let imageNum = 1;
    
    for (let i = 2; i < data.length; i++) {
      const row = data[i];
      const partNumber = row[partNumberCol];
      const productName = row[productNameCol];
      
      if (partNumber) {
        partNumberToImage[partNumber] = {
          imageNum,
          productName
        };
        imageNum++;
      }
    }
    
    console.log(`✓ Created mapping for ${Object.keys(partNumberToImage).length} products`);
    
    // Get all spare parts from database
    const spareParts = await prisma.sparePart.findMany({
      select: { id: true, name: true, partNumber: true }
    });
    
    console.log(`✓ Found ${spareParts.length} spare parts in database`);
    
    // Update each spare part with correct image
    const mediaPath = path.join(__dirname, '../data/excel_extracted/xl/media');
    let updated = 0;
    let notFound = 0;
    
    for (const sparePart of spareParts) {
      const mapping = partNumberToImage[sparePart.partNumber];
      
      if (mapping) {
        const imageFile = `image${mapping.imageNum}.jpeg`;
        const imagePath = path.join(mediaPath, imageFile);
        
        if (fs.existsSync(imagePath)) {
          // Read image and convert to base64
          const imageBuffer = fs.readFileSync(imagePath);
          const base64Image = imageBuffer.toString('base64');
          const dataUrl = `data:image/jpeg;base64,${base64Image}`;
          
          // Update spare part
          await prisma.sparePart.update({
            where: { id: sparePart.id },
            data: { imageUrl: dataUrl }
          });
          
          console.log(`✓ ${sparePart.name} (${sparePart.partNumber}) ← ${imageFile}`);
          updated++;
        } else {
          console.log(`⚠ Image not found: ${imageFile}`);
        }
      } else {
        console.log(`⚠ No mapping found for: ${sparePart.name} (${sparePart.partNumber})`);
        notFound++;
      }
    }
    
    console.log(`\n✅ Fix complete!`);
    console.log(`   Updated: ${updated} spare parts`);
    console.log(`   Not found: ${notFound} spare parts`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixImageMapping();
