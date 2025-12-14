import { PrismaClient } from '@prisma/client';

// Declare global type for Prisma singleton
declare global {
  var prisma: PrismaClient | undefined;
}

// Create a new Prisma Client instance with connection pooling
const prismaClientSingleton = () => {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development'
      ? ['warn', 'error']
      : ['error'],
    // For connection pooling, add to DATABASE_URL: ?connection_limit=20&pool_timeout=30
  });

  // Log when client connects (for debugging connection issues)
  client.$connect()
    .then(() => {
      console.log('✅ Prisma client connected to database');
    })
    .catch((error) => {
      console.error('❌ Failed to connect to database:', error);
    });

  return client;
};

// Use singleton pattern to prevent multiple instances in development
const prisma = global.prisma ?? prismaClientSingleton();

// In development, store the client in global to reuse across hot-reloads
if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

// Handle clean up on process exit
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

// Handle uncaught errors that might indicate connection issues
process.on('unhandledRejection', (reason: any) => {
  if (reason?.message?.includes('Too many database connections') ||
    reason?.message?.includes('connection pool')) {
    console.error('🔴 Database connection pool exhausted. Consider increasing connection_limit.');
  }
});

export default prisma;