import { prisma } from '../lib/prisma';
import { config } from '../config';
import { decrementWallet } from './wallet.service';

/**
 * Prepaid: after debiting the wallet, notify managers once when the balance
 * crosses the low threshold or hits empty. Dynamic import of billing.service
 * avoids a static import cycle (whatsapp → usage → billing → whatsapp).
 */
const maybeNotifyLowBalance = async (organizationId: string, before: number, after: number) => {
  const threshold = config.billing.lowBalancePaise;
  const empty = after <= 0 && before > 0;
  const low = before > threshold && after <= threshold;
  if (!empty && !low) return;
  try {
    const billing = await import('./billing.service');
    await billing.notifyManagersLowBalance(organizationId, after, empty);
  } catch (error) {
    console.error('Low-balance notification failed:', error);
  }
};

const chargeUsage = async (organizationId: string, costPaise: number) => {
  if (costPaise <= 0) return;
  const { before, after } = await decrementWallet(organizationId, costPaise);
  await maybeNotifyLowBalance(organizationId, before, after);
};

/** Record one billable WhatsApp message and debit the prepaid wallet. */
export const recordWhatsAppUsage = async (organizationId?: string | null): Promise<void> => {
  if (!organizationId) return;
  const cost = config.billing.whatsappPaisePerMessage;
  try {
    await prisma.usageRecord.create({
      data: { organizationId, kind: 'WHATSAPP', units: 1, costPaise: cost },
    });
    await chargeUsage(organizationId, cost);
  } catch (error) {
    console.error('recordWhatsAppUsage failed:', error);
  }
};

/** Cost (in paise) of an AI call given token counts. */
export const aiCostPaise = (inputTokens: number, outputTokens: number): number => {
  const inCost = (inputTokens / 1_000_000) * config.billing.aiInputPaisePerMTok;
  const outCost = (outputTokens / 1_000_000) * config.billing.aiOutputPaisePerMTok;
  return Math.round(inCost + outCost);
};

/** Record one AI (Claude) call's token usage + cost against an organization. */
export const recordAiUsage = async (
  organizationId: string | null | undefined,
  inputTokens: number,
  outputTokens: number
): Promise<void> => {
  if (!organizationId || (inputTokens <= 0 && outputTokens <= 0)) return;
  const cost = aiCostPaise(inputTokens, outputTokens);
  try {
    await prisma.usageRecord.create({
      data: { organizationId, kind: 'AI', units: 1, inputTokens, outputTokens, costPaise: cost },
    });
    await chargeUsage(organizationId, cost);
  } catch (error) {
    console.error('recordAiUsage failed:', error);
  }
};

export type UsageSummary = {
  whatsappCount: number;
  whatsappPaise: number;
  aiCalls: number;
  inputTokens: number;
  outputTokens: number;
  aiPaise: number;
  totalPaise: number;
  rates: {
    whatsappPaisePerMessage: number;
    aiInputPaisePerMTok: number;
    aiOutputPaisePerMTok: number;
  };
};

/** Aggregate an organization's usage over [start, end). */
export const getUsageSummary = async (
  organizationId: string,
  start: Date,
  end: Date
): Promise<UsageSummary> => {
  const records = await prisma.usageRecord.findMany({
    where: { organizationId, createdAt: { gte: start, lt: end } },
    select: { kind: true, units: true, inputTokens: true, outputTokens: true, costPaise: true },
  });

  const s: UsageSummary = {
    whatsappCount: 0,
    whatsappPaise: 0,
    aiCalls: 0,
    inputTokens: 0,
    outputTokens: 0,
    aiPaise: 0,
    totalPaise: 0,
    rates: {
      whatsappPaisePerMessage: config.billing.whatsappPaisePerMessage,
      aiInputPaisePerMTok: config.billing.aiInputPaisePerMTok,
      aiOutputPaisePerMTok: config.billing.aiOutputPaisePerMTok,
    },
  };

  for (const r of records) {
    if (r.kind === 'WHATSAPP') {
      s.whatsappCount += r.units;
      s.whatsappPaise += r.costPaise;
    } else if (r.kind === 'AI') {
      s.aiCalls += 1;
      s.inputTokens += r.inputTokens;
      s.outputTokens += r.outputTokens;
      s.aiPaise += r.costPaise;
    }
  }
  s.totalPaise = s.whatsappPaise + s.aiPaise;
  return s;
};
