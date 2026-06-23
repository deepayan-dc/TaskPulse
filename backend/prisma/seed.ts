/// <reference types="node" />
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding data...');

  const passwordHash = await bcrypt.hash('password123', 10);

  // Managers
  // NOTE: phone numbers below are placeholders. Replace with real,
  // WhatsApp-opted-in numbers (international format, e.g. 919625587090)
  // for messages to actually be delivered by Gupshup.
  const rajesh = await prisma.user.upsert({
    where: { email: 'manager1@test.com' },
    update: { phone: '919000000001' },
    create: {
      name: 'Rajesh Gupta',
      email: 'manager1@test.com',
      password: passwordHash,
      role: 'MANAGER',
      phone: '919000000001',
    },
  });

  const anita = await prisma.user.upsert({
    where: { email: 'manager2@test.com' },
    update: { phone: '919000000002' },
    create: {
      name: 'Anita Sharma',
      email: 'manager2@test.com',
      password: passwordHash,
      role: 'MANAGER',
      phone: '919000000002',
    },
  });

  // Employees
  const vikram = await prisma.user.upsert({
    where: { email: 'employee1@test.com' },
    update: { phone: '919000000003' },
    create: {
      name: 'Vikram Patel',
      email: 'employee1@test.com',
      password: passwordHash,
      role: 'EMPLOYEE',
      phone: '919000000003',
    },
  });

  const priya = await prisma.user.upsert({
    where: { email: 'employee2@test.com' },
    update: { phone: '919000000004' },
    create: {
      name: 'Priya Singh',
      email: 'employee2@test.com',
      password: passwordHash,
      role: 'EMPLOYEE',
      phone: '919000000004',
    },
  });

  const arjun = await prisma.user.upsert({
    where: { email: 'employee3@test.com' },
    update: { phone: '919000000005' },
    create: {
      name: 'Arjun Mehta',
      email: 'employee3@test.com',
      password: passwordHash,
      role: 'EMPLOYEE',
      phone: '919000000005',
    },
  });

  // Seed some initial tasks to demonstrate team-scoped visibility
  // Rajesh's Team Tasks
  await prisma.task.create({
    data: {
      title: 'Update landing page hero section',
      description: 'The marketing team requested a new layout for the hero section.',
      status: 'In Progress',
      assignedToId: vikram.id,
      createdById: rajesh.id,
      dueDate: new Date(Date.now() + 86400000),
    }
  });

  await prisma.task.create({
    data: {
      title: 'Fix payment gateway timeout',
      description: 'Customers are reporting timeouts during checkout. Investigate Stripe integration.',
      status: 'Pending',
      assignedToId: priya.id,
      createdById: rajesh.id,
      dueDate: new Date(Date.now() - 86400000),
    }
  });

  // Anita's Team Tasks
  await prisma.task.create({
    data: {
      title: 'Write Q3 API Documentation',
      description: 'Document the new user management endpoints introduced in Q3.',
      status: 'Completed',
      assignedToId: arjun.id,
      createdById: anita.id,
      dueDate: new Date(Date.now() + 86400000 * 5),
    }
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
