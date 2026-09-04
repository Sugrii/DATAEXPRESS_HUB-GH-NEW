import React, { useState } from 'react';
import { TelecomOrder, TelecomNetwork } from '../types';
import { Search, Download, ExternalLink, Filter, CheckCircle2, Clock, XCircle } from 'lucide-react';

interface TransactionHistoryProps {
  orders: TelecomOrder[];
  onViewReceipt: (order: TelecomOrder) => void;
}

export const TransactionHistory: React.FC<TransactionHistoryProps> = ({
  orders,
  onViewReceipt,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [networkFilter, setNetworkFilter] = useState<TelecomNetwork | 'ALL'>('ALL');

  const filtered = orders.filter((o) => {
    const matchesNet = networkFilter === 'ALL' || o.network === networkFilter;
    const matchesSearch =
      o.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.customerPhone.includes(searchTerm) ||
      o.packageName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.agentName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesNet && matchesSearch;
  });

  const exportCSV = () => {
    const headers = ['Order ID', 'Date', 'Customer Phone', 'Network', 'Product', 'Amount GHS', 'Agent', 'Status'];
    const rows = filtered.map((o) => [
      o.id,
      new Date(o.createdAt).toLocaleString(),
      o.customerPhone,
      o.network,
      `"${o.packageName}"`,
      o.amountGhs.toFixed(2),
      `"${o.agentName}"`,
      o.deliveryStatus,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ghana_telecom_orders_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-xl font-bold text-white">Carrier Orders & Receipts</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Live audit ledger of subscriber recharges and Hubtel gateway receipts
            </p>
          </div>

          <button
            onClick={exportCSV}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-amber-400" />
            <span>Export CSV</span>
          </button>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search by order ID, phone number, agent, or package..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs">
            {(['ALL', 'MTN', 'TELECEL', 'AIRTELTIGO'] as const).map((net) => (
              <button
                key={net}
                onClick={() => setNetworkFilter(net)}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  networkFilter === net
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {net}
              </button>
            ))}
          </div>
        </div>

        {/* Orders Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="border-b border-slate-800 text-slate-400">
              <tr>
                <th className="py-3 px-3">Order Ref</th>
                <th className="py-3 px-3">Date & Time</th>
                <th className="py-3 px-3">Subscriber</th>
                <th className="py-3 px-3">Network & Bundle</th>
                <th className="py-3 px-3">Amount</th>
                <th className="py-3 px-3">Channel / Agent</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.map((ord) => (
                <tr key={ord.id} className="hover:bg-slate-950/40">
                  <td className="py-3 px-3 font-bold text-white">{ord.id}</td>
                  <td className="py-3 px-3 text-slate-400 text-[11px]">
                    {new Date(ord.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="py-3 px-3 text-slate-200">{ord.customerPhone}</td>
                  <td className="py-3 px-3">
                    <span className="font-bold text-amber-400 mr-1.5">{ord.network}</span>
                    <span className="text-slate-300">{ord.packageName}</span>
                  </td>
                  <td className="py-3 px-3 font-bold text-white">GHS {ord.amountGhs.toFixed(2)}</td>
                  <td className="py-3 px-3 text-slate-400 text-[11px] truncate max-w-[130px]">
                    {ord.agentName}
                  </td>
                  <td className="py-3 px-3">
                    {ord.paymentStatus === 'REFUNDED' ? (
                      <span className="px-2 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/40 text-purple-300 text-[10px] font-bold">
                        REFUNDED
                      </span>
                    ) : ord.deliveryStatus === 'FAILED' ? (
                      <span className="px-2 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/40 text-rose-300 text-[10px] font-bold">
                        FAILED
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                        {ord.deliveryStatus}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => onViewReceipt(ord)}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold inline-flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <ExternalLink className="w-3 h-3 text-amber-400" />
                      <span>View</span>
                    </button>
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-500">
                    No transactions found matching criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
