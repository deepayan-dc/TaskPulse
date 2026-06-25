import { prisma } from '../lib/prisma';
import { config } from '../config';
import { AppError } from '../utils/app-error';
import { sendWhatsAppText } from './whatsapp.service';
import { creditWallet, getOrCreateWallet } from './wallet.service';

const rupees = (paise: number) => `₹${(paise / 100).toFixed(2)}`;

// Recreated QverLabs logo (approximation — replace via COMPANY_LOGO_URL with the official asset).
const QVERLABS_SVG = `<svg width="150" height="36" viewBox="0 0 150 36" xmlns="http://www.w3.org/2000/svg">
  <defs><linearGradient id="qg" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#FF5FA2"/><stop offset="1" stop-color="#FFB03A"/></linearGradient></defs>
  <path d="M18 4 a14 14 0 1 0 9 24.5" fill="none" stroke="url(#qg)" stroke-width="6.5" stroke-linecap="round"/>
  <circle cx="27" cy="28.5" r="4.5" fill="#7C3AED"/>
  <text x="40" y="25" font-family="Arial,Helvetica,sans-serif" font-size="20" font-weight="700" fill="#1f2937">QverLabs</text>
</svg>`;

const companyLogoHtml = () => {
  const logo = config.billing.company.logoUrl;
  return logo
    ? `<img src="${logo}" alt="${config.billing.company.name}" style="height:36px"/>`
    : QVERLABS_SVG;
};

/**
 * Apply a successful Razorpay top-up: credit the wallet and issue a GST recharge
 * invoice. Idempotent — a payment id is only ever credited once, so it's safe to
 * call from BOTH the client-side verify callback AND the webhook.
 */
export const applyTopup = async (
  organizationId: string,
  paymentId: string,
  amountPaise: number
) => {
  const existing = await prisma.walletTransaction.findFirst({
    where: { reference: paymentId, source: 'RAZORPAY_TOPUP' },
  });
  if (existing) {
    const wallet = await getOrCreateWallet(organizationId);
    return { balancePaise: wallet.balancePaise, invoice: null, alreadyProcessed: true };
  }
  const wallet = await creditWallet(organizationId, amountPaise, 'RAZORPAY_TOPUP', paymentId, 'Wallet top-up');
  const invoice = await createRechargeInvoice(organizationId, amountPaise);
  return { balancePaise: wallet.balancePaise, invoice, alreadyProcessed: false };
};

/** Extract the organization id (a UUID) from an order receipt, regardless of the
 *  surrounding prefix/suffix (e.g. `tp_<orgId>` or legacy `wallet_<orgId>_<ts>`). */
export const orgIdFromReceipt = (receipt: string): string | null => {
  const match = (receipt || '').match(
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
  );
  return match ? match[0] : null;
};

/**
 * Resolve the billing organization for a manager, creating one if they don't
 * have it yet (every tenant manager needs an org for billing/wallet).
 */
export const resolveManagerOrg = async (userId: string): Promise<string> => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.role !== 'ADMIN') {
    throw new AppError('Only organization admins can access billing', 403);
  }
  if (user.organizationId) return user.organizationId;
  const org = await prisma.organization.create({ data: { name: `${user.name}'s Organization` } });
  await prisma.user.update({ where: { id: user.id }, data: { organizationId: org.id } });
  return org.id;
};

/** Notify the org's managers on WhatsApp (not metered — these are our own notices). */
export const notifyManagersLowBalance = async (
  organizationId: string,
  balancePaise: number,
  empty: boolean
) => {
  const managers = await prisma.user.findMany({
    where: { organizationId, role: 'MANAGER', phone: { not: null } },
    select: { phone: true },
  });
  const message = empty
    ? `TaskPulse: your prepaid wallet is empty (balance ${rupees(balancePaise)}). ` +
      `WhatsApp + AI usage may be interrupted — please top up to keep your service running.`
    : `TaskPulse: your prepaid wallet is running low (balance ${rupees(balancePaise)}). ` +
      `Top up soon to avoid interruption.`;
  for (const m of managers) {
    if (m.phone) await sendWhatsAppText(m.phone, message);
  }
};

/**
 * Create a GST tax invoice for a prepaid wallet recharge. The paid amount is
 * GST-inclusive: taxable value + GST = amount paid.
 */
export const createRechargeInvoice = async (organizationId: string, totalPaise: number) => {
  const gstPercent = config.billing.gstPercent;
  const subtotalPaise = Math.round((totalPaise * 100) / (100 + gstPercent));
  const gstPaise = totalPaise - subtotalPaise;

  const count = await prisma.invoice.count();
  const now = new Date();
  const invoiceNumber = `${config.billing.company.invoicePrefix}-${now.getUTCFullYear()}${String(
    now.getUTCMonth() + 1
  ).padStart(2, '0')}-${String(count + 1).padStart(4, '0')}`;

  return prisma.invoice.create({
    data: {
      organizationId,
      invoiceNumber,
      periodStart: now,
      periodEnd: now,
      whatsappPaise: 0,
      aiPaise: 0,
      subtotalPaise,
      gstPercent,
      gstPaise,
      totalPaise,
      status: 'PAID',
    },
  });
};

export const setOrganizationGstin = async (organizationId: string, gstin: string) => {
  const value = (gstin || '').trim().toUpperCase();
  return prisma.organization.update({ where: { id: organizationId }, data: { gstin: value || null } });
};

export const getOrganization = (organizationId: string) =>
  prisma.organization.findUnique({ where: { id: organizationId } });

export const listInvoices = (organizationId: string) =>
  prisma.invoice.findMany({ where: { organizationId }, orderBy: { createdAt: 'desc' } });

export const getInvoice = async (organizationId: string, invoiceId: string) => {
  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice || invoice.organizationId !== organizationId) {
    throw new AppError('Invoice not found', 404);
  }
  return invoice;
};

/** Self-contained printable HTML for a GST tax invoice (prepaid recharge). */
export const renderInvoiceHtml = async (organizationId: string, invoiceId: string) => {
  const invoice = await getInvoice(organizationId, invoiceId);
  const org = await prisma.organization.findUnique({ where: { id: organizationId } });
  const company = config.billing.company;
  const cgst = Math.round(invoice.gstPaise / 2);
  const sgst = invoice.gstPaise - cgst;

  return `<!doctype html><html><head><meta charset="utf-8"><title>${invoice.invoiceNumber}</title>
<style>
  body{font-family:Arial,Helvetica,sans-serif;color:#111;max-width:760px;margin:24px auto;padding:0 16px}
  h1{font-size:22px;margin:0}
  .muted{color:#666;font-size:13px}
  .row{display:flex;justify-content:space-between;gap:24px;margin-top:16px}
  table{width:100%;border-collapse:collapse;margin-top:24px}
  th,td{border:1px solid #ddd;padding:8px;text-align:left;font-size:14px}
  td.amt,th.amt{text-align:right}
  .totals td{border:none;padding:4px 8px}
  .totals{margin-top:12px;width:320px;margin-left:auto}
  .grand{font-weight:bold;font-size:16px;border-top:2px solid #111}
  .status{display:inline-block;padding:2px 10px;border-radius:12px;font-size:12px;font-weight:bold;background:#dcfce7;color:#166534}
  @media print{button{display:none}}
</style></head><body>
  <div class="row">
    <div>
      <div style="margin-bottom:6px">${companyLogoHtml()}</div>
      <div class="muted">${company.address || ''}</div>
      <div class="muted">${company.gstin ? 'GSTIN: ' + company.gstin : 'GSTIN: —'}${company.state ? ' • ' + company.state : ''}</div>
    </div>
    <div style="text-align:right">
      <h1>TAX INVOICE</h1>
      <div class="muted">${invoice.invoiceNumber}</div>
      <div class="muted">Date: ${invoice.createdAt.toISOString().slice(0, 10)}</div>
      <div><span class="status">${invoice.status}</span></div>
    </div>
  </div>
  <div class="row">
    <div>
      <div class="muted">Billed to</div>
      <div><strong>${org?.name ?? 'Organization'}</strong></div>
      <div class="muted">GSTIN: ${org?.gstin || '—'}</div>
    </div>
    <div style="text-align:right">
      <div class="muted">Supply</div>
      <div>Prepaid credits (SaaS)</div>
    </div>
  </div>
  <table>
    <thead><tr><th>Description</th><th class="amt">Taxable value</th></tr></thead>
    <tbody>
      <tr><td>Prepaid wallet recharge — TaskPulse credits (WhatsApp + AI usage)</td><td class="amt">${rupees(invoice.subtotalPaise)}</td></tr>
    </tbody>
  </table>
  <table class="totals">
    <tr><td>Taxable value</td><td class="amt">${rupees(invoice.subtotalPaise)}</td></tr>
    <tr><td>CGST @ ${invoice.gstPercent / 2}%</td><td class="amt">${rupees(cgst)}</td></tr>
    <tr><td>SGST @ ${invoice.gstPercent / 2}%</td><td class="amt">${rupees(sgst)}</td></tr>
    <tr class="grand"><td>Total paid</td><td class="amt">${rupees(invoice.totalPaise)}</td></tr>
  </table>
  <p class="muted" style="margin-top:24px;font-size:12px">Amount is inclusive of GST. CGST/SGST shown for intra-state supply; inter-state is levied as IGST @ ${invoice.gstPercent}%. This is a computer-generated invoice.</p>
  <button onclick="window.print()" style="margin-top:16px;padding:8px 16px">Print / Save as PDF</button>
</body></html>`;
};
