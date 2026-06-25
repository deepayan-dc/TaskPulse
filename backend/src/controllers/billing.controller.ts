import { Response, NextFunction } from 'express';
import { config } from '../config';
import { BasicAuthRequest } from '../middleware/basic-auth.middleware';
import { getUsageSummary } from '../services/usage.service';
import { getOrCreateWallet, listWalletTransactions } from '../services/wallet.service';
import {
  resolveManagerOrg,
  applyTopup,
  orgIdFromReceipt,
  setOrganizationGstin,
  getOrganization,
  listInvoices,
  getInvoice,
  renderInvoiceHtml,
} from '../services/billing.service';
import {
  razorpayConfigured,
  razorpayKeyId,
  createRazorpayOrder,
  verifyPaymentSignature,
  verifyWebhookSignature,
  fetchRazorpayPayment,
  fetchRazorpayOrder,
} from '../services/razorpay.service';
import { Request } from 'express';

const monthToDateRange = () => {
  const now = new Date();
  return {
    start: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)),
    end: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)),
  };
};

// GET /billing/usage — month-to-date usage summary.
export const usageController = async (req: BasicAuthRequest, res: Response, next: NextFunction) => {
  try {
    const organizationId = await resolveManagerOrg(req.user!.id);
    const { start, end } = monthToDateRange();
    const summary = await getUsageSummary(organizationId, start, end);
    res.status(200).json({ data: { ...summary, periodStart: start, periodEnd: end } });
  } catch (error) {
    next(error);
  }
};

// GET /billing/wallet — prepaid balance, transactions, low/empty flags, GSTIN.
export const walletController = async (req: BasicAuthRequest, res: Response, next: NextFunction) => {
  try {
    const organizationId = await resolveManagerOrg(req.user!.id);
    const wallet = await getOrCreateWallet(organizationId);
    const transactions = await listWalletTransactions(organizationId);
    const org = await getOrganization(organizationId);
    res.status(200).json({
      data: {
        balancePaise: wallet.balancePaise,
        lowBalancePaise: config.billing.lowBalancePaise,
        lowBalance: wallet.balancePaise > 0 && wallet.balancePaise < config.billing.lowBalancePaise,
        empty: wallet.balancePaise <= 0,
        gstPercent: config.billing.gstPercent,
        gstin: org?.gstin ?? '',
        organizationName: org?.name ?? '',
        razorpayConfigured: razorpayConfigured(),
        transactions,
      },
    });
  } catch (error) {
    next(error);
  }
};

// POST /billing/wallet/topup — create a Razorpay order (amount is GST-inclusive).
export const createTopupOrderController = async (
  req: BasicAuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const organizationId = await resolveManagerOrg(req.user!.id);
    const amountPaise = Math.round(Number(req.body?.amountPaise));
    if (!Number.isFinite(amountPaise) || amountPaise < 100) {
      return res.status(400).json({ message: 'Minimum top-up is ₹1 (amountPaise >= 100)' });
    }
    // Razorpay caps receipt at 40 chars; "tp_" + a 36-char UUID = 39. The org id
    // is recovered from the receipt by the webhook (orgIdFromReceipt).
    const order = await createRazorpayOrder(amountPaise, `tp_${organizationId}`);
    res.status(200).json({
      data: { orderId: order.id, amount: order.amount, currency: order.currency, keyId: razorpayKeyId() },
    });
  } catch (error) {
    next(error);
  }
};

// POST /billing/wallet/verify — verify payment, credit wallet, issue GST recharge invoice.
export const verifyTopupController = async (
  req: BasicAuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const organizationId = await resolveManagerOrg(req.user!.id);
    const orderId = String(req.body?.razorpay_order_id || '');
    const paymentId = String(req.body?.razorpay_payment_id || '');
    const signature = String(req.body?.razorpay_signature || '');

    if (!verifyPaymentSignature(orderId, paymentId, signature)) {
      return res.status(400).json({ message: 'Payment verification failed' });
    }
    const payment = await fetchRazorpayPayment(paymentId);
    if (payment.order_id !== orderId || !['captured', 'authorized'].includes(payment.status)) {
      return res.status(400).json({ message: 'Payment not captured' });
    }

    // Idempotent — the webhook may also credit this same payment.
    const result = await applyTopup(organizationId, paymentId, payment.amount);
    res.status(200).json({ data: { balancePaise: result.balancePaise, invoice: result.invoice } });
  } catch (error) {
    next(error);
  }
};

// POST /billing/webhook/razorpay — server-to-server payment notification.
// No basic auth: authenticated by the Razorpay webhook signature instead.
export const razorpayWebhookController = async (req: Request, res: Response) => {
  try {
    const signature = String(req.headers['x-razorpay-signature'] || '');
    const rawBody =
      (req as Request & { rawBody?: Buffer }).rawBody?.toString('utf8') ?? JSON.stringify(req.body);
    if (!verifyWebhookSignature(rawBody, signature)) {
      return res.status(400).json({ message: 'Invalid webhook signature' });
    }

    const event = req.body?.event;
    if (event === 'payment.captured' || event === 'order.paid') {
      const payment = req.body?.payload?.payment?.entity;
      const orderEntity = req.body?.payload?.order?.entity;
      const orderId = payment?.order_id || orderEntity?.id;
      const paymentId = payment?.id;
      const amount = payment?.amount ?? orderEntity?.amount_paid;
      if (orderId && paymentId && amount) {
        const order = orderEntity?.receipt ? orderEntity : await fetchRazorpayOrder(orderId);
        const organizationId = orgIdFromReceipt(order?.receipt || '');
        if (organizationId) {
          await applyTopup(organizationId, paymentId, amount);
        }
      }
    }
    res.status(200).json({ status: 'ok' });
  } catch (error) {
    console.error('Razorpay webhook processing error:', error);
    // 500 → Razorpay retries; applyTopup is idempotent so retries are safe.
    res.status(500).json({ status: 'error' });
  }
};

// PATCH /billing/organization — set the tenant's GSTIN (appears on invoices).
export const setGstinController = async (
  req: BasicAuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const organizationId = await resolveManagerOrg(req.user!.id);
    const org = await setOrganizationGstin(organizationId, String(req.body?.gstin ?? ''));
    res.status(200).json({ data: { gstin: org.gstin } });
  } catch (error) {
    next(error);
  }
};

// GET /billing/invoices
export const listInvoicesController = async (
  req: BasicAuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const organizationId = await resolveManagerOrg(req.user!.id);
    res.status(200).json({ data: await listInvoices(organizationId) });
  } catch (error) {
    next(error);
  }
};

// GET /billing/invoices/:id/html — printable GST invoice.
export const invoiceHtmlController = async (
  req: BasicAuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const organizationId = await resolveManagerOrg(req.user!.id);
    const html = await renderInvoiceHtml(organizationId, req.params.id);
    res.status(200).type('html').send(html);
  } catch (error) {
    next(error);
  }
};

// GET /billing/invoices/:id
export const getInvoiceController = async (
  req: BasicAuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const organizationId = await resolveManagerOrg(req.user!.id);
    res.status(200).json({ data: await getInvoice(organizationId, req.params.id) });
  } catch (error) {
    next(error);
  }
};
