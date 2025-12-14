import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();

// Sample data for customers and assets
const customersData = [
  {
    companyName: 'TechCorp Solutions',
    industry: 'Technology',
    address: '123 Tech Park, Bangalore',
    serviceZone: 'North',
    assets: [
      { machineId: 'TC-1001', model: 'Server Rack X1', serialNo: 'SRX1-2023-001' },
      { machineId: 'TC-1002', model: 'Network Switch S1', serialNo: 'NWS1-2023-002' }
    ]
  },
  {
    companyName: 'MediCare Hospitals',
    industry: 'Healthcare',
    address: '456 Health Avenue, Mumbai',
    serviceZone: 'South',
    assets: [
      { machineId: 'MH-2001', model: 'MRI Machine M1', serialNo: 'MRI1-2023-001' },
      { machineId: 'MH-2002', model: 'X-Ray Machine X1', serialNo: 'XRM1-2023-002' }
    ]
  },
  {
    companyName: 'EduTech Innovations',
    industry: 'Education',
    address: '789 Knowledge Street, Delhi',
    serviceZone: 'East',
    assets: [
      { machineId: 'ET-3001', model: 'Interactive Board IB1', serialNo: 'IB1-2023-001' }
    ]
  },
  {
    companyName: 'AgroFarm Solutions',
    industry: 'Agriculture',
    address: '321 Farm Road, Punjab',
    serviceZone: 'West',
    assets: [
      { machineId: 'AF-4001', model: 'Irrigation System IS1', serialNo: 'ISI1-2023-001' },
      { machineId: 'AF-4002', model: 'Harvester H1', serialNo: 'HAR1-2023-002' },
      { machineId: 'AF-4003', model: 'Tractor T1', serialNo: 'TRC1-2023-003' }
    ]
  }
];

async function main() {
  console.log('Starting to seed customers with assets...');
  
  // Find admin user to associate with creation
  const adminUser = await prisma.user.findFirst({
    where: { role: 'ADMIN' },
    select: { id: true }
  });

  if (!adminUser) {
    throw new Error('No admin user found. Please create an admin user first.');
  }

  for (const customerData of customersData) {
    // Find or create service zone
    let serviceZone = await prisma.serviceZone.findFirst({
      where: { name: customerData.serviceZone }
    });

    if (!serviceZone) {
      serviceZone = await prisma.serviceZone.create({
        data: {
          name: customerData.serviceZone,
          shortForm: customerData.serviceZone.substring(0, 3).toUpperCase(),
          description: `${customerData.serviceZone} Zone`,
          isActive: true
        }
      });
      console.log(`Created new service zone: ${serviceZone.name}`);
    }

    // Create customer
    const customer = await prisma.customer.create({
      data: {
        companyName: customerData.companyName,
        industry: customerData.industry,
        address: customerData.address,
        serviceZone: {
          connect: { id: serviceZone.id }
        },
        createdBy: {
          connect: { id: adminUser.id }
        },
        updatedBy: {
          connect: { id: adminUser.id }
        },
        isActive: true,
        timezone: 'Asia/Kolkata'
      }
    });

    console.log(`Created customer: ${customer.companyName} in ${serviceZone.name} zone`);

    // Create assets for the customer
    for (const assetData of customerData.assets) {
      await prisma.asset.create({
        data: {
          machineId: assetData.machineId,
          model: assetData.model,
          serialNo: assetData.serialNo,
          location: customerData.address,
          status: 'ACTIVE',
          customer: {
            connect: { id: customer.id }
          }
        }
      });
      console.log(`  - Added asset: ${assetData.machineId} (${assetData.model})`);
    }
  }

  console.log('\nSeeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
