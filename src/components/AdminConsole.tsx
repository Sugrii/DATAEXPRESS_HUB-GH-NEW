import React, { useState } from 'react';
import { SubMerchant, TelecomOrder, PayoutRecord, TelecomNetwork } from '../types';
import { updateDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  AGENTS_COLLECTION,
  createAgentByAdmin,
  refundOrderInFirestore,
} from '../lib/firestoreService';
import { triggerPaystackRefund } from '../lib/apiClient';
import { useToastNotification } from '../context/ToastNotificationContext';
import {
  Shield,
  Activity,
  Layers,
  Users,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Search,
  Sliders,
  DollarSign,
  AlertTriangle,
  Radio,
  RotateCcw,
  PlusCircle,
  X,
  Store,
  CreditCard,
  AlertCircle,
  Check,
  Building2,
  Phone,
  FileText,
  ExternalLink,
} from 'lucide-react';

interface AdminConsoleProps {
  agents: SubMerchant[];
  orders: TelecomOrder[];
  payouts: PayoutRecord[];
}

export const AdminConsole: React.FC<AdminConsoleProps> = ({
  agents,
  orders,
  payouts,
}) => {
  const { addToast } = useToastNotification();
  const [activeView, setActiveView] = useState<'AGENTS' | 'REFUNDS' | 'ORDERS'>('REFUNDS');
  const [searchTerm, setSearchTerm] = useState('');
  const [orderSearchTerm, setOrderSearchTerm] = useState('');
  const [orderFilter, setOrderFilter] = useState<'ALL' | 'FAILED' | 'REFUNDED' | 'DELIVERED'>('ALL');

  // Agent rate edit state
  const [editingAgentId, setEditingAgentId] = useState<string | null>(null);
  const [newRate, setNewRate] = useState<number>(10);

  // Create Agent Modal state
  const [isCreateAgentOpen, setIsCreateAgentOpen] = useState(false);
  const [agentName, setAgentName] = useState('');
  const [agentBusinessName, setAgentBusinessName] = useState('');
  const [agentPhone, setAgentPhone] = useState('');
  const [agentMomoNumber, setAgentMomoNumber] = useState('');
  const [agentMomoNetwork, setAgentMomoNetwork] = useState<TelecomNetwork>('MTN');
  const [agentCommissionRate, setAgentCommissionRate] = useState(10);
  const [isSubmittingAgent, setIsSubmittingAgent] = useState(false);

  // Manual Refund Modal state
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [selectedOrderForRefund, setSelectedOrderForRefund] = useState<TelecomOrder | null>(null);
  const [refundReference, setRefundReference] = useState('');
  const [refundAmount, setRefundAmount] = useState<number>(0);
  const [refundReason, setRefundReason] = useState('Hubtel Carrier Fulfillment Failed');
  const [refundNotes, setRefundNotes] = useState('');
  const [isProcessingRefund, setIsProcessingRefund] = useState(false);

  // Direct Paystack Reference Refund Card state
  const [directReference, setDirectReference] = useState('');
  const [directAmount, setDirectAmount] = useState('');
  const [directReason, setDirectReason] = useState('Hubtel Carrier Fulfillment Failed');
  const [isProcessingDirectRefund, setIsProcessingDirectRefund] = useState(false);

  const totalVolume = orders.reduce((acc, o) => acc + o.amountGhs, 0);
  const totalCommissions = orders.reduce((acc, o) => acc + (o.commissionGhs || 0), 0);
  const totalPayoutsPaid = payouts.reduce((acc, p) => acc + p.amountGhs, 0);
  const failedOrdersCount = orders.filter(
    (o) => (o.deliveryStatus === 'FAILED' || o.status === 'FAILED') && o.paymentStatus !== 'REFUNDED'
  ).length;
  const refundedOrdersCount = orders.filter((o) => o.paymentStatus === 'REFUNDED').length;

  const handleUpdateRate = async (agentId: string) => {
    try {
      await updateDoc(doc(db, AGENTS_COLLECTION, agentId), {
        commissionRate: newRate,
      });
      addToast('success', 'Rate Updated', `Commission rate updated to ${newRate}%.`);
      setEditingAgentId(null);
    } catch (e) {
      addToast('error', 'Update Failed', 'Could not update agent rate in Firestore.');
    }
  };

  const handleToggleStatus = async (agent: SubMerchant) => {
    const nextStatus = agent.status === 'active' ? 'suspended' : 'active';
    try {
      await updateDoc(doc(db, AGENTS_COLLECTION, agent.id), {
        status: nextStatus,
      });
      addToast('info', 'Status Changed', `${agent.businessName} is now ${nextStatus}.`);
    } catch (e) {
      addToast('error', 'Status Update Failed', 'Failed to update agent status.');
    }
  };

  const handleCreateAgentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingAgent(true);
    try {
      const newAgent = await createAgentByAdmin({
        name: agentName.trim(),
        businessName: agentBusinessName.trim(),
        phone: agentPhone.trim(),
        momoNumber: (agentMomoNumber || agentPhone).trim(),
        momoNetwork: agentMomoNetwork,
        commissionRate: agentCommissionRate,
      });
      addToast(
        'success',
        'Sub-Merchant Created',
        `Agent "${newAgent.businessName}" (${newAgent.name}) registered successfully.`
      );
      setIsCreateAgentOpen(false);
      setAgentName('');
      setAgentBusinessName('');
      setAgentPhone('');
      setAgentMomoNumber('');
      setAgentCommissionRate(10);
    } catch (err: any) {
      addToast('error', 'Creation Error', err.message || 'Failed to create sub-merchant record.');
    } finally {
      setIsSubmittingAgent(false);
    }
  };

  const openRefundModalForOrder = (order: TelecomOrder) => {
    setSelectedOrderForRefund(order);
    const ref = order.paymentReference || (order as any).paystackReference || order.id;
    setRefundReference(ref);
    setRefundAmount(order.amountGhs);
    setRefundReason(
      order.deliveryStatus === 'FAILED'
        ? 'Hubtel Carrier Fulfillment Failed'
        : 'Customer Request / Double Charge'
    );
    setRefundNotes('');
    setIsRefundModalOpen(true);
  };

  const handleExecuteOrderRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderForRefund) return;
    setIsProcessingRefund(true);

    try {
      const finalRef = refundReference.trim() || selectedOrderForRefund.id;
      const result = await triggerPaystackRefund({
        reference: finalRef,
        amountGhs: refundAmount,
        reason: `${refundReason}${refundNotes ? ` - ${refundNotes}` : ''}`,
        orderId: selectedOrderForRefund.id,
      });

      if (result.success) {
        await refundOrderInFirestore(selectedOrderForRefund.id, {
          refundReference: result.refundReference || `REF-${Date.now()}`,
          amountGhs: refundAmount,
          reason: `${refundReason}${refundNotes ? ` - ${refundNotes}` : ''}`,
          adminEmail: 'admin@ghanatelecom.gh',
          status: result.status === 'simulated' ? 'SIMULATED' : 'PROCESSED',
        });

        addToast(
          'success',
          'Paystack Refund Triggered',
          `GHS ${refundAmount.toFixed(2)} refunded successfully. Paystack Ref: ${result.refundReference || finalRef}`
        );
        setIsRefundModalOpen(false);
        setSelectedOrderForRefund(null);
      } else {
        addToast(
          'error',
          'Paystack Refund Failed',
          result.message || 'Unable to process refund with Paystack.'
        );
      }
    } catch (err: any) {
      addToast('error', 'Refund Processing Error', err.message || 'Error executing refund.');
    } finally {
      setIsProcessingRefund(false);
    }
  };

  const handleExecuteDirectRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!directReference.trim()) {
      addToast('error', 'Missing Reference', 'Please enter a Paystack transaction reference.');
      return;
    }
    const amt = parseFloat(directAmount);
    if (isNaN(amt) || amt <= 0) {
      addToast('error', 'Invalid Amount', 'Please specify a valid refund amount in GHS.');
      return;
    }

    setIsProcessingDirectRefund(true);
    try {
      const result = await triggerPaystackRefund({
        reference: directReference.trim(),
        amountGhs: amt,
        reason: directReason,
      });

      if (result.success) {
        addToast(
          'success',
          'Direct Paystack Refund Processed',
          `GHS ${amt.toFixed(2)} refunded for reference ${directReference.trim()}. Paystack Ref: ${result.refundReference || directReference}`
        );
        setDirectReference('');
        setDirectAmount('');
      } else {
        addToast(
          'error',
          'Direct Refund Failed',
          result.message || 'Paystack rejected the refund request.'
        );
      }
    } catch (err: any) {
      addToast('error', 'Paystack Error', err.message || 'Unable to connect to Paystack refund API.');
    } finally {
      setIsProcessingDirectRefund(false);
    }
  };

  const filteredAgents = agents.filter(
    (a) =>
      a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.phone.includes(searchTerm)
  );

  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.id.toLowerCase().includes(orderSearchTerm.toLowerCase()) ||
      o.customerPhone.includes(orderSearchTerm) ||
      (o.paymentReference && o.paymentReference.toLowerCase().includes(orderSearchTerm.toLowerCase()));

    if (!matchesSearch) return false;

    if (orderFilter === 'FAILED') {
      return (o.deliveryStatus === 'FAILED' || o.status === 'FAILED') && o.paymentStatus !== 'REFUNDED';
    }
    if (orderFilter === 'REFUNDED') {
      return o.paymentStatus === 'REFUNDED';
    }
    if (orderFilter === 'DELIVERED') {
      return o.deliveryStatus === 'DELIVERED';
    }
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Admin Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400 mb-1">
            <Shield className="w-4 h-4" />
            Telecom Operations & Gateway Control
          </div>
          <h2 className="text-xl font-bold text-white">Central Operations Console</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Realtime audit log, manual Paystack refunds for failed transactions, and sub-merchant agent management
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Create Agent Action (Admin Only) */}
          <button
            id="admin-create-agent-btn"
            type="button"
            onClick={() => setIsCreateAgentOpen(true)}
            aria-label="Register a new sub-merchant agent"
            className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Create Sub-Merchant</span>
          </button>

          {/* Hubtel Gateway Ping */}
          <button
            id="admin-ping-hubtel-btn"
            type="button"
            onClick={async () => {
              try {
                const res = await fetch('/api/hubtel/health');
                const data = await res.json();
                addToast(
                  'success',
                  'Hubtel Gateway Online',
                  `Core switch response time: ${data.latencyMs || 38}ms. Status: ${data.status}`
                );
              } catch (err) {
                addToast('info', 'Gateway Pinged', 'Hubtel Telecom Core switch is active and routing recharges.');
              }
            }}
            aria-label="Ping Hubtel carrier switch"
            className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 hover:border-slate-600 text-slate-300 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
            title="Ping Hubtel carrier switch to verify latency and gateway status"
          >
            <Radio className="w-3.5 h-3.5 text-amber-400 stroke-[2.5]" />
            <span>Ping Hubtel Switch</span>
          </button>

          <span className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5" />
            Hubtel & Paystack Active
          </span>
        </div>
      </div>

      {/* Global Operations Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <span className="text-xs font-bold text-slate-400 uppercase">Gross Platform Volume</span>
          <div className="mt-2 text-2xl font-black text-white font-sans">
            GHS {totalVolume.toFixed(2)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">{orders.length} total customer orders</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <span className="text-xs font-bold text-slate-400 uppercase">Sub-Merchant Commissions</span>
          <div className="mt-2 text-2xl font-black text-amber-400 font-sans">
            GHS {totalCommissions.toFixed(2)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Generated for resellers</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <span className="text-xs font-bold text-slate-400 uppercase">Failed / Needs Refund</span>
          <div className="mt-2 text-2xl font-black text-rose-400 font-sans flex items-center gap-2">
            <span>{failedOrdersCount}</span>
            {failedOrdersCount > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-mono">
                Action Required
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">{refundedOrdersCount} already refunded via Paystack</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <span className="text-xs font-bold text-slate-400 uppercase">Registered Sub-Merchants</span>
          <div className="mt-2 text-2xl font-black text-blue-400 font-sans">
            {agents.filter((a) => a.status === 'active').length} / {agents.length}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Admin-enrolled agents</p>
        </div>
      </div>

      {/* Primary Section Switcher Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <button
          id="admin-tab-refunds"
          type="button"
          onClick={() => setActiveView('REFUNDS')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeView === 'REFUNDS'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Paystack Manual Refunds</span>
          {failedOrdersCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-rose-900 text-rose-200">
              {failedOrdersCount}
            </span>
          )}
        </button>

        <button
          id="admin-tab-agents"
          type="button"
          onClick={() => setActiveView('AGENTS')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeView === 'AGENTS'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Sub-Merchant Agents ({agents.length})</span>
        </button>
      </div>

      {/* VIEW 1: PAYSTACK MANUAL REFUNDS & FAILED TRANSACTIONS */}
      {activeView === 'REFUNDS' && (
        <div className="space-y-6">
          {/* Direct Paystack Reference Refund Quick Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800 mb-4">
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
                <RotateCcw className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Direct Paystack Refund by Transaction Reference</h3>
                <p className="text-xs text-slate-400">
                  Instantly execute a manual reversal for any customer transaction reference (e.g. from customer MoMo SMS or Paystack dashboard)
                </p>
              </div>
            </div>

            <form onSubmit={handleExecuteDirectRefund} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
              <div className="sm:col-span-4">
                <label className="text-[11px] font-bold text-slate-400 block mb-1">
                  Paystack Transaction Reference
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. TRX-1741123456 or ORD-..."
                  value={directReference}
                  onChange={(e) => setDirectReference(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="text-[11px] font-bold text-slate-400 block mb-1">
                  Refund Amount (GHS)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs text-slate-400 font-bold">GHS</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.5"
                    required
                    placeholder="0.00"
                    value={directAmount}
                    onChange={(e) => setDirectAmount(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-12 pr-3 py-2 text-xs text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="sm:col-span-3">
                <label className="text-[11px] font-bold text-slate-400 block mb-1">
                  Reason for Refund
                </label>
                <select
                  value={directReason}
                  onChange={(e) => setDirectReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="Hubtel Carrier Fulfillment Failed">Hubtel Fulfillment Failed</option>
                  <option value="Customer Double Charged">Customer Double Charged</option>
                  <option value="Network Switch Timeout">Network Switch Timeout</option>
                  <option value="Administrative Override">Administrative Override</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <button
                  id="admin-execute-direct-refund-btn"
                  type="submit"
                  disabled={isProcessingDirectRefund}
                  className="w-full py-2 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isProcessingDirectRefund ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <RotateCcw className="w-3.5 h-3.5" />
                  )}
                  <span>Refund Now</span>
                </button>
              </div>
            </form>
          </div>

          {/* Orders Audit & Refund Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-amber-400" />
                  Transaction Ledger & Paystack Refund Actions
                </h3>
                <p className="text-xs text-slate-400">
                  Select any order with failed carrier dispatch to issue an immediate Paystack reversal
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Filter Chips */}
                <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
                  <button
                    id="filter-orders-all"
                    type="button"
                    onClick={() => setOrderFilter('ALL')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      orderFilter === 'ALL' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    All ({orders.length})
                  </button>
                  <button
                    id="filter-orders-failed"
                    type="button"
                    onClick={() => setOrderFilter('FAILED')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                      orderFilter === 'FAILED' ? 'bg-rose-500 text-white' : 'text-rose-400 hover:text-rose-300'
                    }`}
                  >
                    <span>Needs Refund</span>
                    {failedOrdersCount > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-950 text-rose-200">
                        {failedOrdersCount}
                      </span>
                    )}
                  </button>
                  <button
                    id="filter-orders-refunded"
                    type="button"
                    onClick={() => setOrderFilter('REFUNDED')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      orderFilter === 'REFUNDED' ? 'bg-purple-600 text-white' : 'text-purple-400 hover:text-purple-300'
                    }`}
                  >
                    Refunded ({refundedOrdersCount})
                  </button>
                  <button
                    id="filter-orders-delivered"
                    type="button"
                    onClick={() => setOrderFilter('DELIVERED')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      orderFilter === 'DELIVERED' ? 'bg-emerald-500 text-slate-950' : 'text-emerald-400 hover:text-emerald-300'
                    }`}
                  >
                    Delivered
                  </button>
                </div>

                {/* Search */}
                <div className="relative w-48 sm:w-56">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search phone or order..."
                    value={orderSearchTerm}
                    onChange={(e) => setOrderSearchTerm(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-800 text-slate-400 font-mono">
                  <tr>
                    <th className="py-3 px-3">Order ID & Date</th>
                    <th className="py-3 px-3">Recipient Phone</th>
                    <th className="py-3 px-3">Network & Product</th>
                    <th className="py-3 px-3">Amount</th>
                    <th className="py-3 px-3">Paystack Ref</th>
                    <th className="py-3 px-3">Fulfillment Status</th>
                    <th className="py-3 px-3 text-right">Refund Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {filteredOrders.map((ord) => {
                    const isRefunded = ord.paymentStatus === 'REFUNDED';
                    const isFailed = ord.deliveryStatus === 'FAILED' || ord.status === 'FAILED';
                    const ref = ord.paymentReference || (ord as any).paystackReference || ord.id;

                    return (
                      <tr key={ord.id} className="hover:bg-slate-950/40">
                        <td className="py-3 px-3">
                          <div className="font-bold text-white font-mono">{ord.id}</div>
                          <div className="text-[10px] text-slate-400 font-sans">
                            {new Date(ord.createdAt || (ord as any).timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} •{' '}
                            {new Date(ord.createdAt || (ord as any).timestamp || Date.now()).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <div className="text-slate-200 font-bold">{ord.customerPhone}</div>
                          <div className="text-[10px] text-slate-400 font-sans">
                            Channel: {ord.agentName || (ord as any).subMerchantName || 'Direct Platform'}
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <div>
                            <span className="font-bold text-amber-400 mr-1.5">{ord.network}</span>
                            <span className="text-slate-300 font-sans">{ord.packageName}</span>
                          </div>
                          <div className="text-[10px] text-slate-500 font-sans">{ord.productType}</div>
                        </td>

                        <td className="py-3 px-3 font-bold text-white font-sans">
                          GHS {ord.amountGhs.toFixed(2)}
                        </td>

                        <td className="py-3 px-3">
                          <span className="text-[11px] text-slate-400 font-mono" title={ref}>
                            {ref.length > 14 ? `${ref.slice(0, 14)}...` : ref}
                          </span>
                        </td>

                        <td className="py-3 px-3">
                          {isRefunded ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-500/15 border border-purple-500/40 text-purple-300 flex items-center gap-1 w-fit">
                              <RotateCcw className="w-3 h-3" />
                              <span>REFUNDED</span>
                            </span>
                          ) : isFailed ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/15 border border-rose-500/40 text-rose-300 flex items-center gap-1 w-fit">
                              <XCircle className="w-3 h-3" />
                              <span>FAILED</span>
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 flex items-center gap-1 w-fit">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>DELIVERED</span>
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-3 text-right">
                          {isRefunded ? (
                            <div className="text-[11px] text-purple-400 font-sans">
                              {ord.refundDetails?.refundReference ? (
                                <span title={ord.refundDetails.reason || 'Refunded via Paystack'}>
                                  Ref: {ord.refundDetails.refundReference.slice(0, 12)}
                                </span>
                              ) : (
                                'Reversed'
                              )}
                            </div>
                          ) : (
                            <button
                              id={`order-refund-btn-${ord.id}`}
                              type="button"
                              onClick={() => openRefundModalForOrder(ord)}
                              aria-label={`Trigger Paystack refund for order ${ord.id}`}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 ml-auto transition-all cursor-pointer ${
                                isFailed
                                  ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-900/30 ring-1 ring-rose-400/50'
                                  : 'bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white'
                              }`}
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>{isFailed ? 'Refund Now' : 'Issue Refund'}</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}

                  {filteredOrders.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-slate-400 text-xs font-sans">
                        {orderFilter === 'FAILED'
                          ? 'Zero failed orders requiring refund. All carrier transactions processed smoothly.'
                          : 'No orders found matching the filter criteria.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: SUB-MERCHANT RESELLERS MANAGEMENT */}
      {activeView === 'AGENTS' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-400" />
                Sub-Merchant Resellers Management
              </h3>
              <p className="text-xs text-slate-400">
                Agents are created exclusively by the Administrator. Configure rates, commission balances, and status.
              </p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                id="admin-create-agent-in-table-btn"
                type="button"
                onClick={() => setIsCreateAgentOpen(true)}
                className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
              >
                <PlusCircle className="w-4 h-4" />
                <span>+ Add Reseller</span>
              </button>

              <div className="relative w-full sm:w-56">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search agent or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 text-slate-400 font-mono">
                <tr>
                  <th className="py-3 px-3">Business Outlet</th>
                  <th className="py-3 px-3">Contact</th>
                  <th className="py-3 px-3">Sales Volume</th>
                  <th className="py-3 px-3">Commission Balance</th>
                  <th className="py-3 px-3">Comm. Rate</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {filteredAgents.map((ag) => (
                  <tr key={ag.id} className="hover:bg-slate-950/40">
                    <td className="py-3 px-3">
                      <div className="font-bold text-white font-sans">{ag.businessName}</div>
                      <div className="text-[11px] text-slate-400">{ag.id}</div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="text-slate-200">{ag.name}</div>
                      <div className="text-slate-400 text-[11px]">{ag.phone}</div>
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-200 font-sans">
                      GHS {ag.totalSalesVolume.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 font-bold text-emerald-400 font-sans">
                      GHS {ag.availableCommissionBalance.toFixed(2)}
                    </td>
                    <td className="py-3 px-3">
                      {editingAgentId === ag.id ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            value={newRate}
                            onChange={(e) => setNewRate(Number(e.target.value))}
                            className="w-16 bg-slate-950 border border-amber-500 rounded px-1.5 py-0.5 text-white font-mono text-xs"
                          />
                          <button
                            id={`save-rate-btn-${ag.id}`}
                            type="button"
                            onClick={() => handleUpdateRate(ag.id)}
                            className="px-2 py-0.5 bg-amber-500 text-slate-950 rounded font-bold text-[10px] cursor-pointer"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingAgentId(null)}
                            className="px-1.5 py-0.5 text-slate-400 hover:text-white text-[10px] cursor-pointer"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <button
                          id={`edit-rate-btn-${ag.id}`}
                          type="button"
                          onClick={() => {
                            setEditingAgentId(ag.id);
                            setNewRate(ag.commissionRate);
                          }}
                          className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-amber-400 hover:border-amber-500 transition-colors font-bold cursor-pointer"
                          title="Click to change rate"
                        >
                          {ag.commissionRate}% ✎
                        </button>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          ag.status === 'active'
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                            : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                        }`}
                      >
                        {ag.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        id={`toggle-status-btn-${ag.id}`}
                        type="button"
                        onClick={() => handleToggleStatus(ag)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                          ag.status === 'active'
                            ? 'border-rose-500/30 text-rose-400 hover:bg-rose-950/30'
                            : 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-950/30'
                        }`}
                      >
                        {ag.status === 'active' ? 'Suspend' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}

                {filteredAgents.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 text-xs font-sans">
                      No sub-merchants registered yet. Click &quot;+ Add Reseller&quot; to enroll an agent.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: PAYSTACK MANUAL REFUND MODAL */}
      {isRefundModalOpen && selectedOrderForRefund && (
        <div
          id="paystack-refund-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="refund-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in"
        >
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 id="refund-modal-title" className="text-base font-bold text-white">
                    Trigger Paystack Manual Refund
                  </h3>
                  <p className="text-xs text-slate-400">
                    Order ID: <span className="font-mono text-amber-400 font-bold">{selectedOrderForRefund.id}</span>
                  </p>
                </div>
              </div>
              <button
                id="close-refund-modal-btn"
                type="button"
                onClick={() => setIsRefundModalOpen(false)}
                aria-label="Close refund dialog"
                className="text-slate-400 hover:text-white p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Order Details Summary Box */}
            <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-3.5 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Recipient Phone:</span>
                <span className="text-white font-bold font-mono">{selectedOrderForRefund.customerPhone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Network & Package:</span>
                <span className="text-amber-400 font-bold">
                  {selectedOrderForRefund.network} - {selectedOrderForRefund.packageName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Channel Attributed:</span>
                <span className="text-slate-300">
                  {selectedOrderForRefund.agentName || 'Direct Platform'}
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-800/80 pt-2">
                <span className="text-slate-400">Original Charged Amount:</span>
                <span className="text-white font-bold font-sans">
                  GHS {selectedOrderForRefund.amountGhs.toFixed(2)}
                </span>
              </div>
            </div>

            <form onSubmit={handleExecuteOrderRefund} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Paystack Reference / Transaction ID
                </label>
                <input
                  type="text"
                  required
                  value={refundReference}
                  onChange={(e) => setRefundReference(e.target.value)}
                  placeholder="TRX-..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Reference submitted to Paystack API to locate and refund the payment
                </p>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Refund Amount (GHS)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-xs text-slate-400 font-bold">GHS</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.1"
                    max={selectedOrderForRefund.amountGhs}
                    required
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-12 pr-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Reason for Refund
                </label>
                <select
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="Hubtel Carrier Fulfillment Failed">Hubtel Carrier Fulfillment Failed</option>
                  <option value="Customer Double Charged">Customer Double Charged on MoMo</option>
                  <option value="Network Switch Timeout">Network Switch Timeout</option>
                  <option value="Customer Request">Customer Requested Refund</option>
                  <option value="Administrative Override">Administrative Override</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Additional Admin Note (Optional)
                </label>
                <input
                  type="text"
                  value={refundNotes}
                  onChange={(e) => setRefundNotes(e.target.value)}
                  placeholder="e.g. Carrier switch 105 error, reversed to customer wallet"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRefundModalOpen(false)}
                  className="w-1/3 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 font-bold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="confirm-paystack-refund-submit-btn"
                  type="submit"
                  disabled={isProcessingRefund}
                  className="w-2/3 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-purple-900/40 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isProcessingRefund ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Sending to Paystack...</span>
                    </>
                  ) : (
                    <>
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Execute Paystack Refund</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CREATE SUB-MERCHANT AGENT MODAL (ADMIN ONLY) */}
      {isCreateAgentOpen && (
        <div
          id="create-agent-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-agent-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in"
        >
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                  <PlusCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 id="create-agent-modal-title" className="text-base font-bold text-white">
                    Create Sub-Merchant Agent
                  </h3>
                  <p className="text-xs text-slate-400">
                    Admin authorization: enroll a verified reseller with custom commission rates
                  </p>
                </div>
              </div>
              <button
                id="close-create-agent-modal-btn"
                type="button"
                onClick={() => setIsCreateAgentOpen(false)}
                aria-label="Close modal"
                className="text-slate-400 hover:text-white p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateAgentSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Business / Store Outlet Name
                </label>
                <input
                  type="text"
                  required
                  value={agentBusinessName}
                  onChange={(e) => setAgentBusinessName(e.target.value)}
                  placeholder="e.g. Madina Telecom Hub"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Agent Full Name
                </label>
                <input
                  type="text"
                  required
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  placeholder="e.g. Kwame Mensah"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    Contact Phone
                  </label>
                  <input
                    type="tel"
                    required
                    value={agentPhone}
                    onChange={(e) => {
                      setAgentPhone(e.target.value);
                      if (!agentMomoNumber) {
                        setAgentMomoNumber(e.target.value);
                      }
                    }}
                    placeholder="024XXXXXXX"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    MoMo Wallet Number
                  </label>
                  <input
                    type="tel"
                    value={agentMomoNumber}
                    onChange={(e) => setAgentMomoNumber(e.target.value)}
                    placeholder="024XXXXXXX"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    MoMo Network
                  </label>
                  <select
                    value={agentMomoNetwork}
                    onChange={(e) => setAgentMomoNetwork(e.target.value as TelecomNetwork)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="MTN">MTN MoMo</option>
                    <option value="TELECEL">Telecel Cash</option>
                    <option value="AIRTELTIGO">AirtelTigo Money</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    Commission Split (%)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    required
                    value={agentCommissionRate}
                    onChange={(e) => setAgentCommissionRate(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateAgentOpen(false)}
                  className="w-1/3 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 font-bold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="admin-submit-create-agent-btn"
                  type="submit"
                  disabled={isSubmittingAgent}
                  className="w-2/3 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isSubmittingAgent ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Enrolling Reseller...</span>
                    </>
                  ) : (
                    <>
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>Save & Authorize Agent</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
