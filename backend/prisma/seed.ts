/// <reference types="node" />
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding data...');

  const passwordHash = await bcrypt.hash('password123', 10);

  // Managers
  const manager1 = await prisma.user.upsert({
    where: { email: 'manager1@taskpulse.com' },
    update: {},
    create: {
      name: 'Alice Manager',
      email: 'manager1@taskpulse.com',
      password: passwordHash,
      role: 'MANAGER',
    },
  });

  const manager2 = await prisma.user.upsert({
    where: { email: 'manager2@taskpulse.com' },
    update: {},
    create: {
      name: 'Bob Manager',
      email: 'manager2@taskpulse.com',
      password: passwordHash,
      role: 'MANAGER',
    },
  });

  // Employees
  const emp1 = await prisma.user.upsert({
    where: { email: 'emp1@taskpulse.com' },
    update: {},
    create: {
      name: 'Charlie Employee',
      email: 'emp1@taskpulse.com',
      password: passwordHash,
      role: 'EMPLOYEE',
    },
  });

  const emp2 = await prisma.user.upsert({
    where: { email: 'emp2@taskpulse.com' },
    update: {},
    create: {
      name: 'Diana Employee',
      email: 'emp2@taskpulse.com',
      password: passwordHash,
      role: 'EMPLOYEE',
    },
  });

  const emp3 = await prisma.user.upsert({
    where: { email: 'evan@taskpulse.com' },
    update: {},
    create: {
      name: 'Evan Employee',
      email: 'evan@taskpulse.com',
      password: passwordHash,
      role: 'EMPLOYEE',
    },
  });

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
