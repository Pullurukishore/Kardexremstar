const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyZoneManager() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: 'kishore@gmail.com' },
      include: {
        serviceZones: true,
        customer: true
      }
    });

    console.log('Zone Manager User Details:');
    console.log('Email:', user?.email);
    console.log('Role:', user?.role);
    console.log('Zone ID:', user?.zoneId);
    console.log('Service Zones:', user?.serviceZones);
    console.log('Customer:', user?.customer);

    if (!user?.zoneId && (!user?.serviceZones || user.serviceZones.length === 0)) {
      console.log('\n❌ Issue: User has no zone assignment!');
      console.log('Assigning zone 2 (South) now...');
      
      const updated = await prisma.user.update({
        where: { email: 'kishore@gmail.com' },
        data: { zoneId: '2' }
      });
      
      console.log('✅ Zone assigned successfully!');
      console.log('Updated Zone ID:', updated.zoneId);
    } else {
      console.log('\n✅ Zone assignment verified!');
    }

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
  }
}

verifyZoneManager();
