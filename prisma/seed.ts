import { PrismaClient, RoleKey } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    throw new Error(
      'ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env to seed the database',
    );
  }

  const passwordHash = await bcrypt.hash(adminPassword, 10);

  const adminRole = await prisma.role.upsert({
    where: { key: RoleKey.ADMIN },
    update: { name: 'Administrator' },
    create: {
      key: RoleKey.ADMIN,
      name: 'Administrator',
    },
  });

  await prisma.role.upsert({
    where: { key: RoleKey.TEAM_MEMBER },
    update: { name: 'Team Member' },
    create: {
      key: RoleKey.TEAM_MEMBER,
      name: 'Team Member',
    },
  });

  await prisma.role.upsert({
    where: { key: RoleKey.CLIENT },
    update: { name: 'Client' },
    create: {
      key: RoleKey.CLIENT,
      name: 'Client',
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      fullName: 'Zoon Admin',
      passwordHash,
      roleId: adminRole.id,
    },
    create: {
      email: adminEmail,
      passwordHash,
      fullName: 'Zoon Admin',
      roleId: adminRole.id,
      jobTitle: 'System Administrator',
      department: 'Management',
    },
  });

  console.log('Seeded admin user:', admin.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
