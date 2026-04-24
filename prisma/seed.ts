import { PrismaClient, RoleKey } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('admin123', 10);

  const adminRole = await prisma.role.upsert({
    where: { key: RoleKey.ADMIN },
    update: { name: 'Administrator' },
    create: {
      key: RoleKey.ADMIN,
      name: 'Administrator',
    },
  });

  await prisma.role.upsert({
    where: { key: RoleKey.INTERNEE },
    update: { name: 'Internee' },
    create: {
      key: RoleKey.INTERNEE,
      name: 'Internee',
    },
  });

  await prisma.role.upsert({
    where: { key: RoleKey.CORE_TEAM },
    update: { name: 'Core Team' },
    create: {
      key: RoleKey.CORE_TEAM,
      name: 'Core Team',
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
    where: { email: 'admin@zoon.com' },
    update: {
      fullName: 'Zoon Admin',
      passwordHash,
      roleId: adminRole.id,
    },
    create: {
      email: 'admin@zoon.com',
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
