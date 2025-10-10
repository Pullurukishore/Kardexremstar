const { PrismaClient } = require('@prisma/client');
const XLSX = require('xlsx');
const fs = require('fs');

const prisma = new PrismaClient();
const ADMIN_USER_ID = 1;
const EXCEL_FILE_PATH = './data/import-data.xlsx';

async function debugImport() {
  try {
    console.log('=== DEBUG IMPORT ===');
    
    // Check file exists
    if (!fs.existsSync(EXCEL_FILE_PATH)) {
      console.log('ERROR: File not found:', EXCEL_FILE_PATH);
      return;
    }
    console.log('✓ Excel file found');

    // Check admin user
    const adminUser = await prisma.user.findUnique({ where: { id: ADMIN_USER_ID } });
    if (!adminUser) {
      console.log('ERROR: Admin user not found');
      return;
    }
    console.log('✓ Admin user found:', adminUser.email);

    // Read Excel
    const workbook = XLSX.readFile(EXCEL_FILE_PATH);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet);
    console.log('✓ Excel data loaded, rows:', data.length);

    // Check first row structure
    if (data.length > 0) {
      console.log('First row keys:', Object.keys(data[0]));
      console.log('First row data:', data[0]);
    }

    // Try to process first row
    const firstRow = data[0];
    const customerName = (firstRow['Name of the Customer'] || '').toString().trim();
    const place = (firstRow['Place'] || '').toString().trim();
    const department = (firstRow['Department'] || '').toString().trim();
    const zone = (firstRow['Zone'] || '').toString().trim();
    const serialNumber = (firstRow['Serial Number'] || '').toString().trim();

    console.log('Parsed first row:');
    console.log('- Customer:', customerName);
    console.log('- Place:', place);
    console.log('- Department:', department);
    console.log('- Zone:', zone);
    console.log('- Serial:', serialNumber);

    if (!customerName || !zone) {
      console.log('ERROR: Missing required fields');
      return;
    }

    // Try to create/find service zone
    let serviceZone = await prisma.serviceZone.findFirst({
      where: { name: { equals: zone, mode: 'insensitive' } }
    });

    if (!serviceZone) {
      serviceZone = await prisma.serviceZone.create({
        data: {
          name: zone,
          description: `Auto-created zone for ${zone}`,
          isActive: true
        }
      });
      console.log('✓ Created ServiceZone:', zone);
    } else {
      console.log('✓ Found ServiceZone:', zone);
    }

    console.log('=== DEBUG COMPLETE ===');

  } catch (error) {
    console.error('DEBUG ERROR:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

debugImport();
