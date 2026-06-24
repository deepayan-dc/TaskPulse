import crypto from 'crypto';
import { config } from '../config';
import { AppError } from '../utils/app-error';

const RAZORPAY_API = 'https://api.razorpay.com/v1';

export const razorpayConfigured = (): boolean =>
  Boolean(config.razorpay.keyId && config.razorpay.keySecret);

export const razorpayKeyId = (): string => config.razorpay.keyId;

/** Create a Razorpay order for a wallet top-up (amount in paise). */
export const createRazorpayOrder = async (amountPaise: number, receipt: string) => {
  if (!razorpayConfigured()) {
    throw new AppError('Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.', 500);
  }
  const auth = Buffer.from(`${config.razorpay.keyId}:${config.razorpay.keySecret}`).toString('base64');
  const response = await fetch(`${RAZORPAY_API}/orders`, {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: amountPaise, currency: 'INR', receipt, payment_capture: 1 }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new AppError(`Razorpay order creation failed: ${JSON.stringify(data)}`, 502);
  }
  return data as { id: string; amount: number; currency: string; receipt: string };
};

/** Fetch an order from Razorpay (its receipt encodes our organization id). */
export const fetchRazorpayOrder = async (orderId: string) => {
  const auth = Buffer.from(`${config.razorpay.keyId}:${config.razorpay.keySecret}`).toString('base64');
  const response = await fetch(`${RAZORPAY_API}/orders/${orderId}`, {
    headers: { Authorization: `Basic ${auth}` },
  });
  const data = await response.json();
  if (!response.ok) {
    throw new AppError(`Razorpay order fetch failed: ${JSON.stringify(data)}`, 502);
  }
  return data as { id: string; receipt: string; amount: number; status: string };
};

export const razorpayWebhookConfigured = (): boolean => Boolean(config.razorpay.webhookSecret);

/** Verify a Razorpay webhook payload against the webhook signing secret. */
export const verifyWebhookSignature = (rawBody: string, signature: string): boolean => {
  if (!config.razorpay.webhookSecret || !signature) return false;
  const expected = crypto
    .createHmac('sha256', config.razorpay.webhookSecret)
    .update(rawBody)
    .digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

/** Fetch a payment from Razorpay (to read the authoritative captured amount). */
export const fetchRazorpayPayment = async (paymentId: string) => {
  const auth = Buffer.from(`${config.razorpay.keyId}:${config.razorpay.keySecret}`).toString('base64');
  const response = await fetch(`${RAZORPAY_API}/payments/${paymentId}`, {
    headers: { Authorization: `Basic ${auth}` },
  });
  const data = await response.json();
  if (!response.ok) {
    throw new AppError(`Razorpay payment fetch failed: ${JSON.stringify(data)}`, 502);
  }
  return data as { id: string; amount: number; status: string; order_id: string };
};

/** Verify the payment signature returned by Razorpay Checkout. */
export const verifyPaymentSignature = (
  orderId: string,
  paymentId: string,
  signature: string
): boolean => {
  if (!razorpayConfigured() || !orderId || !paymentId || !signature) return false;
  const expected = crypto
    .createHmac('sha256', config.razorpay.keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};
