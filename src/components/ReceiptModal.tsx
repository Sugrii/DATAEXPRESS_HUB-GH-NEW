import React from 'react';
import { TelecomOrder } from '../types';
import { TELECOM_NETWORKS } from '../data/telecomCatalog';
import { CheckCircle2, Copy, Download, Share2, X, ExternalLink, Printer } from 'lucide-react';

interface ReceiptModalProps {
  order: TelecomOrder | null;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ order, onClose }) => {
  if (!order) return null;

  const networkInfo = TELECOM_NETWORKS[order.network];

  const handleCopyRef = () => {
    navigator.clipboard.writeText(order.id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative overflow-hidden">
        {/* Top Network Stripe */}
        <div
          className="absolute top-0 left-0 right-0 h-2"
          style={{ backgroundColor: networkInfo?.primaryColor || '#eab308' }}
        />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Success Icon & Header */}
        <div className="text-center mt-2 mb-6">
          <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
          </div>
          <h3 className="text-lg font-bold text-white">Transaction Confirmed</h3>
          <p className="text-xs text-slate-400 mt-1">Dispatched via Hubtel Telecom Core Node</p>
        </div>

        {/* Receipt Card */}
        <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800 space-y-3 text-xs font-mono">
          <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
            <span className="text-slate-400">Transaction ID</span>
            <div className="flex items-center gap-1.5 font-bold text-slate-200">
              <span>{order.id}</span>
              <button onClick={handleCopyRef} title="Copy ID" className="hover:text-amber-400">
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
            <span className="text-slate-400">Network & Product</span>
            <span className="font-bold text-amber-400">{order.network} • {order.productType}</span>
          </div>

          <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
            <span className="text-slate-400">Bundle Name</span>
            <span className="font-bold text-slate-200 text-right">{order.packageName}</span>
          </div>

          <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
            <span className="text-slate-400">Recipient Mobile</span>
            <span className="font-bold text-slate-200">{order.customerPhone}</span>
          </div>

          <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
            <span className="text-slate-400">Agent Channel</span>
            <span className="font-bold text-slate-300">{order.agentName}</span>
          </div>

          {order.paystackReference && (
            <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
              <span className="text-slate-400">Paystack MoMo Ref</span>
              <span className="text-slate-300 truncate max-w-[170px]">{order.paystackReference}</span>
            </div>
          )}

          <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
            <span className="text-slate-400">Hubtel Carrier Ref</span>
            <span className="text-slate-400 truncate max-w-[170px]">{order.hubtelTransactionId || 'DIRECT-ROUTER'}</span>
          </div>

          <div className="flex justify-between items-center pt-2 text-sm">
            <span className="text-slate-300 font-sans font-bold">Total Paid</span>
            <span className="text-base font-extrabold text-emerald-400 font-sans">
              GHS {order.amountGhs.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Delivery Note */}
        <div className="mt-4 p-3 rounded-lg bg-emerald-950/30 border border-emerald-500/20 text-emerald-300 text-xs leading-relaxed">
          <span className="font-bold">Status: </span>
          {order.deliveryMessage || 'Delivered immediately to subscriber MSISDN via carrier switch.'}
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex gap-3">
          <button
            onClick={() => window.print()}
            className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            Print Receipt
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-lg shadow-amber-500/20"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
