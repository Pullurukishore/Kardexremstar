const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function extractAndImportImages() {
  try {
    console.log('📸 Extracting images from Excel file...');
    
    const mediaPath = path.join(__dirname, '../data/excel_extracted/xl/media');
    const imageFiles = fs.readdirSync(mediaPath).filter(f => f.endsWith('.jpeg'));
    
    console.log(`✓ Found ${imageFiles.length} images`);
    
    // Get all spare parts ordered by creation date
    const spareParts = await prisma.sparePart.findMany({
      orderBy: { createdAt: 'asc' },
      select: { id: true, name: true, partNumber: true }
    });
    
    console.log(`✓ Found ${spareParts.length} spare parts in database`);
    
    // Map images to spare parts (image1.jpeg -> sparePart[0], image2.jpeg -> sparePart[1], etc.)
    let updated = 0;
    let skipped = 0;
    
    for (let i = 0; i < imageFiles.length; i++) {
      const imageFile = imageFiles[i];
      const imageNum = i + 1;
      
      if (i < spareParts.length) {
        const sparePart = spareParts[i];
        const imagePath = path.join(mediaPath, imageFile);
        
        // Read image and convert to base64
        const imageBuffer = fs.readFileSync(imagePath);
        const base64Image = imageBuffer.toString('base64');
        const dataUrl = `data:image/jpeg;base64,${base64Image}`;
        
        // Update spare part with image
        await prisma.sparePart.update({
          where: { id: sparePart.id },
          data: { imageUrl: dataUrl }
        });
        
        console.log(`✓ Updated ${sparePart.name} (ID: ${sparePart.id}) with image${imageNum}.jpeg`);
        updated++;
      } else {
        skipped++;
      }
    }
    
    console.log(`\n✅ Import complete!`);
    console.log(`   Updated: ${updated} spare parts`);
    console.log(`   Skipped: ${skipped} images (no matching spare parts)`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

extractAndImportImages();
