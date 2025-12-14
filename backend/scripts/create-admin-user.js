const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function createUsers() {
  const users = [
    {
      email: 'admin@kardex.com',
      password: 'admin123',
      name: 'Admin User',
      role: 'ADMIN'
    },
    {
      email: 'kishore@gmail.com',
      password: 'kishore@123',
      name: 'Kishore',
      role: 'ZONE_MANAGER',
      zoneId: '2'
    }
  ];

  try {
    for (const userData of users) {
      const { email, password, name, role, zoneId } = userData;
      
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email }
      });

      if (existingUser) {
        console.log(`User with email ${email} already exists. Updating...`);
        
        // Update existing user
        const updatedUser = await prisma.user.update({
          where: { email },
          data: {
            role,
            password: await bcrypt.hash(password, 10),
            isActive: true,
            lastPasswordChange: new Date(),
            ...(zoneId && { zoneId })
          }
        });
        
        console.log(`✅ ${role} user updated successfully!`);
        console.log(`Email: ${updatedUser.email}`);
        console.log(`Role: ${updatedUser.role}`);
        continue;
      }

      // Create new user
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          role,
          isActive: true,
          tokenVersion: '1',
          lastPasswordChange: new Date(),
          ...(zoneId && { zoneId })
        }
      });

      console.log(`✅ ${role} user created successfully!`);
      console.log(`Email: ${user.email}`);
      console.log(`Role: ${user.role}`);
      if (zoneId) console.log(`Zone ID: ${user.zoneId}`);
    }
    
  } catch (error) {
    console.error('❌ Error creating users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createUsers();
