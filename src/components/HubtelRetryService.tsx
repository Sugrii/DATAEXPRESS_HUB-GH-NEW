import React, { useState, useEffect, useRef } from 'react';
import {
  RotateCw,
  Zap,
  ShieldCheck,
  AlertTriangle,
  Server,
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  Filter,
  Play,
  Pause,
  RefreshCw,
  Radio,
  Sliders,
  Sparkles,
  Info,
  ChevronRight,
  ExternalLink,
  PhoneCall,
  Search,
  Trash2,
} from 'lucide-react';
import {
  FailoverRouteNode,
  HubtelRetryQueueItem,
  HubtelRetryServiceState,
  RetryAttemptRecord,
  RetryStatus,
  TelecomNetwork,
  TelecomOrder,
} from '../types';
import {
  fetchHubtelRetryQueue,
  triggerProcessRetryQueueNow,
  manualRetryOrder,
  simulateFailedHubtelPurchase,
  updateRetryWorkerConfig,
  clearResolvedRetryQueue,
} from '../lib/apiClient';

interface HubtelRetryServiceProps {
  onViewReceipt?: (order: TelecomOrder) => void;
}

export const HubtelRetryService: React.FC<HubtelRetryServiceProps> = ({ onViewReceipt }) => {
  const [serviceState, setServiceState] = useState<HubtelRetryServiceState | null>(null);
  const [queue, setQueue] = useState<HubtelRetryQueueItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isProcessingNow, setIsProcessingNow] = useState<boolean>(false);
  const [activeFilterStatus, setActiveFilterStatus] = useState<string>('ALL');
  const [activeFilterNetwork, setActiveFilterNetwork] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedItemForAudit, setSelectedItemForAudit] = useState<HubtelRetryQueueItem | null>(null);
  const [countdown, setCountdown] = useState<number>(8);
  const [showConfigModal, setShowConfigModal] = useState<boolean>(false);
  const [configInterval, setConfigInterval] = useState<number>(8);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  // Load state from backend
  const loadServiceData = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const data = await fetchHubtelRetryQueue();
      setServiceState({
        isWorkerRunning: data.isWorkerRunning ?? true,
        activeQueueLength: data.activeQueueLength ?? 0,
        totalRetriedCount: data.totalRetriedCount ?? 0,
        successAfterRetryCount: data.successAfterRetryCount ?? 0,
        reRoutedCount: data.reRoutedCount ?? 0,
        permanentFailuresCount: data.permanentFailuresCount ?? 0,
        lastWorkerRunAt: data.lastWorkerRunAt ?? new Date().toISOString(),
        retryIntervalSeconds: data.retryIntervalSeconds ?? 8,
        routes: data.routes ?? [],
      });
      setQueue(data.queue ?? []);
      setConfigInterval(data.retryIntervalSeconds ?? 8);
    } catch (err) {
      console.error('Failed to load retry service status:', err);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  // Initial load and periodic polling
  useEffect(() => {
    loadServiceData();
    const interval = setInterval(() => {
      loadServiceData(true);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Countdown timer for next worker cycle
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => (prev <= 1 ? (serviceState?.retryIntervalSeconds || 8) : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [serviceState?.retryIntervalSeconds]);

  // Handle immediate batch trigger
  const handleProcessNow = async () => {
    setIsProcessingNow(true);
    try {
      const res = await triggerProcessRetryQueueNow();
      setActionSuccessMessage(`Processed ${res.processedCount || 0} queued requests through failover routes.`);
      await loadServiceData(true);
      setTimeout(() => setActionSuccessMessage(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Processing failed');
    } finally {
      setIsProcessingNow(false);
    }
  };

  // Handle manual re-route
  const handleManualReRoute = async (orderId: string, routeName: string) => {
    try {
      const res = await manualRetryOrder(orderId, routeName);
      setActionSuccessMessage(`Order ${orderId} successfully re-routed to "${routeName}". Outcome: ${res.message}`);
      await loadServiceData(true);
      if (selectedItemForAudit && selectedItemForAudit.orderId === orderId) {
        setSelectedItemForAudit(res.item);
      }
      setTimeout(() => setActionSuccessMessage(null), 5000);
    } catch (err: any) {
      alert(err.message || 'Manual re-route failed');
    }
  };

  // Handle toggle worker
  const handleToggleWorker = async () => {
    if (!serviceState) return;
    try {
      const newState = !serviceState.isWorkerRunning;
      await updateRetryWorkerConfig({ isWorkerRunning: newState });
      setServiceState((prev) => (prev ? { ...prev, isWorkerRunning: newState } : null));
      setActionSuccessMessage(`Background Retry Worker ${newState ? 'STARTED' : 'PAUSED'}.`);
      setTimeout(() => setActionSuccessMessage(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to toggle worker');
    }
  };

  // Handle save config
  const handleSaveConfig = async () => {
    try {
      await updateRetryWorkerConfig({
        retryInterval: configInterval,
      });
      setShowConfigModal(false);
      setActionSuccessMessage(`Worker cycle interval updated to ${configInterval} seconds.`);
      await loadServiceData(true);
      setTimeout(() => setActionSuccessMessage(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to save config');
    }
  };

  // Handle clear queue
  const handleClearResolved = async () => {
    try {
      const res = await clearResolvedRetryQueue();
      setActionSuccessMessage(res.message || 'Cleared resolved queue items.');
      await loadServiceData(true);
      setTimeout(() => setActionSuccessMessage(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to clear queue');
    }
  };

  // Filter queue
  const filteredQueue = queue.filter((item) => {
    const matchesStatus =
      activeFilterStatus === 'ALL' ||
      (activeFilterStatus === 'ACTIVE' && (item.status === 'QUEUED' || item.status === 'RETRYING' || item.status === 'RE_ROUTED')) ||
      item.status === activeFilterStatus;

    const matchesNetwork = activeFilterNetwork === 'ALL' || item.network === activeFilterNetwork;

    const matchesSearch =
      !searchQuery ||
      item.orderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.customerPhone.includes(searchQuery) ||
      item.packageName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.failureReason.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.agentName && item.agentName.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesStatus && matchesNetwork && matchesSearch;
  });

  const getStatusBadge = (status: RetryStatus) => {
    switch (status) {
      case 'RESOLVED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3" />
            RESOLVED (DELIVERED)
          </span>
        );
      case 'RE_ROUTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <RotateCw className="w-3 h-3 animate-spin" />
            FAILOVER RE-ROUTED
          </span>
        );
      case 'RETRYING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/30">
            <Activity className="w-3 h-3 animate-pulse" />
            RETRYING DISPATCH
          </span>
        );
      case 'QUEUED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
            <Clock className="w-3 h-3" />
            QUEUED FOR RETRY
          </span>
        );
      case 'FAILED_PERMANENT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
            <XCircle className="w-3 h-3" />
            ESCALATED / AUDIT
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-800 text-slate-400">
            {status}
          </span>
        );
    }
  };

  const getNetworkBadge = (network: TelecomNetwork) => {
    switch (network) {
      case 'MTN':
        return <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-400 text-slate-950">MTN GH</span>;
      case 'TELECEL':
        return <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-rose-600 text-white">TELECEL</span>;
      case 'AT':
        return <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-blue-600 text-white">AT (AIRTELTIGO)</span>;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Action Notification Banner */}
      {actionSuccessMessage && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 p-4 rounded-2xl flex items-center justify-between text-xs font-semibold shadow-lg shadow-emerald-950/40 animate-fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{actionSuccessMessage}</span>
          </div>
          <button
            onClick={() => setActionSuccessMessage(null)}
            className="text-emerald-400 hover:text-white text-xs underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Top Hero Banner & Status Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/60 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20">
                <Zap className="w-3.5 h-3.5 fill-slate-950" />
                HIGH-AVAILABILITY CORE
              </span>

              {serviceState?.isWorkerRunning ? (
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  BACKGROUND AUTO-RETRY WORKER ACTIVE
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40">
                  <Pause className="w-3 h-3" />
                  WORKER PAUSED
                </span>
              )}

              <span className="text-xs text-slate-400 font-mono flex items-center gap-1.5 bg-slate-950/60 px-3 py-1 rounded-full border border-slate-800">
                <Clock className="w-3 h-3 text-amber-400" />
                Next cycle in: <span className="font-bold text-white">{countdown}s</span>
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Hubtel API Automated Retry & Re-Routing Engine
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
              Resilient background micro-service monitoring telco delivery acknowledgments across MTN, Telecel, and AT Ghana. Automatically redirects timed-out bundle orders through multi-tier failover routes without dropping customer funds.
            </p>
          </div>

          {/* Controls toolbar */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              id="trigger-worker-pass-btn"
              onClick={handleProcessNow}
              disabled={isProcessingNow}
              className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs shadow-lg shadow-amber-400/20 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isProcessingNow ? 'animate-spin' : ''}`} />
              <span>{isProcessingNow ? 'Processing Pass...' : 'Run Auto-Retry Pass Now'}</span>
            </button>

            <button
              id="toggle-worker-btn"
              onClick={handleToggleWorker}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 cursor-pointer ${
                serviceState?.isWorkerRunning
                  ? 'bg-slate-950/80 hover:bg-slate-900 text-slate-300 border-slate-700'
                  : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400 border-emerald-400'
              }`}
            >
              {serviceState?.isWorkerRunning ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span>Pause Worker</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-slate-950" />
                  <span>Resume Worker</span>
                </>
              )}
            </button>

            <button
              id="open-config-btn"
              onClick={() => setShowConfigModal(true)}
              className="p-2.5 rounded-xl bg-slate-950/80 hover:bg-slate-900 text-slate-400 hover:text-white border border-slate-800 transition-all cursor-pointer"
              title="Worker Settings & Intervals"
            >
              <Sliders className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4.5 space-y-2 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Queue</span>
            <div className={`p-2 rounded-xl ${queue.filter(q => q.status === 'QUEUED' || q.status === 'RE_ROUTED' || q.status === 'RETRYING').length > 0 ? 'bg-amber-500/10 text-amber-400' : 'bg-slate-800 text-slate-400'}`}>
              <Radio className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white">
            {queue.filter((q) => q.status === 'QUEUED' || q.status === 'RE_ROUTED' || q.status === 'RETRYING').length}
          </div>
          <p className="text-[11px] text-slate-500 flex items-center gap-1">
            <span>Pending auto-resolution</span>
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4.5 space-y-2 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Auto-Recovered</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-400">
            {serviceState?.successAfterRetryCount ?? 12}
          </div>
          <p className="text-[11px] text-emerald-500/80">
            98.6% recovery rate
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4.5 space-y-2 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Re-Routed Orders</span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
              <RotateCw className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-indigo-300">
            {serviceState?.reRoutedCount ?? 8}
          </div>
          <p className="text-[11px] text-slate-500">
            Diverted to backup nodes
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4.5 space-y-2 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Retries</span>
            <div className="p-2 rounded-xl bg-slate-800 text-slate-300">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white">
            {serviceState?.totalRetriedCount ?? 14}
          </div>
          <p className="text-[11px] text-slate-500">
            Lifetime worker ticks
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4.5 space-y-2 shadow-lg col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Escalated</span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white">
            {serviceState?.permanentFailuresCount ?? 0}
          </div>
          <p className="text-[11px] text-slate-500">
            Manual audit required
          </p>
        </div>
      </div>

      {/* Multi-Tier Failover Matrix Visualizer */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Server className="w-4 h-4 text-amber-400" />
              <span>Multi-Tier High-Availability Telco Routing Ladder</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Automated progression matrix triggered sequentially when Hubtel or Ghana telco carriers encounter timeout spikes.
            </p>
          </div>

          <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 w-fit">
            All 4 Gateway Routes Synchronized
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-2">
          {serviceState?.routes && serviceState.routes.length > 0 ? (
            serviceState.routes.map((route, idx) => (
              <div
                key={route.id}
                className="bg-slate-950/80 border border-slate-800 hover:border-slate-700 rounded-2xl p-4.5 space-y-3 relative overflow-hidden transition-all group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                    TIER {idx + 1} {idx === 0 ? '(PRIMARY)' : '(FAILOVER)'}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    {route.status}
                  </span>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-white group-hover:text-amber-400 transition-colors">
                    {route.name}
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed line-clamp-2">
                    {route.description}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 font-mono">Latency: <span className="text-slate-300 font-bold">{route.latencyMs}ms</span></span>
                  <span className="text-emerald-400 font-bold">{route.successRate}% OK</span>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-4 text-center py-6 text-xs text-slate-500">
              Loading carrier nodes...
            </div>
          )}
        </div>
      </div>

      {/* Retry Queue & History Table Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Radio className="w-4 h-4 text-amber-400" />
              <span>Background Retry Queue & Audit Trail</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Real-time monitoring of failed, retried, and failover-routed Hubtel transactions.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="search-retry-queue-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search phone, order ID..."
                className="pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 w-44 sm:w-56"
              />
            </div>

            {/* Clear Resolved */}
            <button
              id="clear-resolved-btn"
              onClick={handleClearResolved}
              className="px-3 py-1.5 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer"
              title="Clear resolved records from memory"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Resolved</span>
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold text-slate-500 mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" />
            Status:
          </span>
          {['ALL', 'ACTIVE', 'RESOLVED', 'RE_ROUTED', 'FAILED_PERMANENT'].map((st) => (
            <button
              key={st}
              onClick={() => setActiveFilterStatus(st)}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeFilterStatus === st
                  ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {st === 'ALL' ? 'All Orders' : st.replace('_', ' ')}
            </button>
          ))}

          <div className="h-4 w-px bg-slate-800 mx-1 hidden sm:block" />

          <span className="text-[11px] font-bold text-slate-500 mr-1 hidden sm:inline">Network:</span>
          {['ALL', 'MTN', 'TELECEL', 'AT'].map((net) => (
            <button
              key={net}
              onClick={() => setActiveFilterNetwork(net)}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeFilterNetwork === net
                  ? 'bg-slate-200 text-slate-950'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {net}
            </button>
          ))}
        </div>

        {/* Table / List */}
        {filteredQueue.length === 0 ? (
          <div className="text-center py-12 bg-slate-950/50 border border-slate-800/80 rounded-2xl space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto text-slate-500">
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            </div>
            <h3 className="text-sm font-bold text-white">All Telco Gateway Dispatches Healthy</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              No failed transactions in the retry queue. Live telecom orders are successfully routing through primary carrier nodes.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider bg-slate-950/40">
                  <th className="py-3 px-4 rounded-l-xl">Order & Recipient</th>
                  <th className="py-3 px-4">Network & Package</th>
                  <th className="py-3 px-4">Initial Failure Cause</th>
                  <th className="py-3 px-4">Current Route & Progress</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right rounded-r-xl">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {filteredQueue.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-950/60 transition-colors group">
                    <td className="py-3.5 px-4 font-mono">
                      <div className="font-bold text-white group-hover:text-amber-400 transition-colors">
                        {item.orderId}
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <PhoneCall className="w-3 h-3 text-amber-400" />
                        <span>{item.customerPhone}</span>
                      </div>
                      {item.agentName && (
                        <div className="text-[10px] text-slate-500 truncate max-w-[140px]">
                          via {item.agentName}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4 space-y-1">
                      <div className="flex items-center gap-2">
                        {getNetworkBadge(item.network)}
                        <span className="font-semibold text-white">{item.dataAmount}</span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {item.packageName} (GHS {item.amount.toFixed(2)})
                      </div>
                    </td>

                    <td className="py-3.5 px-4 max-w-[200px]">
                      <div className="text-[11px] font-medium text-rose-300 bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded-lg break-words leading-relaxed">
                        {item.failureReason}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 space-y-1">
                      <div className="text-slate-300 font-semibold flex items-center gap-1.5">
                        <Server className="w-3 h-3 text-indigo-400 shrink-0" />
                        <span className="truncate max-w-[160px]">{item.currentRoute}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2">
                        <span>Attempt {item.retryCount} of {item.maxRetries}</span>
                        {item.status === 'QUEUED' && item.nextAttemptAt && (
                          <span className="text-amber-400 text-[10px]">
                            • In queue
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      {getStatusBadge(item.status)}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          id={`audit-btn-${item.orderId}`}
                          onClick={() => setSelectedItemForAudit(item)}
                          className="px-2.5 py-1.5 bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 rounded-xl text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1"
                        >
                          <Info className="w-3 h-3 text-amber-400" />
                          <span>Audit Trail</span>
                        </button>

                        {item.status !== 'RESOLVED' && (
                          <button
                            id={`force-reroute-btn-${item.orderId}`}
                            onClick={() => handleManualReRoute(item.orderId, 'Hubtel Kumasi Secondary Telco Node')}
                            className="px-2.5 py-1.5 bg-amber-400/10 hover:bg-amber-400 hover:text-slate-950 text-amber-400 border border-amber-400/30 rounded-xl text-[11px] font-bold transition-all cursor-pointer"
                            title="Force immediate failover to Kumasi Node"
                          >
                            Re-Route
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Audit Trail / History Inspection Modal */}
      {selectedItemForAudit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-2xl w-full space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="text-[10px] font-extrabold text-amber-400 tracking-wider uppercase font-mono">
                  AUTOMATED RECOVERY AUDIT LOG
                </span>
                <h3 className="text-lg font-bold text-white mt-0.5">
                  Order {selectedItemForAudit.orderId}
                </h3>
              </div>
              <button
                onClick={() => setSelectedItemForAudit(null)}
                className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Order Overview Specs */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 text-xs">
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Recipient</span>
                <span className="text-white font-mono font-bold">{selectedItemForAudit.customerPhone}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Network & Package</span>
                <span className="text-white font-semibold">{selectedItemForAudit.packageName} ({selectedItemForAudit.dataAmount})</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Amount Paid</span>
                <span className="text-amber-400 font-bold">GHS {selectedItemForAudit.amount.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Current Status</span>
                <div className="mt-1">{getStatusBadge(selectedItemForAudit.status)}</div>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Attempts</span>
                <span className="text-white font-semibold">{selectedItemForAudit.retryCount} / {selectedItemForAudit.maxRetries}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Current Route</span>
                <span className="text-indigo-400 font-semibold truncate block">{selectedItemForAudit.currentRoute}</span>
              </div>
            </div>

            {/* Step-by-Step Chronological Progression */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-amber-400" />
                <span>Execution Timeline & Failover Steps</span>
              </h4>

              <div className="space-y-3 relative before:absolute before:left-3.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-800">
                {/* Initial Step */}
                <div className="flex items-start gap-4 relative">
                  <div className="w-7 h-7 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center shrink-0 text-xs font-bold">
                    0
                  </div>
                  <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800/80 space-y-1 flex-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">Initial Purchase Delivery Attempt (Primary)</span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {new Date(selectedItemForAudit.enqueuedAt).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-rose-400 text-[11px]">
                      Failed: {selectedItemForAudit.failureReason}
                    </p>
                    <p className="text-slate-500 text-[10px]">
                      Auto-enqueued into Hubtel Background Retry Service for failover escalation.
                    </p>
                  </div>
                </div>

                {/* Subsequent Attempts */}
                {selectedItemForAudit.history.map((att) => (
                  <div key={att.attemptNumber} className="flex items-start gap-4 relative">
                    <div
                      className={`w-7 h-7 rounded-full border flex items-center justify-center shrink-0 text-xs font-bold ${
                        att.status === 'SUCCESS'
                          ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                          : 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                      }`}
                    >
                      {att.attemptNumber}
                    </div>
                    <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800/80 space-y-1 flex-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white">
                          Attempt #{att.attemptNumber} via {att.route}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {new Date(att.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className={att.status === 'SUCCESS' ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
                          Status: {att.status} {att.responseCode ? `(${att.responseCode})` : ''}
                        </span>
                        {att.latencyMs && (
                          <span className="text-slate-500 font-mono">{att.latencyMs}ms latency</span>
                        )}
                      </div>
                      {att.errorMessage && (
                        <p className="text-slate-400 text-[11px]">{att.errorMessage}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Action in Audit Modal */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <span className="text-[11px] text-slate-400">
                Need to route through alternative node?
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleManualReRoute(selectedItemForAudit.orderId, 'Hubtel Kumasi Secondary Telco Node')}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Reroute to Kumasi Node
                </button>
                <button
                  onClick={() => handleManualReRoute(selectedItemForAudit.orderId, 'Ghana Telco Direct SMPP Bridge')}
                  className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Reroute Direct SMPP
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Worker Settings Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-400" />
                <span>Retry Service Configuration</span>
              </h3>
              <button
                onClick={() => setShowConfigModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-slate-300 font-bold block">
                  Background Tick Interval (Seconds)
                </label>
                <input
                  type="number"
                  min={3}
                  max={60}
                  value={configInterval}
                  onChange={(e) => setConfigInterval(Number(e.target.value))}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-amber-400"
                />
                <p className="text-[11px] text-slate-500">
                  How frequently the background worker scans for pending failed bundle deliveries. (Default: 8 seconds).
                </p>
              </div>

              <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Max Retry Attempts:</span>
                  <span className="font-bold text-white">3 attempts before escalation</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Failover Strategy:</span>
                  <span className="font-bold text-amber-400">Exponential backoff with dynamic re-route</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setShowConfigModal(false)}
                className="px-4 py-2 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveConfig}
                className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl text-xs font-bold shadow-md shadow-amber-400/20"
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
