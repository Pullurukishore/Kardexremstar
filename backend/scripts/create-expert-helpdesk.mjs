import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function createExpertHelpdeskUser() {
  try {
    // Expert helpdesk user credentials
    const email = 'expert@kardexcare.com';
    const password = 'Expert@123456';
    const name = 'Expert Helpdesk';
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });
    
    if (existingUser) {
      console.log(`✓ User already exists: ${email}`);
      console.log(`  ID: ${existingUser.id}`);
      console.log(`  Role: ${existingUser.role}`);
      return;
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create expert helpdesk user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: 'EXPERT_HELPDESK',
        isActive: true,
        tokenVersion: Math.random().toString(36).substring(2, 15)
      }
    });
    
    console.log('✓ Expert Helpdesk user created successfully!');
    console.log('');
    console.log('User Details:');
    console.log('─'.repeat(50));
    console.log(`Email:    ${email}`);
    console.log(`Password: ${password}`);
    console.log(`Name:     ${name}`);
    console.log(`Role:     EXPERT_HELPDESK`);
    console.log(`ID:       ${user.id}`);
    console.log('─'.repeat(50));
    console.log('');
    console.log('You can now login with these credentials.');
    
  } catch (error) {
    console.error('Error creating expert helpdesk user:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createExpertHelpdeskUser();
