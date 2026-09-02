import React, { useState, useEffect } from 'react';
import {
  Users,
  Gift,
  ArrowUpRight,
  Wallet,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Copy,
  Share2,
  QrCode,
  Sparkles,
  Database,
  TrendingUp,
  RefreshCw,
  ExternalLink,
  PlusCircle,
  Clock,
  Send,
  Loader2,
  DollarSign,
  ShieldCheck,
  Radio,
  Volume2,
  VolumeX,
  Zap,
  Play,
  Bell,
} from 'lucide-react';
import { SubMerchant, TelecomOrder, CommissionRecord, PayoutRecord, TelecomNetwork } from '../types';
import {
  subscribeAgentOrders,
  subscribeAgentCommissions,
  processAgentCommissionPayout,
  createSubMerchant,
  recordOrderAndCommission,
} from '../lib/firestoreService';
import { disburseCommissionPayout } from '../lib/apiClient';
import { useToastNotification } from '../context/ToastNotificationContext';
import { TransactionHistory } from './TransactionHistory';
import { CommissionAnalytics } from './CommissionAnalytics';

interface AgentPortalProps {
  agents: SubMerchant[];
  activeAgent: SubMerchant | null;
  onSelectAgent: (agent: SubMerchant) => void;
  onViewReceipt: (order: TelecomOrder) => void;
}

export const AgentPortal: React.FC<AgentPortalProps> = ({
  agents,
  activeAgent,
  onSelectAgent,
  onViewReceipt,
}) => {
  const [agentOrders, setAgentOrders] = useState<TelecomOrder[]>([]);
  const [agentCommissions, setAgentCommissions] = useState<CommissionRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copySuccess, setCopySuccess] = useState<boolean>(false);
  const [portalSubTab, setPortalSubTab] = useState<'orders' | 'analytics'>('orders');

  // Withdraw Commission state
  const [isWithdrawing, setIsWithdrawing] = useState<boolean>(false);
  const [withdrawAmount, setWithdrawAmount] = useState<string>('');
  const [withdrawSuccessMsg, setWithdrawSuccessMsg] = useState<string>('');
  const [withdrawError, setWithdrawError] = useState<string>('');
  const [showWithdrawModal, setShowWithdrawModal] = useState<boolean>(false);

  // Create Sub-Merchant state
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [newBusinessName, setNewBusinessName] = useState<string>('');
  const [newAgentName, setNewAgentName] = useState<string>('');
  const [newAgentPhone, setNewAgentPhone] = useState<string>('');
  const [newAgentNetwork, setNewAgentNetwork] = useState<TelecomNetwork>('MTN');
  const [newAgentEmail, setNewAgentEmail] = useState<string>('');
  const [newAgentPin, setNewAgentPin] = useState<string>('1234');
  const [newAgentCommission, setNewAgentCommission] = useState<number>(10);
  const [isCreatingAgent, setIsCreatingAgent] = useState<boolean>(false);

  // Real-time Toast System context
  const { soundEnabled, setSoundEnabled, playNotificationChime, listenerActive } = useToastNotification();

  const currentAgent = activeAgent || agents[0] || null;

  // Subscribe to Dedicated Sub-Merchant Database
  useEffect(() => {
    if (!currentAgent) return;
    setIsLoading(true);

    const unsubOrders = subscribeAgentOrders(currentAgent.id, (orders) => {
      setAgentOrders(orders);
      setIsLoading(false);
    });

    const unsubComms = subscribeAgentCommissions(currentAgent.id, (comms) => {
      setAgentCommissions(comms);
    });

    return () => {
      unsubOrders();
      unsubComms();
    };
  }, [currentAgent?.id]);

  // Copy Storefront Link
  const handleCopyStorefrontLink = () => {
    if (!currentAgent) return;
    const url = `${window.location.origin}/?agent=${currentAgent.slug || currentAgent.id}`;
    navigator.clipboard.writeText(url);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2500);
  };

  // Process Instant Commission Payout to Phone Number
  const handleExecuteWithdrawal = async () => {
    if (!currentAgent) return;
    const amount = Number(withdrawAmount) || currentAgent.availableCommissionBalance;

    if (amount <= 0 || amount > currentAgent.availableCommissionBalance) {
      setWithdrawError(`Please enter an amount between GHS 1.00 and GHS ${currentAgent.availableCommissionBalance.toFixed(2)}`);
      return;
    }

    setIsWithdrawing(true);
    setWithdrawError('');
    setWithdrawSuccessMsg('');

    try {
      // 1. Call server-side MoMo disbursement route
      const serverDisbRes = await disburseCommissionPayout({
        agentId: currentAgent.id,
        agentName: currentAgent.name,
        agentPhone: currentAgent.phone,
        agentNetwork: currentAgent.network,
        amount: amount,
      });

      // 2. Update Firestore dedicated agent balance & ledger
      await processAgentCommissionPayout(
        currentAgent,
        amount,
        currentAgent.network === 'MTN'
          ? 'MTN_MOMO'
          : currentAgent.network === 'TELECEL'
          ? 'TELECEL_CASH'
          : 'AT_MONEY'
      );

      setWithdrawSuccessMsg(
        `Success! GHS ${amount.toFixed(2)} was credited directly to ${currentAgent.phone} (${currentAgent.network} MoMo). Transaction Ref: ${serverDisbRes.momoReceipt}`
      );
      setShowWithdrawModal(false);
      setWithdrawAmount('');
    } catch (err: any) {
      setWithdrawError(err.message || 'Failed to disburse payout to phone number');
    } finally {
      setIsWithdrawing(false);
    }
  };

  // Create Sub-Merchant Handler
  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBusinessName || !newAgentName || !newAgentPhone) {
      return;
    }

    setIsCreatingAgent(true);
    try {
      const slug = newBusinessName.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const created = await createSubMerchant({
        businessName: newBusinessName,
        name: newAgentName,
        phone: newAgentPhone,
        network: newAgentNetwork,
        email: newAgentEmail || `${slug}@ghanatelecom.gh`,
        pin: newAgentPin || '1234',
        slug: slug,
        commissionRate: newAgentCommission || 10,
        customThemeColor: newAgentNetwork === 'MTN' ? '#fbbf24' : newAgentNetwork === 'TELECEL' ? '#e11d48' : '#2563eb',
      });

      onSelectAgent(created);
      setShowCreateModal(false);
      // Reset form
      setNewBusinessName('');
      setNewAgentName('');
      setNewAgentPhone('');
    } catch (err) {
      console.error('Failed to create agent:', err);
    } finally {
      setIsCreatingAgent(false);
    }
  };

  if (!currentAgent) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <p className="text-slate-400">Loading sub-merchants from cloud storage...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner: Sub-Merchant Selection & Create Button */}
      <div className="bg-slate-950/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-400/10 border border-emerald-400/20 text-emerald-400 text-xs font-semibold">
              <Database className="w-3.5 h-3.5" />
              <span>Dedicated Sub-Merchant Firestore Database Storage</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-['Outfit']">
              Sub-Merchant & Agent Portal
            </h1>
            <p className="text-xs sm:text-sm text-slate-300">
              Manage your telecom business, monitor your dedicated database, share your custom storefront, and withdraw 10% commissions.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            {/* Switch Sub-Merchant Dropdown */}
            <div className="relative">
              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Active Sub-Merchant:
              </label>
              <select
                id="agent-switcher-select"
                value={currentAgent.id}
                onChange={(e) => {
                  const target = agents.find((a) => a.id === e.target.value);
                  if (target) onSelectAgent(target);
                }}
                className="px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-400"
              >
                {agents.map((ag) => (
                  <option key={ag.id} value={ag.id}>
                    {ag.businessName} ({ag.phone} - {ag.network})
                  </option>
                ))}
              </select>
            </div>

            {/* Create New Sub-Merchant Button */}
            <div className="self-end">
              <button
                id="create-sub-merchant-btn"
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition-all cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Create New Sub-Merchant</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Real-time Firestore Listener Live Alert Bar */}
      <div
        id="firestore-realtime-listener-bar"
        className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/30 border border-amber-500/30 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <div className="relative flex h-3.5 w-3.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5 font-['Outfit']">
                <span>Real-Time Firestore Agent Listener</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                  LIVE STREAM
                </span>
              </h3>
            </div>
            <p className="text-[11px] text-slate-300 mt-0.5">
              Listening to <span className="font-mono text-amber-300 font-semibold">{currentAgent.businessName}</span> transactions. Receive instant celebration toasts &amp; 10% commission chimes when orders succeed.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Audio Chime Toggle */}
          <button
            id="toggle-chime-sound-btn"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-all ${
              soundEnabled
                ? 'bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 border-amber-400/30 shadow-sm'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-400 border-slate-700'
            }`}
            title={soundEnabled ? 'Chime sound is enabled for live completed sales' : 'Chime sound is muted'}
          >
            {soundEnabled ? (
              <>
                <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Chime Sound: ON</span>
              </>
            ) : (
              <>
                <VolumeX className="w-3.5 h-3.5 text-slate-400" />
                <span>Chime Sound: OFF</span>
              </>
            )}
          </button>

          {/* Test Audio Chime */}
          <button
            id="test-chime-btn"
            onClick={playNotificationChime}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
            title="Play sample harmonic chime"
          >
            <Bell className="w-3.5 h-3.5 text-amber-400" />
            <span>Test Chime</span>
          </button>
        </div>
      </div>

      {withdrawSuccessMsg && (
        <div className="p-4 rounded-2xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-xs flex items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
            <span>{withdrawSuccessMsg}</span>
          </div>
          <button
            onClick={() => setWithdrawSuccessMsg('')}
            className="text-xs text-slate-400 hover:text-white"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Overview Analytics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Available Commission Balance (Highlight) */}
        <div className="bg-gradient-to-br from-emerald-950/60 via-slate-900 to-slate-900 border-2 border-emerald-500/40 rounded-2xl p-5 shadow-xl relative overflow-hidden flex flex-col justify-between">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                10% Commission Balance
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-black text-white font-['Outfit']">
              GHS {currentAgent.availableCommissionBalance.toFixed(2)}
            </p>
            <p className="text-[11px] text-slate-400">
              Ready for instant MoMo payout to <span className="font-mono text-emerald-300">{currentAgent.phone}</span>
            </p>
          </div>

          <div className="pt-4 mt-2">
            <button
              id="withdraw-commission-btn"
              onClick={() => {
                setWithdrawAmount(currentAgent.availableCommissionBalance.toFixed(2));
                setShowWithdrawModal(true);
              }}
              disabled={currentAgent.availableCommissionBalance <= 0}
              className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                currentAgent.availableCommissionBalance > 0
                  ? 'bg-emerald-400 hover:bg-emerald-300 text-slate-950 shadow-lg shadow-emerald-400/20 cursor-pointer'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>Withdraw to MoMo Number</span>
            </button>
          </div>
        </div>

        {/* Total Lifetime Commission Earned */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Lifetime Earnings</span>
              <div className="w-8 h-8 rounded-lg bg-amber-400/10 text-amber-400 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-white font-['Outfit']">
              GHS {currentAgent.totalCommissionEarned.toFixed(2)}
            </p>
            <p className="text-[11px] text-slate-400">Total cumulative 10% earned</p>
          </div>
          <div className="pt-3 border-t border-slate-800 text-[11px] text-amber-400 flex items-center gap-1 font-semibold">
            <Sparkles className="w-3 h-3" />
            <span>{currentAgent.commissionRate || 10}% Commission Tier</span>
          </div>
        </div>

        {/* Total Sales Volume */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Total Sales Volume</span>
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-white font-['Outfit']">
              GHS {currentAgent.totalSalesVolume.toFixed(2)}
            </p>
            <p className="text-[11px] text-slate-400">Gross customer telecom sales</p>
          </div>
          <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-400">
            Across MTN, Telecel & AT
          </div>
        </div>

        {/* Total Orders Count */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Completed Orders</span>
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-white font-['Outfit']">
              {currentAgent.totalOrdersCount}
            </p>
            <p className="text-[11px] text-slate-400">Customer bundles & airtime</p>
          </div>
          <div className="pt-3 border-t border-slate-800 text-[11px] text-emerald-400 font-medium">
            100% Routed via Hubtel
          </div>
        </div>
      </div>

      {/* Sub-Merchant Custom Storefront Link & WhatsApp Sharing */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-white font-['Outfit'] flex items-center gap-2">
              <Share2 className="w-5 h-5 text-amber-400" />
              <span>Your Unique Sub-Merchant Storefront Link</span>
            </h3>
            <p className="text-xs text-slate-300">
              Give this link to your customers or post it on WhatsApp/Facebook. Every bundle they purchase will auto-credit 10% commission to you!
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyStorefrontLink}
              className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-amber-400/20 transition-all cursor-pointer"
            >
              <Copy className="w-4 h-4" />
              <span>{copySuccess ? 'Copied to Clipboard!' : 'Copy Storefront Link'}</span>
            </button>

            <a
              href={`https://wa.me/?text=${encodeURIComponent(
                `Hey! Buy cheap Ghana Data Bundles (MTN Non-Expiry, Telecel Bossu, AT Big Time) & Airtime instantly on my store: ${window.location.origin}/?agent=${currentAgent.slug}`
              )}`}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all"
            >
              <span>Share on WhatsApp</span>
            </a>
          </div>
        </div>

        <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs font-mono text-amber-400 truncate">
          <span className="truncate">{`${window.location.origin}/?agent=${currentAgent.slug || currentAgent.id}`}</span>
          <span className="text-[10px] px-2 py-0.5 rounded bg-amber-400/10 text-amber-400 border border-amber-400/20 font-sans font-semibold ml-2">
            Slug: {currentAgent.slug}
          </span>
        </div>
      </div>

      {/* View Switcher: Live Database vs Commission Analytics */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            id="agent-tab-orders-btn"
            onClick={() => setPortalSubTab('orders')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              portalSubTab === 'orders'
                ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Dedicated Live Database (`agents/{currentAgent.id}/orders`)</span>
          </button>

          <button
            id="agent-tab-analytics-btn"
            onClick={() => setPortalSubTab('analytics')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              portalSubTab === 'analytics'
                ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>10% Commission Analytics & Forecasting</span>
          </button>
        </div>

        <span className="text-[11px] text-slate-500 hidden sm:inline">
          Auto-synced with Firestore Sub-Collection
        </span>
      </div>

      {/* Render active sub-view */}
      {portalSubTab === 'orders' ? (
        <TransactionHistory
          agentId={currentAgent.id}
          agentName={currentAgent.businessName}
          onViewReceipt={onViewReceipt}
        />
      ) : (
        <CommissionAnalytics
          agents={agents}
          initialSelectedAgentId={currentAgent.id}
        />
      )}

      {/* Commission Withdrawal Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-['Outfit']">Withdraw 10% Commission</h3>
                  <p className="text-xs text-slate-400">Direct Mobile Money Disbursement</p>
                </div>
              </div>
              <button
                onClick={() => setShowWithdrawModal(false)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded bg-slate-800"
              >
                Cancel
              </button>
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between text-slate-300">
                <span>Beneficiary Agent:</span>
                <span className="font-bold text-white">{currentAgent.name} ({currentAgent.businessName})</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>MoMo Destination Number:</span>
                <span className="font-mono font-bold text-emerald-400">{currentAgent.phone}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Telecom Network:</span>
                <span className="font-semibold text-white">{currentAgent.network} Mobile Money</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Available Balance:</span>
                <span className="font-bold text-amber-400 font-mono">GHS {currentAgent.availableCommissionBalance.toFixed(2)}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">
                Amount to Disburse (GHS)
              </label>
              <input
                id="withdraw-amount-input"
                type="number"
                max={currentAgent.availableCommissionBalance}
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>

            {withdrawError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{withdrawError}</span>
              </div>
            )}

            <button
              id="confirm-withdrawal-btn"
              onClick={handleExecuteWithdrawal}
              disabled={isWithdrawing || currentAgent.availableCommissionBalance <= 0}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-extrabold text-sm shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              {isWithdrawing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Disbursing via MoMo API...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Send GHS {Number(withdrawAmount || 0).toFixed(2)} to {currentAgent.phone}</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Create New Sub-Merchant Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white font-['Outfit']">Create New Sub-Merchant</h3>
                  <p className="text-xs text-slate-400">Auto-provisions a dedicated Firestore database</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded bg-slate-800"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleCreateAgent} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Business / Shop Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Osu Telecom Express"
                  value={newBusinessName}
                  onChange={(e) => setNewBusinessName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-emerald-400 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Agent Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Kwabena Boateng"
                    value={newAgentName}
                    onChange={(e) => setNewAgentName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-emerald-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">MoMo Payout Phone *</label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 0244123456"
                    value={newAgentPhone}
                    onChange={(e) => setNewAgentPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono focus:ring-2 focus:ring-emerald-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">MoMo Network</label>
                  <select
                    value={newAgentNetwork}
                    onChange={(e) => setNewAgentNetwork(e.target.value as TelecomNetwork)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-emerald-400 focus:outline-none"
                  >
                    <option value="MTN">MTN MoMo</option>
                    <option value="TELECEL">Telecel Cash</option>
                    <option value="AT">AT Money</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Commission Rate (%)</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={newAgentCommission}
                    onChange={(e) => setNewAgentCommission(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono focus:ring-2 focus:ring-emerald-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Agent Email (Login)</label>
                  <input
                    type="email"
                    placeholder="agent@ghanatelecom.gh"
                    value={newAgentEmail}
                    onChange={(e) => setNewAgentEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-emerald-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">4-Digit Access PIN</label>
                  <input
                    type="password"
                    maxLength={4}
                    value={newAgentPin}
                    onChange={(e) => setNewAgentPin(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-center tracking-widest focus:ring-2 focus:ring-emerald-400 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isCreatingAgent}
                className="w-full mt-2 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {isCreatingAgent ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Provisioning Sub-Merchant Firestore Schema...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Create & Activate Sub-Merchant</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
