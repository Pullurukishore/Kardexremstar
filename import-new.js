const { PrismaClient } = require('@prisma/client');
const XLSX = require('xlsx');
const fs = require('fs');

const prisma = new PrismaClient();
const ADMIN_USER_ID = 1;
const EXCEL_FILE_PATH = './data/import-data.xlsx';

const log = {
  info: (msg) => console.log(`[INFO] ${new Date().toISOString()} - ${msg}`),
  error: (msg) => console.error(`[ERROR] ${new Date().toISOString()} - ${msg}`),
  success: (msg) => console.log(`[SUCCESS] ${new Date().toISOString()} - ${msg}`)
};

const stats = {
  serviceZonesCreated: 0,
  serviceZonesReused: 0,
  customersCreated: 0,
  customersReused: 0,
  assetsCreated: 0,
  errors: 0,
  totalRows: 0
};

const cache = {
  serviceZones: new Map(),
  customers: new Map()
};

async function createServiceZone(zoneName) {
  if (cache.serviceZones.has(zoneName)) {
    stats.serviceZonesReused++;
    return cache.serviceZones.get(zoneName);
  }

  let zone = await prisma.serviceZone.findFirst({
    where: { name: { equals: zoneName, mode: 'insensitive' } }
  });

  if (zone) {
    log.info(`Reusing ServiceZone: ${zoneName}`);
    cache.serviceZones.set(zoneName, zone);
    stats.serviceZonesReused++;
    return zone;
  }

  zone = await prisma.serviceZone.create({
    data: {
      name: zoneName,
      description: `Auto-created zone for ${zoneName}`,
      isActive: true
    }
  });

  log.success(`Created ServiceZone: ${zoneName}`);
  cache.serviceZones.set(zoneName, zone);
  stats.serviceZonesCreated++;
  return zone;
}

async function createCustomer(customerName, place, serviceZoneId) {
  const key = `${customerName.toLowerCase()}_${serviceZoneId}`;
  
  if (cache.customers.has(key)) {
    stats.customersReused++;
    return cache.customers.get(key);
  }

  let customer = await prisma.customer.findFirst({
    where: {
      companyName: { equals: customerName, mode: 'insensitive' },
      serviceZoneId: serviceZoneId
    }
  });

  if (customer) {
    log.info(`Reusing Customer: ${customerName}`);
    cache.customers.set(key, customer);
    stats.customersReused++;
    return customer;
  }

  customer = await prisma.customer.create({
    data: {
      companyName: customerName,
      address: place || null,
      industry: null,
      timezone: 'UTC',
      serviceZoneId: serviceZoneId,
      isActive: true,
      createdById: ADMIN_USER_ID,
      updatedById: ADMIN_USER_ID
    }
  });

  log.success(`Created Customer: ${customerName}`);
  cache.customers.set(key, customer);
  stats.customersCreated++;
  return customer;
}

async function createAsset(serialNumber, department, customerId) {
  let serial = serialNumber && serialNumber.trim() ? serialNumber.trim() : null;
  
  if (!serial) {
    serial = `AUTO_${Date.now()}_${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    log.info(`Generated serial: ${serial}`);
  }

  const existing = await prisma.asset.findUnique({
    where: { serialNo: serial }
  });

  if (existing) {
    log.info(`Asset ${serial} already exists, skipping`);
    return existing;
  }

  const machineId = `MACHINE_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const model = department && department.trim() ? department.trim() : 'Not Specified';

  const asset = await prisma.asset.create({
    data: {
      machineId: machineId,
      model: model,
      serialNo: serial,
      status: 'ACTIVE',
      customerId: customerId,
      location: null,
      purchaseDate: null,
      warrantyEnd: null,
      amcEnd: null
    }
  });

  log.success(`Created Asset: ${serial} for customer ${customerId}`);
  stats.assetsCreated++;
  return asset;
}

async function processRow(row, index) {
  try {
    const customerName = (row['Name of the Customer'] || '').toString().trim();
    const place = (row['Place'] || '').toString().trim();
    const department = (row['Department'] || '').toString().trim();
    const zone = (row['Zone'] || '').toString().trim();
    const serialNumber = (row['Serial Number'] || '').toString().trim();

    if (!customerName || !zone) {
      log.error(`Row ${index}: Missing required data`);
      stats.errors++;
      return false;
    }

    log.info(`Processing row ${index}: ${customerName} - ${serialNumber}`);

    const serviceZone = await createServiceZone(zone);
    const customer = await createCustomer(customerName, place, serviceZone.id);
    await createAsset(serialNumber, department, customer.id);

    return true;
  } catch (error) {
    log.error(`Row ${index} failed: ${error.message}`);
    stats.errors++;
    return false;
  }
}

async function importData() {
  try {
    log.info('Starting Excel import...');

    if (!fs.existsSync(EXCEL_FILE_PATH)) {
      throw new Error(`File not found: ${EXCEL_FILE_PATH}`);
    }

    const workbook = XLSX.readFile(EXCEL_FILE_PATH);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    stats.totalRows = data.length;
    log.info(`Found ${stats.totalRows} rows to process`);

    const adminUser = await prisma.user.findUnique({ where: { id: ADMIN_USER_ID } });
    if (!adminUser) {
      throw new Error(`Admin user with ID ${ADMIN_USER_ID} not found`);
    }
    log.info(`Using admin user: ${adminUser.name || adminUser.email} (ID: ${ADMIN_USER_ID})`);

    let successCount = 0;
    for (let i = 0; i < data.length; i++) {
      const success = await processRow(data[i], i + 2);
      if (success) successCount++;
      
      if (i % 10 === 0 && i > 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    log.success('Import completed!');
    console.log('\n=== IMPORT SUMMARY ===');
    console.log(`Total rows processed: ${stats.totalRows}`);
    console.log(`Successful imports: ${successCount}`);
    console.log(`Errors: ${stats.errors}`);
    console.log(`ServiceZones created: ${stats.serviceZonesCreated}`);
    console.log(`ServiceZones reused: ${stats.serviceZonesReused}`);
    console.log(`Customers created: ${stats.customersCreated}`);
    console.log(`Customers reused: ${stats.customersReused}`);
    console.log(`Assets created: ${stats.assetsCreated}`);
    console.log('=====================');

  } catch (error) {
    log.error(`Import failed: ${error.message}`);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  importData().catch(console.error);
}

module.exports = { importData };
