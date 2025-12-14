const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkZones() {
  try {
    const zones = await prisma.serviceZone.findMany({
      where: { isActive: true },
      select: { id: true, name: true }
    });
    console.log('Available zones:', zones);
    
    // Find South zone
    const southZone = zones.find(zone => zone.name.toLowerCase().includes('south'));
    if (southZone) {
      console.log('South zone found:', southZone);
    } else {
      console.log('South zone not found. Available zones:', zones.map(z => z.name));
    }
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
  }
}

checkZones();
