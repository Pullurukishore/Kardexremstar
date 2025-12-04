const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function createAdminUser() {
  const email = 'admin@kardex.com';
  const password = 'admin123';
  const name = 'Admin User';

  try {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      console.log(`User with email ${email} already exists. Updating to admin role...`);
      
      // Update existing user to admin
      const updatedUser = await prisma.user.update({
        where: { email },
        data: {
          role: 'ADMIN',
          password: await bcrypt.hash(password, 10),
          isActive: true,
          lastPasswordChange: new Date()
        }
      });
      
      console.log('✅ Admin user updated successfully!');
      console.log(`Email: ${updatedUser.email}`);
      console.log(`Role: ${updatedUser.role}`);
      return;
    }

    // Create new admin user
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: 'ADMIN',
        isActive: true,
        tokenVersion: '1',
        lastPasswordChange: new Date()
      }
    });

    console.log('✅ Admin user created successfully!');
    console.log(`Email: ${user.email}`);
    console.log(`Role: ${user.role}`);
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdminUser();
