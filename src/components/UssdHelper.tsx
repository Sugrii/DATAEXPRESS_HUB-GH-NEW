import React, { useState } from 'react';
import {
  PhoneCall,
  Copy,
  CheckCircle2,
  ExternalLink,
  Zap,
  Smartphone,
  Info,
} from 'lucide-react';

export const UssdHelper: React.FC = () => {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const ussdGroups = [
    {
      network: 'MTN Ghana',
      color: 'border-amber-400/40 bg-amber-950/20',
      tagColor: 'bg-amber-400/20 text-amber-300',
      codes: [
        { code: '*170#', title: 'MTN Mobile Money (MoMo)', desc: 'Send money, cashout, pay bills & approve Paystack prompts' },
        { code: '*138#', title: 'MTN Internet Bundles', desc: 'Browse Non-Expiry data, Flexi bundles & 4G/5G packs' },
        { code: '*138*1#', title: 'MTN Midnight Special', desc: 'Activate heavy night downloads from 12 AM to 5 AM' },
        { code: '*500#', title: 'MTN Just4U', desc: 'Personalized exclusive voice & data discount packages' },
        { code: '*124#', title: 'Check Airtime & Data Balance', desc: 'Instant flash balance SMS notification' },
      ],
    },
    {
      network: 'Telecel Ghana (Vodafone)',
      color: 'border-rose-500/40 bg-rose-950/20',
      tagColor: 'bg-rose-500/20 text-rose-300',
      codes: [
        { code: '*110#', title: 'Telecel Cash', desc: 'Mobile Money wallet transfer, approval & withdrawals' },
        { code: '*700#', title: 'Telecel Bossu & 2 Moorch', desc: 'Daily, weekly and heavy monthly internet packages' },
        { code: '*151#', title: 'Telecel Red Loyalty', desc: 'Voice bundles, roaming and integrated voice/data' },
        { code: '*124#', title: 'Balance Check', desc: 'Check main airtime, bonus and data quota' },
      ],
    },
    {
      network: 'AT Ghana (AirtelTigo)',
      color: 'border-blue-500/40 bg-blue-950/20',
      tagColor: 'bg-blue-500/20 text-blue-300',
      codes: [
        { code: '*110#', title: 'AT Money', desc: 'Wallet services, transfers and merchant payments' },
        { code: '*111#', title: 'Big Time Data Bundles', desc: 'No-expiry data and Sika Kokoo monthly packs' },
        { code: '*100#', title: 'AT Self Service & Balance', desc: 'SIM registration, Airtime & Data balance inquiry' },
        { code: '*533#', title: 'AT Magic Voice', desc: 'Special call discount plans and combos' },
      ],
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="bg-slate-950/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-400 text-xs font-semibold">
            <PhoneCall className="w-3.5 h-3.5" />
            <span>Ghana Telecom Quick USSD Reference</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-['Outfit']">
            USSD Codes Directory
          </h1>
          <p className="text-xs sm:text-sm text-slate-300">
            Quickly check balances, authorize Mobile Money prompts, or verify bundles on your phone with official shortcodes.
          </p>
        </div>
      </div>

      {/* USSD Network Groups */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {ussdGroups.map((grp) => (
          <div
            key={grp.network}
            className={`border rounded-3xl p-6 space-y-4 ${grp.color}`}
          >
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <h3 className="font-bold text-white text-base font-['Outfit']">{grp.network}</h3>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${grp.tagColor}`}>
                Official Shortcodes
              </span>
            </div>

            <div className="space-y-3">
              {grp.codes.map((c) => (
                <div
                  key={c.code}
                  className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-3.5 flex items-start justify-between gap-3 hover:border-slate-700 transition-all"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-amber-400 text-sm">
                        {c.code}
                      </span>
                      <span className="font-semibold text-white text-xs">{c.title}</span>
                    </div>
                    <p className="text-[11px] text-slate-400">{c.desc}</p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleCopy(c.code)}
                      title="Copy USSD Code"
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-amber-400 hover:text-slate-950 text-slate-300 transition-colors"
                    >
                      {copiedCode === c.code ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <a
                      href={`tel:${encodeURIComponent(c.code)}`}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 text-slate-300 transition-colors"
                      title="Dial USSD"
                    >
                      <PhoneCall className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
