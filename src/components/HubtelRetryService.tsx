import React, { useState } from 'react';
import { TelecomOrder } from '../types';
import { retryTelecomOrderDelivery } from '../lib/retryBackgroundService';
import { testHubtelCredentials } from '../lib/apiClient';
import { useToastNotification } from '../context/ToastNotificationContext';
import {
  RefreshCw,
  Server,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Send,
  Loader2,
  ShieldCheck,
  Zap,
} from 'lucide-react';

interface HubtelRetryServiceProps {
  orders: TelecomOrder[];
}

export const HubtelRetryService: React.FC<HubtelRetryServiceProps> = ({ orders }) => {
  const { addToast } = useToastNotification();
  const [retryingOrderId, setRetryingOrderId] = useState<string | null>(null);
  const [isRetryingAll, setIsRetryingAll] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  // Orders that are either failed or pending
  const failedOrRetrying = orders.filter(
    (o) => o.deliveryStatus === 'FAILED' || o.deliveryStatus === 'RETRYING'
  );

  const handleRetrySingle = async (order: TelecomOrder) => {
    setRetryingOrderId(order.id);
    addToast('info', 'Retrying Hubtel Switch', `Initiating retry for ${order.id}...`);

    const success = await retryTelecomOrderDelivery(order);
    if (success) {
      addToast('success', 'Retry Successful', `Order ${order.id} delivered to ${order.customerPhone}`);
    } else {
      addToast('error', 'Retry Failed', `Order ${order.id} could not be delivered.`);
    }
    setRetryingOrderId(null);
  };

  const handleRetryAll = async () => {
    if (failedOrRetrying.length === 0) return;
    setIsRetryingAll(true);
    addToast('info', 'Batch Auto-Retry', `Retrying ${failedOrRetrying.length} stalled orders via Hubtel node...`);

    for (const ord of failedOrRetrying) {
      await retryTelecomOrderDelivery(ord);
      await new Promise((r) => setTimeout(r, 600));
    }

    setIsRetryingAll(false);
    addToast('success', 'Batch Complete', 'All eligible orders were retried.');
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    try {
      const res = await testHubtelCredentials();
      setTestResult(res.message);
      addToast('success', 'Gateway Healthy', res.message);
    } catch (e) {
      setTestResult('Gateway connection timeout.');
      addToast('error', 'Connection Error', 'Failed to reach Hubtel node.');
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Top Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400 mb-1">
            <Server className="w-4 h-4" />
            Telecom Switch Failover & Resiliency
          </div>
          <h2 className="text-xl font-bold text-white">Hubtel Router & Auto-Retry Engine</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Automatic backoff retry mechanism for subscriber lines facing temporary network congestion
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleTestConnection}
            disabled={isTesting}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
          >
            {isTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5 text-amber-400" />}
            <span>Ping Hubtel Node</span>
          </button>

          <button
            onClick={handleRetryAll}
            disabled={isRetryingAll || failedOrRetrying.length === 0}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/20 cursor-pointer disabled:opacity-50"
          >
            {isRetryingAll ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            <span>Auto-Retry All ({failedOrRetrying.length})</span>
          </button>
        </div>
      </div>

      {testResult && (
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 font-mono flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{testResult}</span>
        </div>
      )}

      {/* Failed / Pending Orders Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-400" />
          Queue & Delivery Status Monitor
        </h3>

        {failedOrRetrying.length === 0 ? (
          <div className="p-8 text-center bg-slate-950/60 rounded-xl border border-slate-800">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
            <div className="text-sm font-bold text-slate-200">All Carrier Dispatches Healthy</div>
            <p className="text-xs text-slate-400 mt-1">
              Zero failed or stalled orders in the Hubtel queue. Every subscriber transaction was fulfilled.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="border-b border-slate-800 text-slate-400">
                <tr>
                  <th className="py-2.5 px-3">Order ID</th>
                  <th className="py-2.5 px-3">Subscriber</th>
                  <th className="py-2.5 px-3">Network</th>
                  <th className="py-2.5 px-3">Package</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Message</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {failedOrRetrying.map((ord) => (
                  <tr key={ord.id} className="hover:bg-slate-950/40">
                    <td className="py-2.5 px-3 font-bold text-slate-200">{ord.id}</td>
                    <td className="py-2.5 px-3 text-slate-300">{ord.customerPhone}</td>
                    <td className="py-2.5 px-3 text-amber-400">{ord.network}</td>
                    <td className="py-2.5 px-3 text-slate-300">{ord.packageName}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-[10px] font-bold">
                        {ord.deliveryStatus}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-400 text-[11px] truncate max-w-xs">
                      {ord.deliveryMessage || 'No error log'}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => handleRetrySingle(ord)}
                        disabled={retryingOrderId === ord.id || isRetryingAll}
                        className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] font-bold flex items-center gap-1 ml-auto cursor-pointer disabled:opacity-50"
                      >
                        {retryingOrderId === ord.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <RefreshCw className="w-3 h-3" />
                        )}
                        <span>Retry</span>
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
