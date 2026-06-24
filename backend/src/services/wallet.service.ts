import { prisma } from '../lib/prisma';
import { AppError } from '../utils/app-error';

export const getOrCreateWallet = async (organizationId: string) => {
  const existing = await prisma.wallet.findUnique({ where: { organizationId } });
  if (existing) return existing;
  return prisma.wallet.create({ data: { organizationId, balancePaise: 0 } });
};

export const creditWallet = async (
  organizationId: string,
  amountPaise: number,
  source: string,
  reference?: string,
  note?: string
) => {
  return prisma.$transaction(async (tx) => {
    const wallet =
      (await tx.wallet.findUnique({ where: { organizationId } })) ??
      (await tx.wallet.create({ data: { organizationId, balancePaise: 0 } }));
    const balanceAfterPaise = wallet.balancePaise + amountPaise;
    const updated = await tx.wallet.update({
      where: { organizationId },
      data: { balancePaise: balanceAfterPaise },
    });
    await tx.walletTransaction.create({
      data: { organizationId, type: 'CREDIT', amountPaise, balanceAfterPaise, source, reference, note },
    });
    return updated;
  });
};

/** Debit the wallet. Returns false (no change) if the balance is insufficient. */
export const debitWallet = async (
  organizationId: string,
  amountPaise: number,
  source: string,
  reference?: string,
  note?: string
): Promise<boolean> => {
  try {
    await prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({ where: { organizationId } });
      const current = wallet?.balancePaise ?? 0;
      if (current < amountPaise) throw new AppError('Insufficient wallet balance', 400);
      const balanceAfterPaise = current - amountPaise;
      await tx.wallet.update({ where: { organizationId }, data: { balancePaise: balanceAfterPaise } });
      await tx.walletTransaction.create({
        data: { organizationId, type: 'DEBIT', amountPaise, balanceAfterPaise, source, reference, note },
      });
    });
    return true;
  } catch (error) {
    if (error instanceof AppError) return false;
    throw error;
  }
};

/**
 * Decrement the wallet for real-time prepaid usage (a single message or AI call).
 * Does NOT write a WalletTransaction row (the UsageRecord is the detailed ledger)
 * and may go negative as a short grace so live conversations aren't cut off.
 * Returns the balance before and after.
 */
export const decrementWallet = async (
  organizationId: string,
  amountPaise: number
): Promise<{ before: number; after: number }> => {
  return prisma.$transaction(async (tx) => {
    const wallet =
      (await tx.wallet.findUnique({ where: { organizationId } })) ??
      (await tx.wallet.create({ data: { organizationId, balancePaise: 0 } }));
    const before = wallet.balancePaise;
    const after = before - amountPaise;
    await tx.wallet.update({ where: { organizationId }, data: { balancePaise: after } });
    return { before, after };
  });
};

export const listWalletTransactions = (organizationId: string, take = 50) =>
  prisma.walletTransaction.findMany({
    where: { organizationId },
    orderBy: { createdAt: 'desc' },
    take,
  });
