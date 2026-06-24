import { prisma } from './prisma';

/* eslint-disable @typescript-eslint/no-explicit-any */
const columnExists = async (table: string, column: string): Promise<boolean> => {
  const cols: any[] = await prisma.$queryRawUnsafe(`PRAGMA table_info("${table}")`);
  return cols.some((c) => c.name === column);
};

const addColumnIfMissing = async (table: string, column: string, ddl: string): Promise<void> => {
  if (!(await columnExists(table, column))) {
    await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ADD COLUMN ${ddl}`);
  }
};
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * Idempotently apply additive schema changes to an existing, volume-backed
 * SQLite database. Runs through the Prisma client, so it always targets the
 * exact file the app reads — avoiding the Prisma CLI's path-resolution mismatch.
 *
 * Keep these statements in sync with schema.prisma for additive changes.
 */
export const ensureSchema = async (): Promise<void> => {
  // Conversation memory for the WhatsApp chat assistant.
  await prisma.$executeRawUnsafe(
    `CREATE TABLE IF NOT EXISTS "ConversationMessage" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "phone" TEXT NOT NULL,
      "role" TEXT NOT NULL,
      "content" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "ConversationMessage_phone_createdAt_idx"
       ON "ConversationMessage" ("phone", "createdAt")`
  );

  // Multi-tenancy: organizations + manager/org links on users.
  await prisma.$executeRawUnsafe(
    `CREATE TABLE IF NOT EXISTS "Organization" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "name" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`
  );
  await addColumnIfMissing('User', 'organizationId', '"organizationId" TEXT');
  await addColumnIfMissing('User', 'managerId', '"managerId" TEXT');
  await addColumnIfMissing('User', 'mustResetPassword', '"mustResetPassword" BOOLEAN NOT NULL DEFAULT 0');
  await addColumnIfMissing('User', 'designation', '"designation" TEXT');

  // One-time migration: split the old MANAGER/EMPLOYEE roles into a permission
  // role (ADMIN/MEMBER) + a designation (job title). Idempotent — once migrated,
  // no MANAGER/EMPLOYEE rows remain so these affect 0 rows.
  await prisma.$executeRawUnsafe(
    `UPDATE "User" SET "designation" = 'Manager' WHERE "designation" IS NULL AND "role" = 'MANAGER'`
  );
  await prisma.$executeRawUnsafe(
    `UPDATE "User" SET "designation" = 'Employee' WHERE "designation" IS NULL AND "role" = 'EMPLOYEE'`
  );
  await prisma.$executeRawUnsafe(`UPDATE "User" SET "role" = 'ADMIN' WHERE "role" = 'MANAGER'`);
  await prisma.$executeRawUnsafe(`UPDATE "User" SET "role" = 'MEMBER' WHERE "role" = 'EMPLOYEE'`);
  await addColumnIfMissing('Organization', 'gstin', '"gstin" TEXT');
  await addColumnIfMissing('Organization', 'logoUrl', '"logoUrl" TEXT');

  // Billing: wallet, transactions, usage metering, invoices.
  await prisma.$executeRawUnsafe(
    `CREATE TABLE IF NOT EXISTS "Wallet" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "organizationId" TEXT NOT NULL UNIQUE,
      "balancePaise" INTEGER NOT NULL DEFAULT 0,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`
  );
  await prisma.$executeRawUnsafe(
    `CREATE TABLE IF NOT EXISTS "WalletTransaction" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "organizationId" TEXT NOT NULL,
      "type" TEXT NOT NULL,
      "amountPaise" INTEGER NOT NULL,
      "balanceAfterPaise" INTEGER NOT NULL,
      "source" TEXT NOT NULL,
      "reference" TEXT,
      "note" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "WalletTransaction_org_createdAt_idx" ON "WalletTransaction" ("organizationId", "createdAt")`
  );
  await prisma.$executeRawUnsafe(
    `CREATE TABLE IF NOT EXISTS "UsageRecord" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "organizationId" TEXT NOT NULL,
      "kind" TEXT NOT NULL,
      "units" INTEGER NOT NULL DEFAULT 1,
      "inputTokens" INTEGER NOT NULL DEFAULT 0,
      "outputTokens" INTEGER NOT NULL DEFAULT 0,
      "costPaise" INTEGER NOT NULL DEFAULT 0,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "UsageRecord_org_kind_createdAt_idx" ON "UsageRecord" ("organizationId", "kind", "createdAt")`
  );
  await prisma.$executeRawUnsafe(
    `CREATE TABLE IF NOT EXISTS "Invoice" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "organizationId" TEXT NOT NULL,
      "invoiceNumber" TEXT NOT NULL UNIQUE,
      "periodStart" DATETIME NOT NULL,
      "periodEnd" DATETIME NOT NULL,
      "whatsappPaise" INTEGER NOT NULL DEFAULT 0,
      "aiPaise" INTEGER NOT NULL DEFAULT 0,
      "subtotalPaise" INTEGER NOT NULL DEFAULT 0,
      "gstPercent" INTEGER NOT NULL DEFAULT 18,
      "gstPaise" INTEGER NOT NULL DEFAULT 0,
      "totalPaise" INTEGER NOT NULL DEFAULT 0,
      "status" TEXT NOT NULL DEFAULT 'UNPAID',
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "Invoice_org_createdAt_idx" ON "Invoice" ("organizationId", "createdAt")`
  );
};
