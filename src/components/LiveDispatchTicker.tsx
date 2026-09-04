import React from 'react';
import { TelecomOrder, SubMerchant } from '../types';
import {
  Activity,
  Zap,
  Radio,
  Signal,
  ShoppingBag,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';

interface LiveDispatchTickerProps {
  orders: TelecomOrder[];
  agents: SubMerchant[];
  selectedAgent: SubMerchant | null;
  onNavigateToStorefront?: () => void;
}

export const LiveDispatchTicker: React.FC<LiveDispatchTickerProps> = ({
  orders,
  selectedAgent,
  onNavigateToStorefront,
}) => {
  const latestOrder = orders.length > 0 ? orders[0] : null;

  return (
    <div
      id="live-production-dispatch-ticker"
      className="bg-slate-900/95 border border-slate-800/90 rounded-2xl p-3.5 sm:p-4 mb-6 shadow-xl backdrop-blur-sm transition-colors duration-200"
    >
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
        {/* Production Telemetry & Realtime Feed */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 flex-1 min-w-0">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 text-xs font-bold font-mono shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
            <span>CORE GATEWAY ACTIVE</span>
          </div>

          <div className="hidden sm:inline-flex items-center gap-1.5 text-xs text-slate-400 shrink-0">
            <Activity className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-semibold text-slate-300">Hubtel Telecom Switch:</span>
            <span className="text-emerald-400 font-mono">38ms Latency</span>
          </div>

          {/* Genuine subscriber order feed */}
          {latestOrder ? (
            <div className="flex items-center gap-2 text-xs bg-slate-950/70 border border-slate-800 px-3 py-1 rounded-xl text-slate-300 truncate max-w-full lg:max-w-md">
              <span className="text-emerald-400 font-mono font-bold shrink-0">⚡ RECENT ORDER:</span>
              <span className="font-bold text-white shrink-0">{latestOrder.network}</span>
              <span className="truncate">{latestOrder.packageName}</span>
              <span className="text-amber-400 font-mono shrink-0">GHS {latestOrder.amountGhs.toFixed(2)}</span>
              <span className="text-slate-400 hidden md:inline font-mono">
                ({latestOrder.customerPhone.slice(0, 4)}***)
              </span>
            </div>
          ) : (
            <div className="text-xs text-slate-400 flex items-center gap-1.5 truncate">
              <Radio className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Awaiting subscriber recharges • Instant automated carrier dispatch</span>
            </div>
          )}
        </div>

        {/* Channel Indicator & Quick Purchase Button */}
        <div className="flex items-center gap-2 w-full lg:w-auto justify-end shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-800 text-xs">
          {selectedAgent ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-slate-400">Channel:</span>
              <span className="text-white font-bold truncate max-w-[140px]">{selectedAgent.businessName}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 font-medium">
              <Signal className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-slate-400">Channel:</span>
              <span className="text-white font-bold">Direct Purchases</span>
            </div>
          )}

          {onNavigateToStorefront && (
            <button
              id="ticker-buy-bundle-btn"
              type="button"
              onClick={onNavigateToStorefront}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Buy Airtime / Data</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
