import { apiFetch } from './api';

export interface UsageSummary {
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
  periodStart: string;
  periodEnd: string;
}

export interface WalletTxn {
  id: string;
  type: 'CREDIT' | 'DEBIT';
  amountPaise: number;
  balanceAfterPaise: number;
  source: string;
  reference?: string | null;
  note?: string | null;
  createdAt: string;
}

export interface WalletInfo {
  balancePaise: number;
  lowBalancePaise: number;
  lowBalance: boolean;
  empty: boolean;
  gstPercent: number;
  gstin: string;
  organizationName: string;
  razorpayConfigured: boolean;
  transactions: WalletTxn[];
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  periodStart: string;
  periodEnd: string;
  whatsappPaise: number;
  aiPaise: number;
  subtotalPaise: number;
  gstPercent: number;
  gstPaise: number;
  totalPaise: number;
  status: 'PAID' | 'UNPAID';
  createdAt: string;
}

export const rupees = (paise: number) => `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const loadRazorpay = (): Promise<boolean> =>
  new Promise((resolve) => {
    if ((window as any).Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

export const billingService = {
  async getUsage(): Promise<UsageSummary> {
    const res = await apiFetch('/billing/usage');
    return (await res.json()).data;
  },

  async getWallet(): Promise<WalletInfo> {
    const res = await apiFetch('/billing/wallet');
    return (await res.json()).data;
  },

  async getInvoices(): Promise<Invoice[]> {
    const res = await apiFetch('/billing/invoices');
    return (await res.json()).data;
  },

  async setGstin(gstin: string): Promise<void> {
    await apiFetch('/billing/organization', { method: 'PATCH', body: JSON.stringify({ gstin }) });
  },

  async openInvoiceHtml(id: string): Promise<void> {
    const res = await apiFetch(`/billing/invoices/${id}/html`);
    const html = await res.text();
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
    window.open(url, '_blank');
  },

  /**
   * Top up the wallet via Razorpay Checkout. Returns the new balance (paise) on
   * success. Throws if Razorpay isn't configured or the user cancels.
   */
  async topUp(amountPaise: number): Promise<number> {
    const orderRes = await apiFetch('/billing/wallet/topup', {
      method: 'POST',
      body: JSON.stringify({ amountPaise }),
    });
    const order = (await orderRes.json()).data as {
      orderId: string;
      amount: number;
      currency: string;
      keyId: string;
    };

    const ok = await loadRazorpay();
    if (!ok) throw new Error('Could not load Razorpay checkout.');

    return new Promise<number>((resolve, reject) => {
      const rzp = new (window as any).Razorpay({
        key: order.keyId,
        order_id: order.orderId,
        amount: order.amount,
        currency: order.currency,
        name: 'TaskPulse',
        description: 'Wallet top-up',
        handler: async (response: any) => {
          try {
            const verifyRes = await apiFetch('/billing/wallet/verify', {
              method: 'POST',
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });
            const data = (await verifyRes.json()).data as { balancePaise: number };
            resolve(data.balancePaise);
          } catch (err) {
            reject(err);
          }
        },
        modal: { ondismiss: () => reject(new Error('Payment cancelled')) },
      });
      rzp.open();
    });
  },
};
