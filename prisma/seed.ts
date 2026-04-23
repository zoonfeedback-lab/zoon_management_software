import { PrismaClient, RoleKey } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('Admin@123', 10);

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

  const admin = await prisma.user.upsert({
    where: { email: 'zoon.feedback@gmail.com' },
    update: {
      fullName: 'Zoon Admin',
      passwordHash,
      roleId: adminRole.id,
    },
    create: {
      email: 'zoon.feedback@gmail.com',
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
