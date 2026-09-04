import React, { useState, useEffect } from 'react';
import { SubMerchant, TelecomOrder, TelecomNetwork } from '../types';
import {
  recordPayoutRequest,
  subscribeAgentOrders,
} from '../lib/firestoreService';
import { useToastNotification } from '../context/ToastNotificationContext';
import {
  Users,
  Wallet,
  TrendingUp,
  ArrowDownToLine,
  Share2,
  Check,
  CheckCircle2,
  Clock,
  Building2,
  Phone,
  Percent,
  AlertCircle,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';

interface AgentPortalProps {
  agents: SubMerchant[];
  selectedAgent: SubMerchant | null;
  onSelectAgent: (agent: SubMerchant) => void;
  onNavigateToTab?: (tab: 'storefront' | 'agent-portal' | 'admin' | 'security' | 'ussd' | 'history' | 'analytics' | 'retry-service') => void;
}

export const AgentPortal: React.FC<AgentPortalProps> = ({
  agents,
  selectedAgent,
  onSelectAgent,
  onNavigateToTab,
}) => {
  const { addToast } = useToastNotification();
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'WITHDRAW'>('DASHBOARD');
  const [agentOrders, setAgentOrders] = useState<TelecomOrder[]>([]);
  const [copiedLink, setCopiedLink] = useState(false);

  // Payout Form state
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutMomoNumber, setPayoutMomoNumber] = useState('');
  const [payoutNetwork, setPayoutNetwork] = useState<TelecomNetwork>('MTN');
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  // Current active agent view
  const currentAgent = selectedAgent || (agents.length > 0 ? agents[0] : null);

  useEffect(() => {
    if (!currentAgent) {
      setAgentOrders([]);
      return;
    }
    const unsub = subscribeAgentOrders(currentAgent.id, (orders) => {
      setAgentOrders(orders);
    });
    return () => unsub();
  }, [currentAgent]);

  const handlePayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAgent) return;

    const amt = parseFloat(payoutAmount);
    if (isNaN(amt) || amt <= 0) {
      addToast('error', 'Invalid Amount', 'Please enter a valid payout amount.');
      return;
    }

    if (amt > currentAgent.availableCommissionBalance) {
      addToast('error', 'Insufficient Balance', `Max available withdrawal is GHS ${currentAgent.availableCommissionBalance.toFixed(2)}.`);
      return;
    }

    setIsWithdrawing(true);
    try {
      await recordPayoutRequest(
        currentAgent,
        amt,
        payoutMomoNumber || currentAgent.momoNumber || currentAgent.phone,
        payoutNetwork
      );

      addToast('success', 'Payout Dispatched', `GHS ${amt.toFixed(2)} sent to MoMo wallet (${payoutMomoNumber || currentAgent.phone}).`);
      setPayoutAmount('');
      setActiveTab('DASHBOARD');
    } catch (err) {
      addToast('error', 'Payout Failed', 'Could not process payout.');
    } finally {
      setIsWithdrawing(false);
    }
  };

  const handleCopyShareLink = () => {
    if (!currentAgent) return;
    const link = `${window.location.origin}?agentId=${currentAgent.id}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
    addToast('info', 'Agent Link Copied', 'Share this link with customers to earn direct commission on sales.');
  };

  if (agents.length === 0) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-4 shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
            <Users className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-white">No Sub-Merchant Resellers Created Yet</h2>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Sub-merchant reseller accounts are created exclusively by the Administrator. Once registered in the Operations Console, resellers can track their sales and cash out commissions here.
          </p>
          {onNavigateToTab && (
            <button
              id="goto-admin-to-create-agent-btn"
              type="button"
              onClick={() => onNavigateToTab('admin')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Go to Admin Console to Create Agent</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header Bar with Sub-Merchant Switcher */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400 mb-1">
            <Users className="w-4 h-4" />
            Sub-Merchant Reseller Network
          </div>
          <h2 className="text-xl font-bold text-white">
            {currentAgent ? currentAgent.businessName : 'Select Sub-Merchant Outlet'}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Agent: {currentAgent?.name} • ID: <span className="font-mono text-slate-300">{currentAgent?.id}</span> • Rate: <span className="text-amber-400 font-bold">{currentAgent?.commissionRate}%</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={currentAgent?.id}
            onChange={(e) => {
              const found = agents.find((a) => a.id === e.target.value);
              if (found) onSelectAgent(found);
            }}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-bold"
          >
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.businessName} ({a.name})
              </option>
            ))}
          </select>

          <button
            onClick={handleCopyShareLink}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Copy Agent Referral Store Link"
          >
            {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4 text-amber-400" />}
            <span className="hidden sm:inline">Storefront Link</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('DASHBOARD')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'DASHBOARD'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          Commission Dashboard
        </button>
        <button
          onClick={() => setActiveTab('WITHDRAW')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'WITHDRAW'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          Instant MoMo Cashout
        </button>
      </div>

      {/* TAB 1: DASHBOARD */}
      {activeTab === 'DASHBOARD' && currentAgent && (
        <div className="space-y-6">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
              <div className="flex justify-between items-start">
                <span className="text-xs font-bold text-slate-400 uppercase">Available Payout</span>
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                  <Wallet className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-2 text-2xl font-extrabold text-emerald-400 font-sans">
                GHS {currentAgent.availableCommissionBalance.toFixed(2)}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Ready for instant Mobile Money transfer</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
              <div className="flex justify-between items-start">
                <span className="text-xs font-bold text-slate-400 uppercase">Total Earned</span>
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-2 text-2xl font-extrabold text-amber-400 font-sans">
                GHS {currentAgent.totalCommissionEarned.toFixed(2)}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Lifetime commission revenue</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
              <div className="flex justify-between items-start">
                <span className="text-xs font-bold text-slate-400 uppercase">Sales Volume</span>
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                  <Building2 className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-2 text-2xl font-extrabold text-white font-sans">
                GHS {currentAgent.totalSalesVolume.toFixed(2)}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Carrier airtime & data sold</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
              <div className="flex justify-between items-start">
                <span className="text-xs font-bold text-slate-400 uppercase">Commission Split</span>
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
                  <Percent className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-2 text-2xl font-extrabold text-white font-sans">
                {currentAgent.commissionRate}%
              </div>
              <p className="text-[11px] text-slate-500 mt-1">{currentAgent.totalOrdersCount} subscriber orders completed</p>
            </div>
          </div>

          {/* Realtime Commission Ledger Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-white">Recent Customer Purchases via Outlet</h3>
                <p className="text-xs text-slate-400">Orders placed using {currentAgent.businessName}&apos;s referral link or channel</p>
              </div>
              <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-full">
                {agentOrders.length} Orders Logged
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="border-b border-slate-800 text-slate-400">
                  <tr>
                    <th className="py-3 px-3">Order ID</th>
                    <th className="py-3 px-3">Customer</th>
                    <th className="py-3 px-3">Network & Product</th>
                    <th className="py-3 px-3">Order Total</th>
                    <th className="py-3 px-3 text-emerald-400">Your Commission</th>
                    <th className="py-3 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {agentOrders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-slate-950/40">
                      <td className="py-3 px-3 font-bold text-white">{ord.id}</td>
                      <td className="py-3 px-3 text-slate-300">{ord.customerPhone}</td>
                      <td className="py-3 px-3">
                        <span className="font-bold text-amber-400 mr-1.5">{ord.network}</span>
                        <span className="text-slate-200">{ord.packageName}</span>
                      </td>
                      <td className="py-3 px-3 font-bold text-white">GHS {ord.amountGhs.toFixed(2)}</td>
                      <td className="py-3 px-3 font-bold text-emerald-400">
                        +GHS {ord.commissionGhs.toFixed(2)}
                      </td>
                      <td className="py-3 px-3">
                        {ord.paymentStatus === 'REFUNDED' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 border border-purple-500/30 text-purple-400">
                            REFUNDED
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                            {ord.deliveryStatus}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {agentOrders.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400 text-xs font-sans">
                        No orders attributed to this agent outlet yet. Share your store link to start earning commissions.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: WITHDRAW */}
      {activeTab === 'WITHDRAW' && currentAgent && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl max-w-lg mx-auto">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-800 mb-6">
            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400">
              <ArrowDownToLine className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Instant Mobile Money Payout</h3>
              <p className="text-xs text-slate-400">
                Current Available Balance: <strong className="text-emerald-400">GHS {currentAgent.availableCommissionBalance.toFixed(2)}</strong>
              </p>
            </div>
          </div>

          <form onSubmit={handlePayout} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Withdrawal Amount (GHS)</label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-xs text-slate-400 font-bold">GHS</span>
                <input
                  type="number"
                  step="0.1"
                  max={currentAgent.availableCommissionBalance}
                  required
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-12 pr-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">MoMo Wallet Phone Number</label>
              <input
                type="tel"
                value={payoutMomoNumber}
                onChange={(e) => setPayoutMomoNumber(e.target.value)}
                placeholder={currentAgent.momoNumber || currentAgent.phone}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">Leave empty to use default registered number ({currentAgent.phone})</p>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Payout MoMo Network</label>
              <div className="grid grid-cols-3 gap-2">
                {(['MTN', 'TELECEL', 'AIRTELTIGO'] as TelecomNetwork[]).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setPayoutNetwork(n)}
                    className={`py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                      payoutNetwork === n
                        ? 'border-amber-500 bg-amber-500/10 text-amber-400'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={isWithdrawing || currentAgent.availableCommissionBalance <= 0}
              className="w-full mt-4 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 cursor-pointer"
            >
              {isWithdrawing ? 'Processing MoMo Transfer...' : 'Confirm Instant Cashout'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
