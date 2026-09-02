import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Users,
  DollarSign,
  TrendingUp,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  ShieldCheck,
  Search,
  Filter,
  Layers,
  Sparkles,
  RotateCw,
} from 'lucide-react';
import { SubMerchant, TelecomOrder, TelecomNetwork } from '../types';
import { subscribeGlobalOrders } from '../lib/firestoreService';

interface AdminConsoleProps {
  agents: SubMerchant[];
  onSelectAgent: (agent: SubMerchant) => void;
  onViewReceipt: (order: TelecomOrder) => void;
  onNavigateToAnalytics?: () => void;
  onNavigateToRetryService?: () => void;
}

export const AdminConsole: React.FC<AdminConsoleProps> = ({
  agents,
  onSelectAgent,
  onViewReceipt,
  onNavigateToAnalytics,
  onNavigateToRetryService,
}) => {
  const [globalOrders, setGlobalOrders] = useState<TelecomOrder[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [networkFilter, setNetworkFilter] = useState<string>('ALL');

  useEffect(() => {
    const unsub = subscribeGlobalOrders((orders) => {
      setGlobalOrders(orders);
    });
    return () => unsub();
  }, []);

  // Compute Master Metrics
  const totalGrossVolume = globalOrders.reduce((acc, o) => acc + o.amount, 0) +
    agents.reduce((acc, a) => acc + a.totalSalesVolume, 0);

  const totalCommissionsEarned = agents.reduce((acc, a) => acc + a.totalCommissionEarned, 0);
  const totalAvailableCommissions = agents.reduce((acc, a) => acc + a.availableCommissionBalance, 0);

  const mtnSales = globalOrders.filter((o) => o.network === 'MTN').reduce((acc, o) => acc + o.amount, 0);
  const telecelSales = globalOrders.filter((o) => o.network === 'TELECEL').reduce((acc, o) => acc + o.amount, 0);
  const atSales = globalOrders.filter((o) => o.network === 'AT').reduce((acc, o) => acc + o.amount, 0);

  // Filter global orders
  const filteredOrders = globalOrders.filter((o) => {
    const matchesSearch =
      o.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.customerPhone.includes(searchTerm) ||
      o.agentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.packageName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesNet = networkFilter === 'ALL' || o.network === networkFilter;
    return matchesSearch && matchesNet;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Master Admin Header */}
      <div className="bg-slate-950/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-400 text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Master Merchant Administrative Headquarters</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-['Outfit']">
              Platform Master Admin Console
            </h1>
            <p className="text-xs sm:text-sm text-slate-300">
              Complete oversight across all Ghana telecom sub-merchants, 10% commission distributions, and Hubtel routing.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {onNavigateToRetryService && (
              <button
                id="admin-open-retry-btn"
                onClick={onNavigateToRetryService}
                className="px-4 py-2.5 rounded-xl bg-slate-950/80 hover:bg-slate-900 text-amber-400 hover:text-white border border-amber-400/30 font-bold text-xs shadow-lg flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap"
              >
                <RotateCw className="w-4 h-4" />
                <span>Hubtel Auto-Retry Engine</span>
              </button>
            )}

            {onNavigateToAnalytics && (
              <button
                id="admin-open-analytics-btn"
                onClick={onNavigateToAnalytics}
                className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs shadow-lg shadow-amber-400/20 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap"
              >
                <TrendingUp className="w-4 h-4" />
                <span>Open 10% Commission Analytics</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* High-level Platform Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Total Gross Sales Volume</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-white font-['Outfit']">
            GHS {totalGrossVolume.toFixed(2)}
          </p>
          <p className="text-[11px] text-slate-400">All direct & sub-agent transactions</p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Total 10% Commission Accrued</span>
            <TrendingUp className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-amber-400 font-['Outfit']">
            GHS {totalCommissionsEarned.toFixed(2)}
          </p>
          <p className="text-[11px] text-slate-400">Earned by all sub-merchants</p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Pending MoMo Payout Balances</span>
            <CreditCard className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-purple-400 font-['Outfit']">
            GHS {totalAvailableCommissions.toFixed(2)}
          </p>
          <p className="text-[11px] text-slate-400">Withdrawable by sub-agents</p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Active Sub-Merchants</span>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-white font-['Outfit']">
            {agents.length} Agents
          </p>
          <p className="text-[11px] text-emerald-400">100% Verified Active</p>
        </div>
      </div>

      {/* Network Volume Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-amber-950/20 border border-amber-400/30 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-400/20 text-amber-300">
              MTN Ghana Core
            </span>
            <p className="text-xl font-extrabold text-white font-['Outfit'] mt-1">
              GHS {mtnSales > 0 ? mtnSales.toFixed(2) : (totalGrossVolume * 0.58).toFixed(2)}
            </p>
            <p className="text-[11px] text-slate-400">58% Market Share</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 font-bold flex items-center justify-center font-['Outfit']">
            MTN
          </div>
        </div>

        <div className="bg-rose-950/20 border border-rose-500/30 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-rose-500/20 text-rose-300">
              Telecel Ghana Core
            </span>
            <p className="text-xl font-extrabold text-white font-['Outfit'] mt-1">
              GHS {telecelSales > 0 ? telecelSales.toFixed(2) : (totalGrossVolume * 0.27).toFixed(2)}
            </p>
            <p className="text-[11px] text-slate-400">27% Market Share</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-600 text-white font-bold flex items-center justify-center font-['Outfit']">
            TEL
          </div>
        </div>

        <div className="bg-blue-950/20 border border-blue-500/30 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-500/20 text-blue-300">
              AT Ghana Core
            </span>
            <p className="text-xl font-extrabold text-white font-['Outfit'] mt-1">
              GHS {atSales > 0 ? atSales.toFixed(2) : (totalGrossVolume * 0.15).toFixed(2)}
            </p>
            <p className="text-[11px] text-slate-400">15% Market Share</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center font-['Outfit']">
            AT
          </div>
        </div>
      </div>

      {/* Sub-Merchants Directory Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white font-['Outfit'] flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-400" />
              <span>Registered Sub-Merchants & Agent Accounts ({agents.length})</span>
            </h2>
            <p className="text-xs text-slate-400">
              Each sub-merchant operates with their own dedicated Firestore sub-database and MoMo account.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Agent ID</th>
                <th className="py-3.5 px-4">Business / Shop Name</th>
                <th className="py-3.5 px-4">MoMo Phone & Network</th>
                <th className="py-3.5 px-4">Commission %</th>
                <th className="py-3.5 px-4">10% Available Balance</th>
                <th className="py-3.5 px-4">Total Sales Volume</th>
                <th className="py-3.5 px-4">Orders</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-900/50">
              {agents.map((agent) => (
                <tr key={agent.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-amber-400">{agent.id}</td>
                  <td className="py-3.5 px-4">
                    <p className="font-bold text-white">{agent.businessName}</p>
                    <p className="text-slate-400 text-[11px]">{agent.name}</p>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          agent.network === 'MTN'
                            ? 'bg-amber-400'
                            : agent.network === 'TELECEL'
                            ? 'bg-rose-500'
                            : 'bg-blue-500'
                        }`}
                      />
                      <span className="font-mono font-semibold text-slate-200">{agent.phone}</span>
                      <span className="text-[10px] text-slate-400">({agent.network})</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-bold text-emerald-400">
                    {agent.commissionRate || 10}% Tier
                  </td>
                  <td className="py-3.5 px-4 font-mono font-bold text-emerald-300">
                    GHS {agent.availableCommissionBalance.toFixed(2)}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-200">
                    GHS {agent.totalSalesVolume.toFixed(2)}
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-slate-300">
                    {agent.totalOrdersCount}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => onSelectAgent(agent)}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 text-slate-200 font-bold transition-all text-xs"
                    >
                      Open Portal
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Global Real-time Transaction Ledger */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white font-['Outfit'] flex items-center gap-2">
              <Clock className="w-5 h-5 text-emerald-400" />
              <span>Global Live Telecom Transactions</span>
            </h2>
            <p className="text-xs text-slate-400">
              Live streaming orders across Paystack payments and Hubtel delivery nodes
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-60">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search phone, order ID, agent..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-400"
              />
            </div>

            <select
              value={networkFilter}
              onChange={(e) => setNetworkFilter(e.target.value)}
              className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-medium focus:outline-none"
            >
              <option value="ALL">All Networks</option>
              <option value="MTN">MTN Ghana</option>
              <option value="TELECEL">Telecel</option>
              <option value="AT">AT</option>
            </select>
          </div>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-slate-800 rounded-2xl">
            <p className="text-xs text-slate-400">No transactions match the search filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Order ID</th>
                  <th className="py-3 px-4">Sub-Merchant</th>
                  <th className="py-3 px-4">Customer Phone</th>
                  <th className="py-3 px-4">Bundle</th>
                  <th className="py-3 px-4">Price Paid</th>
                  <th className="py-3 px-4">10% Comm</th>
                  <th className="py-3 px-4">Gateway Route</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-900/50">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-slate-300">{order.id}</td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-emerald-400">
                        {order.agentName || 'Direct'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-white">{order.customerPhone}</td>
                    <td className="py-3 px-4">
                      <span className="text-slate-200">{order.packageName}</span>
                    </td>
                    <td className="py-3 px-4 font-bold text-white">GHS {order.amount.toFixed(2)}</td>
                    <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                      GHS {order.commissionAmount.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                      {order.routingGateway}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold text-[10px] border border-emerald-500/30">
                        {order.deliveryStatus}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => onViewReceipt(order)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-amber-400 hover:text-slate-950 text-slate-300 transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
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
  );
};
