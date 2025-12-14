import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Test if Offer model exists
async function testOfferModel() {
  try {
    const count = await prisma.offer.count();
    console.log('Offer model exists, count:', count);
  } catch (error) {
    console.error('Offer model error:', error);
  }
  
  // Test if ServiceZone has shortForm
  try {
    const zone = await prisma.serviceZone.findFirst({
      select: { id: true, shortForm: true }
    });
    console.log('ServiceZone shortForm exists:', zone?.shortForm);
  } catch (error) {
    console.error('ServiceZone shortForm error:', error);
  }
}

testOfferModel();
