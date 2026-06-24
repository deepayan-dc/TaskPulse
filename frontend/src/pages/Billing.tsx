import { useState, useEffect, useCallback } from 'react';
import {
  Wallet as WalletIcon,
  Activity,
  FileText,
  MessageSquare,
  Cpu,
  AlertTriangle,
  Plus,
  Download,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  billingService,
  rupees,
  UsageSummary,
  WalletInfo,
  Invoice,
} from '../services/billing.service';

type Tab = 'usage' | 'wallet' | 'billing';

const Stat = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
  <div className="glass-panel p-5">
    <div className="text-sm text-gray-400">{label}</div>
    <div className="text-2xl font-bold text-white mt-1">{value}</div>
    {sub && <div className="text-xs text-gray-500 mt-1">{sub}</div>}
  </div>
);

const Billing = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('usage');
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [topupRupees, setTopupRupees] = useState('1000');
  const [gstin, setGstin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    try {
      const [u, w, inv] = await Promise.all([
        billingService.getUsage(),
        billingService.getWallet(),
        billingService.getInvoices(),
      ]);
      setUsage(u);
      setWallet(w);
      setGstin(w.gstin || '');
      setInvoices(inv);
    } catch (e: any) {
      setError(e.message || 'Failed to load billing data');
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'ADMIN') refresh();
  }, [user, refresh]);

  if (user?.role !== 'ADMIN') {
    return <div className="p-8 text-gray-400">Only managers can access billing.</div>;
  }

  const handleTopup = async () => {
    setError('');
    const amountPaise = Math.round(parseFloat(topupRupees) * 100);
    if (!amountPaise || amountPaise < 100) {
      setError('Enter at least ₹1.');
      return;
    }
    setBusy(true);
    try {
      await billingService.topUp(amountPaise);
      await refresh();
    } catch (e: any) {
      setError(e.message || 'Top-up failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleSaveGstin = async () => {
    setError('');
    setBusy(true);
    try {
      await billingService.setGstin(gstin);
      await refresh();
    } catch (e: any) {
      setError(e.message || 'Could not save GSTIN.');
    } finally {
      setBusy(false);
    }
  };

  const tabs: { key: Tab; label: string; icon: typeof Activity }[] = [
    { key: 'usage', label: 'Usage', icon: Activity },
    { key: 'wallet', label: 'Wallet', icon: WalletIcon },
    { key: 'billing', label: 'Billing', icon: FileText },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Billing & Usage</h1>
          <p className="text-gray-400 text-sm">WhatsApp + AI usage, wallet, and GST invoices for your organization.</p>
        </div>
        <button onClick={refresh} className="text-gray-400 hover:text-white" title="Refresh">
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-200 text-sm">
          {error}
        </div>
      )}

      {wallet?.empty && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div className="text-sm text-red-200">
            Your prepaid wallet is empty ({rupees(wallet.balancePaise)}). Top up to keep WhatsApp + AI
            usage running.
          </div>
        </div>
      )}
      {wallet && !wallet.empty && wallet.lowBalance && (
        <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-200">
            Low wallet balance ({rupees(wallet.balancePaise)}). Top up soon to avoid interruption.
          </div>
        </div>
      )}

      <div className="flex gap-2">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                tab === t.key
                  ? 'bg-primary-500/10 text-primary-400 border border-primary-500/20'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
              }`}
            >
              <Icon className="w-4 h-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {/* USAGE */}
      {tab === 'usage' && usage && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">This month ({usage.periodStart.slice(0, 7)})</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Stat
              label="WhatsApp messages"
              value={`${usage.whatsappCount}`}
              sub={`${rupees(usage.whatsappPaise)} • ${(usage.rates.whatsappPaisePerMessage / 100).toFixed(2)} ₹/msg`}
            />
            <Stat
              label="AI calls"
              value={`${usage.aiCalls}`}
              sub={`${rupees(usage.aiPaise)}`}
            />
            <Stat label="Total (excl. GST)" value={rupees(usage.totalPaise)} sub="Month to date" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="glass-panel p-5">
              <div className="flex items-center gap-2 text-gray-300 font-medium mb-3">
                <Cpu className="w-4 h-4" /> AI token usage
              </div>
              <div className="text-sm text-gray-400 space-y-1">
                <div>Input tokens: <span className="text-white">{usage.inputTokens.toLocaleString()}</span></div>
                <div>Output tokens: <span className="text-white">{usage.outputTokens.toLocaleString()}</span></div>
                <div>Cost / 1M input: <span className="text-white">{rupees(usage.rates.aiInputPaisePerMTok)}</span></div>
                <div>Cost / 1M output: <span className="text-white">{rupees(usage.rates.aiOutputPaisePerMTok)}</span></div>
              </div>
            </div>
            <div className="glass-panel p-5">
              <div className="flex items-center gap-2 text-gray-300 font-medium mb-3">
                <MessageSquare className="w-4 h-4" /> WhatsApp
              </div>
              <div className="text-sm text-gray-400 space-y-1">
                <div>Messages sent: <span className="text-white">{usage.whatsappCount}</span></div>
                <div>Rate: <span className="text-white">50 paise / message</span></div>
                <div>Cost: <span className="text-white">{rupees(usage.whatsappPaise)}</span></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* WALLET */}
      {tab === 'wallet' && wallet && (
        <div className="space-y-4">
          <div className="glass-panel p-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-sm text-gray-400">Wallet balance (AI credits)</div>
              <div className="text-4xl font-bold text-white mt-1">{rupees(wallet.balancePaise)}</div>
              {wallet.lowBalance && (
                <div className="text-xs text-yellow-400 mt-1">Low balance — consider topping up.</div>
              )}
            </div>
            <div className="flex items-end gap-2">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Amount (₹)</label>
                <input
                  type="number"
                  min={1}
                  value={topupRupees}
                  onChange={(e) => setTopupRupees(e.target.value)}
                  className="glass-input w-32"
                />
              </div>
              <button
                onClick={handleTopup}
                disabled={busy || !wallet.razorpayConfigured}
                className="btn-primary flex items-center gap-2 disabled:opacity-60"
                title={wallet.razorpayConfigured ? '' : 'Razorpay not configured'}
              >
                <Plus className="w-4 h-4" /> Add credits
              </button>
            </div>
          </div>
          <p className="text-xs text-gray-500">
            Prepaid: usage (50 paise/WhatsApp message + AI per token) is deducted from this balance in
            real time. Amounts are inclusive of {wallet.gstPercent}% GST — a tax invoice is issued for
            each top-up.
          </p>
          {!wallet.razorpayConfigured && (
            <p className="text-xs text-gray-500">
              Razorpay isn't configured yet — set RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET to enable top-ups.
            </p>
          )}
          <div className="glass-panel p-5">
            <h3 className="text-gray-300 font-medium mb-3">Transactions</h3>
            {wallet.transactions.length === 0 ? (
              <p className="text-sm text-gray-500">No transactions yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-gray-400 text-left">
                    <tr>
                      <th className="py-2 pr-4">Date</th>
                      <th className="py-2 pr-4">Type</th>
                      <th className="py-2 pr-4">Source</th>
                      <th className="py-2 pr-4 text-right">Amount</th>
                      <th className="py-2 pr-4 text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-200">
                    {wallet.transactions.map((t) => (
                      <tr key={t.id} className="border-t border-white/5">
                        <td className="py-2 pr-4">{new Date(t.createdAt).toLocaleString()}</td>
                        <td className={`py-2 pr-4 ${t.type === 'CREDIT' ? 'text-green-400' : 'text-red-400'}`}>{t.type}</td>
                        <td className="py-2 pr-4">{t.source}</td>
                        <td className="py-2 pr-4 text-right">{rupees(t.amountPaise)}</td>
                        <td className="py-2 pr-4 text-right">{rupees(t.balanceAfterPaise)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* BILLING */}
      {tab === 'billing' && wallet && (
        <div className="space-y-4">
          <div className="glass-panel p-5">
            <h3 className="text-gray-300 font-medium mb-1">GST details</h3>
            <p className="text-xs text-gray-500 mb-3">Your GSTIN appears on every tax invoice.</p>
            <div className="flex items-end gap-2">
              <div className="flex-1 max-w-sm">
                <label className="block text-xs text-gray-400 mb-1">Your GSTIN</label>
                <input
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value.toUpperCase())}
                  placeholder="e.g. 29ABCDE1234F1Z5"
                  className="glass-input w-full"
                />
              </div>
              <button onClick={handleSaveGstin} disabled={busy} className="btn-primary disabled:opacity-60">
                Save
              </button>
            </div>
          </div>
          <div className="glass-panel p-5">
            <h3 className="text-gray-300 font-medium mb-3">Tax invoices (top-ups)</h3>
            {invoices.length === 0 ? (
              <p className="text-sm text-gray-500">No invoices yet. A GST tax invoice is created automatically each time you top up your wallet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-gray-400 text-left">
                    <tr>
                      <th className="py-2 pr-4">Invoice</th>
                      <th className="py-2 pr-4">Date</th>
                      <th className="py-2 pr-4 text-right">Total (incl. GST)</th>
                      <th className="py-2 pr-4">Status</th>
                      <th className="py-2 pr-4"></th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-200">
                    {invoices.map((inv) => (
                      <tr key={inv.id} className="border-t border-white/5">
                        <td className="py-2 pr-4 font-mono">{inv.invoiceNumber}</td>
                        <td className="py-2 pr-4">{inv.createdAt.slice(0, 10)}</td>
                        <td className="py-2 pr-4 text-right">{rupees(inv.totalPaise)}</td>
                        <td className="py-2 pr-4">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${inv.status === 'PAID' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                            {inv.status}
                          </span>
                        </td>
                        <td className="py-2 pr-4 text-right">
                          <button
                            onClick={() => billingService.openInvoiceHtml(inv.id)}
                            className="inline-flex items-center gap-1 text-xs text-primary-400 hover:text-primary-300"
                          >
                            <Download className="w-3.5 h-3.5" /> GST Invoice
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Billing;
