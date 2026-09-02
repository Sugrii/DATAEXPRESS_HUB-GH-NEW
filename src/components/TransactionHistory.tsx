import React, { useState, useEffect, useMemo } from 'react';
import {
  History,
  Search,
  Filter,
  Download,
  Printer,
  CheckCircle2,
  Clock,
  AlertCircle,
  Phone,
  Zap,
  Radio,
  FileText,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  ArrowUpDown,
  Calendar,
  Sparkles,
  DollarSign,
  TrendingUp,
  CreditCard,
  Building2,
  Share2,
} from 'lucide-react';
import { TelecomOrder, TelecomNetwork, SubMerchant } from '../types';
import { subscribeGlobalOrders, subscribeAgentOrders } from '../lib/firestoreService';
import { NETWORK_THEMES } from '../data/telecomCatalog';

interface TransactionHistoryProps {
  agentId?: string;
  agentName?: string;
  initialCustomerPhone?: string;
  onViewReceipt?: (order: TelecomOrder) => void;
  onSelectAgent?: (agentId: string) => void;
  availableAgents?: SubMerchant[];
}

export const TransactionHistory: React.FC<TransactionHistoryProps> = ({
  agentId,
  agentName,
  initialCustomerPhone,
  onViewReceipt,
  onSelectAgent,
  availableAgents = [],
}) => {
  const [orders, setOrders] = useState<TelecomOrder[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>(initialCustomerPhone || '');
  const [networkFilter, setNetworkFilter] = useState<'ALL' | TelecomNetwork>('ALL');
  const [productTypeFilter, setProductTypeFilter] = useState<'ALL' | 'DATA' | 'AIRTIME'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'DELIVERED' | 'PROCESSING' | 'FAILED'>('ALL');
  const [timeFilter, setTimeFilter] = useState<'ALL' | 'TODAY' | 'WEEK' | 'MONTH'>('ALL');
  const [selectedAgentFilter, setSelectedAgentFilter] = useState<string>(agentId || 'ALL');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc' | 'comm-desc'>('date-desc');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isDownloadingCSV, setIsDownloadingCSV] = useState<boolean>(false);
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<TelecomOrder | null>(null);

  // Sync selectedAgentFilter if agentId prop changes
  useEffect(() => {
    if (agentId) {
      setSelectedAgentFilter(agentId);
    }
  }, [agentId]);

  // Real-time Subscription to Firestore Orders
  useEffect(() => {
    setIsLoading(true);
    let unsubscribe: () => void;

    if (agentId && agentId !== 'ALL') {
      unsubscribe = subscribeAgentOrders(agentId, (fetchedOrders) => {
        setOrders(fetchedOrders);
        setIsLoading(false);
      });
    } else {
      unsubscribe = subscribeGlobalOrders((fetchedOrders) => {
        setOrders(fetchedOrders);
        setIsLoading(false);
      });
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [agentId]);

  // Handle Manual Refresh
  const handleManualRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  };

  // Copy helper
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filter and Sort Logic
  const filteredOrders = useMemo(() => {
    return orders
      .filter((order) => {
        // Search query check
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchId = order.id?.toLowerCase().includes(q);
          const matchPhone = order.customerPhone?.toLowerCase().includes(q);
          const matchPkg = order.packageName?.toLowerCase().includes(q);
          const matchAgent = order.agentName?.toLowerCase().includes(q);
          const matchRef = order.paymentReference?.toLowerCase().includes(q);
          const matchHubtel = order.hubtelTransactionId?.toLowerCase().includes(q);

          if (!matchId && !matchPhone && !matchPkg && !matchAgent && !matchRef && !matchHubtel) {
            return false;
          }
        }

        // Network filter
        if (networkFilter !== 'ALL' && order.network !== networkFilter) {
          return false;
        }

        // Product type filter
        if (productTypeFilter !== 'ALL' && order.productType !== productTypeFilter) {
          return false;
        }

        // Status filter
        if (statusFilter !== 'ALL' && order.deliveryStatus !== statusFilter) {
          return false;
        }

        // Agent filter (when viewing global orders)
        if (selectedAgentFilter !== 'ALL' && order.agentId !== selectedAgentFilter) {
          return false;
        }

        // Time filter
        if (timeFilter !== 'ALL') {
          const orderDate = new Date(order.createdAt).getTime();
          const now = Date.now();
          if (timeFilter === 'TODAY') {
            const oneDayAgo = now - 24 * 60 * 60 * 1000;
            if (orderDate < oneDayAgo) return false;
          } else if (timeFilter === 'WEEK') {
            const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
            if (orderDate < sevenDaysAgo) return false;
          } else if (timeFilter === 'MONTH') {
            const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
            if (orderDate < thirtyDaysAgo) return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'date-desc') {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        if (sortBy === 'date-asc') {
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        }
        if (sortBy === 'amount-desc') {
          return (b.amount || 0) - (a.amount || 0);
        }
        if (sortBy === 'amount-asc') {
          return (a.amount || 0) - (b.amount || 0);
        }
        if (sortBy === 'comm-desc') {
          return (b.commissionAmount || 0) - (a.commissionAmount || 0);
        }
        return 0;
      });
  }, [orders, searchQuery, networkFilter, productTypeFilter, statusFilter, selectedAgentFilter, timeFilter, sortBy]);

  // Summary Metrics calculations
  const stats = useMemo(() => {
    const totalCount = filteredOrders.length;
    const totalVolume = filteredOrders.reduce((sum, o) => sum + (o.amount || 0), 0);
    const totalCommission = filteredOrders.reduce((sum, o) => sum + (o.commissionAmount || 0), 0);
    const successfulCount = filteredOrders.filter((o) => o.deliveryStatus === 'DELIVERED').length;
    const successRate = totalCount > 0 ? ((successfulCount / totalCount) * 100).toFixed(1) : '100.0';

    const mtnCount = filteredOrders.filter((o) => o.network === 'MTN').length;
    const telecelCount = filteredOrders.filter((o) => o.network === 'TELECEL').length;
    const atCount = filteredOrders.filter((o) => o.network === 'AT').length;

    return {
      totalCount,
      totalVolume,
      totalCommission,
      successRate,
      mtnCount,
      telecelCount,
      atCount,
    };
  }, [filteredOrders]);

  // Comprehensive Export to CSV Function for Offline Accounting & Reconciliation
  const handleExportCSV = () => {
    if (filteredOrders.length === 0) return;

    setIsDownloadingCSV(true);

    try {
      const headers = [
        'Order ID',
        'Date & Time',
        'ISO Timestamp',
        'Network Provider',
        'Product Type',
        'Package Name',
        'Volume / Capacity',
        'Customer Phone',
        'Gross Amount (GHS)',
        '10% Agent Commission (GHS)',
        'Net Platform Remittance (GHS)',
        'Agent / Sub-Merchant Name',
        'Agent Phone',
        'Agent ID',
        'Payment Processor',
        'Payment Reference',
        'Delivery Status',
        'Hubtel Transaction Reference',
        'Routing Gateway Node',
      ];

      const rows = filteredOrders.map((o) => {
        const gross = Number(o.amount) || 0;
        const comm = Number(o.commissionAmount) || 0;
        const net = Math.max(0, gross - comm);

        return [
          `"${(o.id || '').replace(/"/g, '""')}"`,
          `"${new Date(o.createdAt).toLocaleString()}"`,
          `"${o.createdAt}"`,
          `"${o.network}"`,
          `"${o.productType}"`,
          `"${(o.packageName || '').replace(/"/g, '""')}"`,
          `"${(o.dataAmount || '').replace(/"/g, '""')}"`,
          `"${o.customerPhone}"`,
          gross.toFixed(2),
          comm.toFixed(2),
          net.toFixed(2),
          `"${(o.agentName || 'Direct Storefront').replace(/"/g, '""')}"`,
          `"${o.agentPhone || '-'}"`,
          `"${o.agentId || 'DIRECT'}"`,
          `"${o.paymentMethod || 'PAYSTACK_MOMO'}"`,
          `"${(o.paymentReference || '-').replace(/"/g, '""')}"`,
          `"${o.deliveryStatus}"`,
          `"${(o.hubtelTransactionId || '-').replace(/"/g, '""')}"`,
          `"${(o.routingGateway || 'HUBTEL-ACCRA-CORE-DC2').replace(/"/g, '""')}"`,
        ];
      });

      // Calculate totals for reconciliation summary section at bottom
      const totalGross = filteredOrders.reduce((sum, o) => sum + (Number(o.amount) || 0), 0);
      const totalComm = filteredOrders.reduce((sum, o) => sum + (Number(o.commissionAmount) || 0), 0);
      const totalNet = totalGross - totalComm;
      const deliveredCount = filteredOrders.filter((o) => o.deliveryStatus === 'DELIVERED').length;
      const processingCount = filteredOrders.filter((o) => o.deliveryStatus === 'PROCESSING').length;
      const failedCount = filteredOrders.filter((o) => o.deliveryStatus === 'FAILED').length;

      const summaryRows = [
        '',
        '--- OFFLINE RECONCILIATION SUMMARY ---',
        `"Export Generated At","${new Date().toLocaleString()}"`,
        `"Agent / View Filter","${agentName || (selectedAgentFilter !== 'ALL' ? selectedAgentFilter : 'All Agents / Global')}"`,
        `"Network Filter","${networkFilter}"`,
        `"Product Filter","${productTypeFilter}"`,
        `"Status Filter","${statusFilter}"`,
        `"Time Range Filter","${timeFilter}"`,
        `"Total Filtered Transactions",${filteredOrders.length}`,
        `"Delivered Count",${deliveredCount}`,
        `"Processing Count",${processingCount}`,
        `"Failed Count",${failedCount}`,
        `"Total Gross Sales Volume (GHS)",${totalGross.toFixed(2)}`,
        `"Total 10% Agent Commission (GHS)",${totalComm.toFixed(2)}`,
        `"Total Net Platform Remittance (GHS)",${totalNet.toFixed(2)}`,
        `"Hubtel Delivery Success Rate","${stats.successRate}%"`,
      ];

      const csvContent = [
        headers.join(','),
        ...rows.map((r) => r.join(',')),
        ...summaryRows,
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      const safeAgentName = (agentName || agentId || 'global')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_');
      link.setAttribute(
        'download',
        `ghana_telecom_ledger_${safeAgentName}_${new Date().toISOString().slice(0, 10)}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 2500);
    } catch (err) {
      console.error('Failed to generate CSV export:', err);
    } finally {
      setIsDownloadingCSV(false);
    }
  };

  // WhatsApp share receipt
  const handleWhatsAppShare = (order: TelecomOrder) => {
    const text = `*Ghana Telecom Hub - Order Confirmation*\n` +
      `📦 Order ID: ${order.id}\n` +
      `📶 Network: ${order.network} Ghana\n` +
      `⚡ Bundle: ${order.packageName} (${order.dataAmount})\n` +
      `📱 Recipient: ${order.customerPhone}\n` +
      `💰 Amount Paid: GHS ${(order.amount || 0).toFixed(2)}\n` +
      `🏢 Agent: ${order.agentName || 'Ghana Telecom Hub'}\n` +
      `✅ Delivery Status: ${order.deliveryStatus} (Via Hubtel API)\n` +
      `📅 Date: ${new Date(order.createdAt).toLocaleString()}`;

    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-950/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-400 text-xs font-semibold">
              <History className="w-3.5 h-3.5" />
              <span>Real-Time Firestore Transaction Ledger</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-['Outfit']">
              {agentName ? (
                <>
                  <span className="text-amber-400">{agentName}</span> — Sales History
                </>
              ) : (
                <>
                  Ghana Telecom <span className="text-amber-400">Order & Sales History</span>
                </>
              )}
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm max-w-2xl">
              Track real-time bundle and airtime dispatches across MTN, Telecel, and AT networks.
              Audited 10% sub-merchant commissions, Paystack payments, and Hubtel delivery status.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              id="refresh-transactions-btn"
              onClick={handleManualRefresh}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold border border-slate-700 flex items-center gap-2 transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            <button
              id="download-csv-btn"
              onClick={handleExportCSV}
              disabled={filteredOrders.length === 0 || isDownloadingCSV}
              title="Download Filtered Ledger as CSV for offline bookkeeping & accounting"
              className={`px-4 py-2 rounded-xl text-xs font-bold border flex items-center gap-2 transition-all shadow-lg ${
                downloadSuccess
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                  : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border-emerald-500/40 shadow-emerald-950/40'
              } disabled:opacity-40 disabled:pointer-events-none`}
            >
              {isDownloadingCSV ? (
                <RefreshCw className="w-3.5 h-3.5 text-emerald-300 animate-spin" />
              ) : downloadSuccess ? (
                <Check className="w-3.5 h-3.5 text-slate-950" />
              ) : (
                <Download className="w-3.5 h-3.5 text-emerald-400" />
              )}
              <span>
                {isDownloadingCSV
                  ? 'Generating CSV...'
                  : downloadSuccess
                  ? 'CSV Downloaded!'
                  : `Download CSV (${filteredOrders.length})`}
              </span>
            </button>
          </div>
        </div>

        {/* Top Summary Metrics Bar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Total Transactions</span>
              <History className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-2xl font-black text-white font-['Outfit']">{stats.totalCount}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              MTN: <span className="text-amber-400 font-bold">{stats.mtnCount}</span> • TEL:{' '}
              <span className="text-rose-400 font-bold">{stats.telecelCount}</span> • AT:{' '}
              <span className="text-blue-400 font-bold">{stats.atCount}</span>
            </p>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Gross Sales Volume</span>
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-2xl font-black text-emerald-400 font-['Outfit']">
              GHS {stats.totalVolume.toFixed(2)}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Paystack MoMo collected</p>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>10% Agent Commission</span>
              <Sparkles className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-2xl font-black text-amber-400 font-['Outfit']">
              GHS {stats.totalCommission.toFixed(2)}
            </p>
            <p className="text-[11px] text-emerald-400 mt-0.5">Auto-credited to MoMo accounts</p>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Hubtel Success Rate</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-2xl font-black text-white font-['Outfit']">{stats.successRate}%</p>
            <p className="text-[11px] text-emerald-400 mt-0.5">Automated telco packet dispatch</p>
          </div>
        </div>
      </div>

      {/* Filter and Search Controls Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
          {/* Main Search Input */}
          <div className="lg:col-span-4 relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              id="search-transactions-input"
              type="text"
              placeholder="Search phone, order ID, package..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          {/* Network Filter */}
          <div className="lg:col-span-2">
            <select
              id="filter-network-select"
              value={networkFilter}
              onChange={(e) => setNetworkFilter(e.target.value as any)}
              className="w-full py-2.5 px-3 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              <option value="ALL">All Networks</option>
              <option value="MTN">MTN Ghana</option>
              <option value="TELECEL">Telecel Ghana</option>
              <option value="AT">AT (AirtelTigo)</option>
            </select>
          </div>

          {/* Product Type Filter */}
          <div className="lg:col-span-2">
            <select
              id="filter-product-type-select"
              value={productTypeFilter}
              onChange={(e) => setProductTypeFilter(e.target.value as any)}
              className="w-full py-2.5 px-3 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              <option value="ALL">All Products</option>
              <option value="DATA">Data Bundles</option>
              <option value="AIRTIME">Airtime Top-ups</option>
            </select>
          </div>

          {/* Delivery Status Filter */}
          <div className="lg:col-span-2">
            <select
              id="filter-status-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full py-2.5 px-3 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              <option value="ALL">All Statuses</option>
              <option value="DELIVERED">Delivered</option>
              <option value="PROCESSING">Processing</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>

          {/* Time Filter */}
          <div className="lg:col-span-2">
            <select
              id="filter-time-select"
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value as any)}
              className="w-full py-2.5 px-3 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              <option value="ALL">All Time</option>
              <option value="TODAY">Last 24 Hours</option>
              <option value="WEEK">Last 7 Days</option>
              <option value="MONTH">Last 30 Days</option>
            </select>
          </div>
        </div>

        {/* Secondary Sub-Row: Sub-Merchant Selection & Sort */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            {!agentId && availableAgents.length > 0 && (
              <div className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <span>Filter Agent:</span>
                <select
                  value={selectedAgentFilter}
                  onChange={(e) => setSelectedAgentFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-200 focus:outline-none"
                >
                  <option value="ALL">All Sub-Merchants & Direct</option>
                  {availableAgents.map((ag) => (
                    <option key={ag.id} value={ag.id}>
                      {ag.businessName} ({ag.name})
                    </option>
                  ))}
                </select>
              </div>
            )}
            <span>
              Showing <strong className="text-white">{filteredOrders.length}</strong> of {orders.length} orders
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              id="sub-download-csv-btn"
              onClick={handleExportCSV}
              disabled={filteredOrders.length === 0 || isDownloadingCSV}
              className="text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 transition-all disabled:opacity-40"
              title="Download filtered transactions as CSV"
            >
              <Download className="w-3 h-3" />
              <span>Download CSV</span>
            </button>

            <div className="flex items-center gap-1.5">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <span>Sort by:</span>
              <select
                id="sort-orders-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none"
              >
                <option value="date-desc">Newest First</option>
                <option value="date-asc">Oldest First</option>
                <option value="amount-desc">Amount (High to Low)</option>
                <option value="amount-asc">Amount (Low to High)</option>
                <option value="comm-desc">10% Commission (High to Low)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Orders Table Container */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {isLoading ? (
          <div className="py-16 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-amber-400 animate-spin mx-auto" />
            <p className="text-sm font-semibold text-white">Syncing Firestore Order Ledger...</p>
            <p className="text-xs text-slate-400">Loading multi-network transactions in real time</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-16 text-center space-y-4 px-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 mx-auto">
              <History className="w-7 h-7" />
            </div>
            <div className="space-y-1 max-w-sm mx-auto">
              <h3 className="text-base font-bold text-white">No Transactions Found</h3>
              <p className="text-xs text-slate-400">
                {searchQuery || networkFilter !== 'ALL' || statusFilter !== 'ALL'
                  ? 'Try clearing or changing your filters to see more results.'
                  : 'Orders created via Storefront, Agent links, or Bulk recharges will appear here automatically.'}
              </p>
            </div>
            {(searchQuery || networkFilter !== 'ALL' || statusFilter !== 'ALL' || timeFilter !== 'ALL') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setNetworkFilter('ALL');
                  setProductTypeFilter('ALL');
                  setStatusFilter('ALL');
                  setTimeFilter('ALL');
                  setSelectedAgentFilter('ALL');
                }}
                className="px-4 py-2 rounded-xl bg-amber-400/20 text-amber-300 border border-amber-400/30 text-xs font-semibold hover:bg-amber-400/30 transition-all"
              >
                Reset All Filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase font-semibold text-[11px] tracking-wider">
                  <th className="py-3.5 px-4">Order ID & Date</th>
                  <th className="py-3.5 px-4">Network & Package</th>
                  <th className="py-3.5 px-4">Recipient Phone</th>
                  <th className="py-3.5 px-4">Amount & 10% Comm</th>
                  <th className="py-3.5 px-4">Sub-Merchant</th>
                  <th className="py-3.5 px-4">Delivery Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredOrders.map((order) => {
                  const netTheme = NETWORK_THEMES[order.network] || NETWORK_THEMES.MTN;
                  const isCopied = copiedId === order.id;

                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-slate-800/40 transition-colors group"
                    >
                      {/* Order ID & Date */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-white text-xs">{order.id}</span>
                          <button
                            onClick={() => handleCopy(order.id, order.id)}
                            title="Copy Order ID"
                            className="text-slate-500 hover:text-amber-400 transition-colors"
                          >
                            {isCopied ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {new Date(order.createdAt).toLocaleString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                        {order.paymentReference && (
                          <p className="text-[10px] text-slate-500 font-mono truncate max-w-[130px]">
                            Ref: {order.paymentReference}
                          </p>
                        )}
                      </td>

                      {/* Network & Package */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-extrabold border ${
                              order.network === 'MTN'
                                ? 'bg-amber-400/20 text-amber-300 border-amber-400/40'
                                : order.network === 'TELECEL'
                                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                            }`}
                          >
                            {order.network}
                          </span>
                          <span className="font-bold text-white text-xs">
                            {order.dataAmount}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300 mt-0.5 truncate max-w-[180px]">
                          {order.packageName}
                        </p>
                      </td>

                      {/* Recipient Phone */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="flex items-center gap-1.5 font-mono text-xs font-semibold text-amber-400">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{order.customerPhone}</span>
                        </div>
                        <span className="text-[10px] text-slate-500 capitalize">
                          {order.productType.toLowerCase()} recharge
                        </span>
                      </td>

                      {/* Amount & 10% Comm */}
                      <td className="py-3.5 px-4 align-top">
                        <p className="font-extrabold text-white text-xs font-['Outfit']">
                          GHS {(order.amount || 0).toFixed(2)}
                        </p>
                        {order.commissionAmount > 0 ? (
                          <p className="text-[11px] font-mono text-emerald-400 font-semibold">
                            +GHS {order.commissionAmount.toFixed(2)} (10%)
                          </p>
                        ) : (
                          <p className="text-[10px] text-slate-500">Direct (0% Comm)</p>
                        )}
                      </td>

                      {/* Sub-Merchant */}
                      <td className="py-3.5 px-4 align-top">
                        <p className="font-semibold text-slate-200 truncate max-w-[140px]">
                          {order.agentName || 'Master Platform Direct'}
                        </p>
                        {order.agentPhone && (
                          <p className="text-[10px] text-slate-500 font-mono">{order.agentPhone}</p>
                        )}
                      </td>

                      {/* Delivery Status */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="flex items-center gap-1.5">
                          {order.deliveryStatus === 'DELIVERED' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                              <CheckCircle2 className="w-3 h-3" />
                              Delivered
                            </span>
                          ) : order.deliveryStatus === 'PROCESSING' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[10px] font-bold">
                              <Clock className="w-3 h-3 animate-spin" />
                              Processing
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 text-[10px] font-bold">
                              <AlertCircle className="w-3 h-3" />
                              Failed
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          via {order.routingGateway || 'HUBTEL'} Telco Node
                        </p>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 align-top text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {onViewReceipt && (
                            <button
                              id={`view-receipt-btn-${order.id}`}
                              onClick={() => onViewReceipt(order)}
                              title="View & Print Official Receipt"
                              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all flex items-center gap-1"
                            >
                              <FileText className="w-3.5 h-3.5 text-amber-400" />
                              <span className="hidden sm:inline">Receipt</span>
                            </button>
                          )}

                          <button
                            id={`share-whatsapp-${order.id}`}
                            onClick={() => handleWhatsAppShare(order)}
                            title="Share on WhatsApp"
                            className="p-1.5 rounded-lg bg-emerald-950/60 hover:bg-emerald-900 text-emerald-400 border border-emerald-500/30 transition-all"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            id={`view-details-${order.id}`}
                            onClick={() => setSelectedOrderDetails(order)}
                            title="View Transaction Details"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700 transition-all"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Slide-in or Modal Details Inspector */}
      {selectedOrderDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl space-y-6 relative overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-400/20 text-amber-400 flex items-center justify-center">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white font-['Outfit']">Transaction Breakdown</h3>
                  <p className="text-xs text-slate-400">Order Ref: {selectedOrderDetails.id}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedOrderDetails(null)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded bg-slate-800"
              >
                Close
              </button>
            </div>

            {/* Detailed Key-Value Grid */}
            <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800 space-y-3 text-xs">
              <div className="flex justify-between border-b border-slate-900 pb-2">
                <span className="text-slate-400">Network & Plan:</span>
                <span className="font-bold text-white">
                  {selectedOrderDetails.network} • {selectedOrderDetails.packageName} ({selectedOrderDetails.dataAmount})
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-900 pb-2">
                <span className="text-slate-400">Recipient Phone:</span>
                <span className="font-mono font-bold text-amber-400">{selectedOrderDetails.customerPhone}</span>
              </div>
              <div className="flex justify-between border-b border-slate-900 pb-2">
                <span className="text-slate-400">Gross Paid Amount:</span>
                <span className="font-mono font-extrabold text-white">GHS {(selectedOrderDetails.amount || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-b border-slate-900 pb-2">
                <span className="text-slate-400">10% Sub-Merchant Commission:</span>
                <span className="font-mono font-bold text-emerald-400">
                  GHS {(selectedOrderDetails.commissionAmount || 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-900 pb-2">
                <span className="text-slate-400">Credited Sub-Merchant:</span>
                <span className="text-slate-200 font-semibold">{selectedOrderDetails.agentName || 'Direct'}</span>
              </div>
              <div className="flex justify-between border-b border-slate-900 pb-2">
                <span className="text-slate-400">Payment Gateway Reference:</span>
                <span className="font-mono text-slate-300 text-[11px] truncate max-w-[200px]">
                  {selectedOrderDetails.paymentReference || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-900 pb-2">
                <span className="text-slate-400">Hubtel Transaction Node:</span>
                <span className="font-mono text-slate-300 text-[11px] truncate max-w-[200px]">
                  {selectedOrderDetails.hubtelTransactionId || 'HUBTEL-DIR-SYNC'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Created At:</span>
                <span className="text-slate-300">{new Date(selectedOrderDetails.createdAt).toLocaleString()}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              {onViewReceipt && (
                <button
                  onClick={() => {
                    const ord = selectedOrderDetails;
                    setSelectedOrderDetails(null);
                    onViewReceipt(ord);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 flex items-center justify-center gap-2 transition-all"
                >
                  <FileText className="w-4 h-4 text-amber-400" />
                  <span>View Printable Receipt</span>
                </button>
              )}

              <button
                onClick={() => handleWhatsAppShare(selectedOrderDetails)}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all"
              >
                <Share2 className="w-4 h-4" />
                <span>Share Receipt</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
