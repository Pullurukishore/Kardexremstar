const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDatabase() {
  try {
    const serviceZones = await prisma.serviceZone.count();
    const customers = await prisma.customer.count();
    const assets = await prisma.asset.count();
    
    console.log('=== DATABASE COUNTS ===');
    console.log('ServiceZones:', serviceZones);
    console.log('Customers:', customers);
    console.log('Assets:', assets);
    
    // Check sample data
    const sampleZones = await prisma.serviceZone.findMany({ take: 5 });
    const sampleCustomers = await prisma.customer.findMany({ take: 5 });
    const sampleAssets = await prisma.asset.findMany({ take: 5 });
    
    console.log('\n=== SAMPLE DATA ===');
    console.log('Sample ServiceZones:', sampleZones.map(z => z.name));
    console.log('Sample Customers:', sampleCustomers.map(c => c.companyName));
    console.log('Sample Assets:', sampleAssets.map(a => a.serialNo));
    
  } catch (error) {
    console.error('Database check failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();
