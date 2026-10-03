import React, { useState } from 'react';
import {
  CreditCard,
  CheckCircle2,
  Sparkles,
  Zap,
  ShieldCheck,
  Building2,
  Database,
  Download,
  Calendar,
  ExternalLink,
  ChevronRight,
  Receipt
} from 'lucide-react';
import { useTrading } from '../../context/TradingContext';

export const SubscriptionSettingsTab: React.FC = () => {
  const { addToast, theme } = useTrading();
  const isLight = theme === 'light';

  const [isAnnual, setIsAnnual] = useState(true);

  const invoices = [
    { id: 'INV-2026-008', date: 'August 1, 2026', desc: 'TradeForge Institutional Annual', amount: '$468.00', status: 'PAID' },
    { id: 'INV-2025-008', date: 'August 1, 2025', desc: 'TradeForge Institutional Annual', amount: '$468.00', status: 'PAID' },
    { id: 'INV-2024-008', date: 'August 1, 2024', desc: 'TradeForge Professional Lifetime Beta', amount: '$299.00', status: 'PAID' },
  ];

  const handleDownloadInvoice = (invId: string) => {
    addToast('Invoice Downloaded', `Invoice ${invId} downloaded as PDF receipt.`, 'info');
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[rgba(255,255,255,0.06)]">
        <div>
          <h2 className="text-base font-semibold text-[#F4F5F7] flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-[#818CF8]" />
            Subscription & Institutional Billing
          </h2>
          <p className="text-xs text-[#8A919D] mt-0.5">
            Manage your TradeForge tier, license entitlements, invoices, and payment methods.
          </p>
        </div>
      </div>

      {/* Active Plan Banner */}
      <div className="p-6 rounded-2xl bg-[#0D1014] border border-[rgba(99,102,241,0.35)] shadow-xl relative overflow-hidden space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="text-lg font-bold text-[#F4F5F7] tracking-tight">
                TradeForge Institutional Elite
              </h3>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold tracking-wider uppercase flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                ACTIVE SUBSCRIBER
              </span>
            </div>
            <p className="text-xs text-[#8A919D] mt-1">
              Enterprise-grade execution analytics, automated broker ingestion, and AI coach.
            </p>
          </div>

          <div className="text-right">
            <div className="text-xl font-mono font-bold text-[#F4F5F7]">$39<span className="text-xs text-[#8A919D] font-sans font-normal"> / month (billed annually)</span></div>
            <div className="text-[11px] text-[#8A919D] font-mono mt-0.5">Next renewal: Aug 1, 2027</div>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-[rgba(255,255,255,0.06)] text-xs">
          {[
            'Unlimited automated broker sync bridges',
            'Full Prop Firm compliance guardrails & rule simulator',
            'Integrated AI Quant Coach (Gemini 3.8 Flash)',
            'Multi-account aggregated metrics & equity curves',
            'Mentor mode real-time code sharing & student roster',
            'Cloud encrypted persistence & automated backups',
          ].map((feature, i) => (
            <div key={i} className="flex items-center gap-2 text-[#C2C7D0]">
              <div className="w-4 h-4 rounded-full bg-[#6366F1]/15 text-[#818CF8] flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-3 h-3" />
              </div>
              <span>{feature}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Quotas & Capacity */}
      <div className="p-5 rounded-2xl bg-[#0D1014] border border-[rgba(255,255,255,0.055)] space-y-4">
        <div className="text-xs font-semibold text-[#F4F5F7] uppercase tracking-wider flex items-center gap-2">
          <Database className="w-4 h-4 text-[#818CF8]" />
          Terminal Resource Utilization
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-[#080A0D] border border-[rgba(255,255,255,0.06)] space-y-2">
            <div className="text-[#8A919D] font-medium">Active Portfolios</div>
            <div className="text-base font-bold text-[#F4F5F7] font-mono">4 / ∞</div>
            <div className="w-full bg-[#151A20] h-1.5 rounded-full overflow-hidden">
              <div className="bg-[#6366F1] h-full w-[25%]" />
            </div>
            <div className="text-[10px] text-[#5E6570]">Unlimited Accounts Allowed</div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#080A0D] border border-[rgba(255,255,255,0.06)] space-y-2">
            <div className="text-[#8A919D] font-medium">Cloud Storage Used</div>
            <div className="text-base font-bold text-[#F4F5F7] font-mono">14.8 MB / 5 GB</div>
            <div className="w-full bg-[#151A20] h-1.5 rounded-full overflow-hidden">
              <div className="bg-emerald-500 h-full w-[3%]" />
            </div>
            <div className="text-[10px] text-[#5E6570]">Trade attachments & logs</div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#080A0D] border border-[rgba(255,255,255,0.06)] space-y-2">
            <div className="text-[#8A919D] font-medium">AI Coach Queries</div>
            <div className="text-base font-bold text-[#F4F5F7] font-mono">148 / Unlimited</div>
            <div className="w-full bg-[#151A20] h-1.5 rounded-full overflow-hidden">
              <div className="bg-[#6366F1] h-full w-[100%]" />
            </div>
            <div className="text-[10px] text-[#5E6570]">Zero rate throttling active</div>
          </div>
        </div>
      </div>

      {/* Payment Method */}
      <div className="p-5 rounded-2xl bg-[#0D1014] border border-[rgba(255,255,255,0.055)] space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold text-[#F4F5F7] uppercase tracking-wider flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-[#818CF8]" />
            Payment Method on File
          </div>
          <button
            type="button"
            onClick={() => addToast('Billing Portal', 'Redirecting to secure Stripe billing gateway...', 'info')}
            className="text-xs text-[#818CF8] hover:text-[#A5B4FC] font-semibold cursor-pointer"
          >
            Update Card
          </button>
        </div>

        <div className="p-3.5 rounded-xl bg-[#080A0D] border border-[rgba(255,255,255,0.06)] flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <div className="px-2 py-1 rounded bg-[#11151A] border border-[rgba(255,255,255,0.08)] font-bold text-[10px] text-[#F4F5F7]">
              VISA
            </div>
            <div>
              <div className="font-bold text-[#F4F5F7] font-mono">Visa ending in •••• 8842</div>
              <div className="text-[11px] text-[#8A919D]">Expires 12/2028 • Default Payment Method</div>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            VALID
          </span>
        </div>
      </div>

      {/* Invoices */}
      <div className="p-5 rounded-2xl bg-[#0D1014] border border-[rgba(255,255,255,0.055)] space-y-4">
        <div className="text-xs font-semibold text-[#F4F5F7] uppercase tracking-wider flex items-center gap-2">
          <Receipt className="w-4 h-4 text-[#818CF8]" />
          Billing History & Invoices
        </div>

        <div className="space-y-2">
          {invoices.map(inv => (
            <div
              key={inv.id}
              className="p-3 rounded-xl bg-[#080A0D] border border-[rgba(255,255,255,0.06)] flex items-center justify-between text-xs"
            >
              <div>
                <div className="font-medium text-[#F4F5F7] flex items-center gap-2">
                  <span>{inv.desc}</span>
                  <span className="text-[10px] font-mono text-[#8A919D]">({inv.id})</span>
                </div>
                <div className="text-[11px] text-[#5E6570] mt-0.5">{inv.date}</div>
              </div>

              <div className="flex items-center gap-3">
                <span className="font-mono font-bold text-[#F4F5F7]">{inv.amount}</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  {inv.status}
                </span>
                <button
                  type="button"
                  onClick={() => handleDownloadInvoice(inv.id)}
                  className="p-1.5 rounded-lg bg-[#11151A] hover:bg-[#151A20] text-[#C2C7D0] hover:text-[#F4F5F7] border border-[rgba(255,255,255,0.08)] transition cursor-pointer"
                  title="Download Receipt"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
