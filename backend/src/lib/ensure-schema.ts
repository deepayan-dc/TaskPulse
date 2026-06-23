import { prisma } from './prisma';

/**
 * Idempotently create tables that may be missing from an existing,
 * volume-backed SQLite database. Runs through the Prisma client, so it always
 * targets the exact file the app reads — avoiding the Prisma CLI's relative
 * path-resolution mismatch with the runtime client.
 *
 * Keep these statements in sync with schema.prisma for additive changes.
 */
export const ensureSchema = async (): Promise<void> => {
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
};
