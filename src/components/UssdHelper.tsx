import React, { useState } from 'react';
import { TelecomNetwork } from '../types';
import { TELECOM_NETWORKS } from '../data/telecomCatalog';
import { PhoneCall, Copy, Check, Smartphone, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';

interface UssdCode {
  title: string;
  code: string;
  network: TelecomNetwork | 'ALL';
  purpose: string;
}

const COMMON_USSD: UssdCode[] = [
  { title: 'MTN Mobile Money Menu', code: '*170#', network: 'MTN', purpose: 'Transfer, Cash Out, Pay Bills, Approvals' },
  { title: 'MTN Balance Check', code: '*124#', network: 'MTN', purpose: 'Main Airtime & Bonus Account balance' },
  { title: 'MTN Mashup / Pulse', code: '*567#', network: 'MTN', purpose: 'Custom flexible voice & data bundles' },
  { title: 'MTN Data Balance', code: '*138#', network: 'MTN', purpose: 'Check active data allowances and expiry' },

  { title: 'Telecel Cash Menu', code: '*110#', network: 'TELECEL', purpose: 'Telecel Cash, Bank Transfers, Merchant Pay' },
  { title: 'Telecel Balance Check', code: '*124#', network: 'TELECEL', purpose: 'Airtime balance query' },
  { title: 'Telecel Made4U Bundles', code: '*530#', network: 'TELECEL', purpose: 'Discounted personalized offers' },

  { title: 'AT Money Menu', code: '*110#', network: 'AIRTELTIGO', purpose: 'AT Mobile Money wallet services' },
  { title: 'AT Balance Check', code: '*134#', network: 'AIRTELTIGO', purpose: 'Airtime and credit query' },
  { title: 'AT Big Time Data', code: '*111#', network: 'AIRTELTIGO', purpose: 'No expiry data self-service menu' },

  { title: 'Emergency Services', code: '112', network: 'ALL', purpose: 'National Police, Fire & Ambulance response' },
];

export const UssdHelper: React.FC = () => {
  const [selectedNetwork, setSelectedNetwork] = useState<TelecomNetwork | 'ALL'>('ALL');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const filtered = selectedNetwork === 'ALL'
    ? COMMON_USSD
    : COMMON_USSD.filter((u) => u.network === selectedNetwork || u.network === 'ALL');

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <PhoneCall className="w-5 h-5 text-amber-400" />
              Ghana Telecom Offline USSD Directory
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Direct shortcodes for balance verification, approvals, and carrier self-service.
            </p>
          </div>

          <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setSelectedNetwork('ALL')}
              className={`px-3 py-1 rounded-lg font-bold transition-colors ${
                selectedNetwork === 'ALL' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setSelectedNetwork('MTN')}
              className={`px-3 py-1 rounded-lg font-bold transition-colors ${
                selectedNetwork === 'MTN' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              MTN
            </button>
            <button
              onClick={() => setSelectedNetwork('TELECEL')}
              className={`px-3 py-1 rounded-lg font-bold transition-colors ${
                selectedNetwork === 'TELECEL' ? 'bg-red-500 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Telecel
            </button>
            <button
              onClick={() => setSelectedNetwork('AIRTELTIGO')}
              className={`px-3 py-1 rounded-lg font-bold transition-colors ${
                selectedNetwork === 'AIRTELTIGO' ? 'bg-blue-500 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              AT
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-6">
          {filtered.map((item) => (
            <div
              key={item.code + item.title}
              className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition-all flex items-center justify-between gap-4"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-slate-200">{item.title}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-slate-900 border border-slate-800 text-slate-400">
                    {item.network}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">{item.purpose}</p>
                <div className="mt-2 text-base font-black font-mono text-amber-400 tracking-wider">
                  {item.code}
                </div>
              </div>

              <div className="flex flex-col gap-1.5 shrink-0">
                <button
                  onClick={() => handleCopy(item.code)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
                  title="Copy USSD Code"
                >
                  {copiedCode === item.code ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>

                <a
                  href={`tel:${encodeURIComponent(item.code)}`}
                  className="px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs font-bold flex items-center gap-1.5 text-center justify-center border border-amber-500/30 transition-colors"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Dial</span>
                </a>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-300 leading-relaxed">
            <span className="font-bold text-white">Security Notice: </span>
            Never disclose your Mobile Money PIN code via phone calls or SMS. Hubtel and telecom operators will never ask for your PIN to complete airtime or data recharges.
          </div>
        </div>
      </div>
    </div>
  );
};
