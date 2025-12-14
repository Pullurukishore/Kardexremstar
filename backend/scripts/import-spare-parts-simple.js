const { PrismaClient } = require('@prisma/client');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const prisma = new PrismaClient();
const EXCEL_FILE_PATH = path.join(__dirname, '../data/BIS applicability analysis sheet (002) (1).xlsx');
const ADMIN_USER_ID = 1;

// Log to both console and file
const logFile = path.join(__dirname, 'import-log.txt');
const log = (msg) => {
  console.log(msg);
  fs.appendFileSync(logFile, msg + '\n');
};

async function importSpareParts() {
  try {
    fs.writeFileSync(logFile, '=== SPARE PARTS IMPORT LOG ===\n');
    log('Starting import...');
    
    // Check file
    if (!fs.existsSync(EXCEL_FILE_PATH)) {
      throw new Error(`File not found: ${EXCEL_FILE_PATH}`);
    }
    log('✓ Excel file found');
    
    // Read file
    const workbook = XLSX.readFile(EXCEL_FILE_PATH);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawData = XLSX.utils.sheet_to_json(worksheet);
    
    // First row contains headers as values, skip it and use it to map columns
    const headerRow = rawData[0];
    const headerMap = {};
    Object.entries(headerRow).forEach(([key, value]) => {
      if (value) headerMap[value.toString().trim()] = key;
    });
    
    log(`✓ Found headers: ${Object.keys(headerMap).join(', ')}`);
    
    // Actual data starts from row 1
    const jsonData = rawData.slice(1);
    log(`✓ Read ${jsonData.length} data rows from Excel`);
    
    // Check admin user
    const adminUser = await prisma.user.findUnique({ where: { id: ADMIN_USER_ID } });
    if (!adminUser) throw new Error(`Admin user ${ADMIN_USER_ID} not found`);
    log(`✓ Admin user found: ${adminUser.email}`);
    
    // Process rows
    let created = 0, duplicates = 0, errors = 0;
    
    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i];
      
      // Get values using header map
      const getVal = (headerName) => {
        const colKey = headerMap[headerName];
        return colKey ? (row[colKey] || '').toString().trim() : '';
      };
      
      const productName = getVal('Product Name');
      const partId = getVal('Part ID');
      const imageUrl = getVal('Image and brochures of product');
      const hsnCode = getVal('HSN Code');
      
      if (!productName || !partId) continue;
      
      try {
        // Check duplicate
        const existing = await prisma.sparePart.findUnique({
          where: { partNumber: partId }
        });
        
        if (existing) {
          duplicates++;
          continue;
        }
        
        // Create spare part
        await prisma.sparePart.create({
          data: {
            name: productName,
            partNumber: partId,
            description: hsnCode ? `HSN: ${hsnCode}` : null,
            category: null,
            basePrice: 0,
            imageUrl: imageUrl || null,
            specifications: null,
            status: 'ACTIVE',
            createdById: ADMIN_USER_ID,
            updatedById: ADMIN_USER_ID
          }
        });
        
        created++;
        if ((i + 1) % 50 === 0) log(`Progress: ${i + 1}/${jsonData.length}`);
        
      } catch (err) {
        errors++;
        log(`Error row ${i + 2}: ${err.message}`);
      }
    }
    
    log(`\n=== RESULTS ===`);
    log(`Created: ${created}`);
    log(`Duplicates: ${duplicates}`);
    log(`Errors: ${errors}`);
    log(`Total: ${jsonData.length}`);
    log('✓ Import completed!');
    
  } catch (error) {
    log(`FATAL ERROR: ${error.message}`);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

importSpareParts();
