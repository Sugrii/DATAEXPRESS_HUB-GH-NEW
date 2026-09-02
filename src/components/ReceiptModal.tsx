import React from 'react';
import {
  Printer,
  Share2,
  X,
  CheckCircle2,
  Download,
  ShieldCheck,
  Zap,
  Sparkles,
  QrCode,
} from 'lucide-react';
import { TelecomOrder } from '../types';

interface ReceiptModalProps {
  order: TelecomOrder | null;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ order, onClose }) => {
  if (!order) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsAppShare = () => {
    const text = `🧾 Ghana Telecom Hub Receipt\n\nOrder Ref: ${order.id}\nPackage: ${order.packageName} (${order.dataAmount})\nRecipient: ${order.customerPhone}\nNetwork: ${order.network} Ghana\nAmount Paid: GHS ${order.amount.toFixed(2)}\nStatus: DELIVERED (Hubtel Node: ${order.hubtelTransactionId || 'HUB-CONFIRMED'})\n\nThank you for choosing ${order.agentName || 'Ghana Telecom Hub'}!`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  // Ghana standard tax calculations (Informational receipt breakdown)
  const baseAmount = Number((order.amount / 1.21).toFixed(2));
  const vatAmount = Number((baseAmount * 0.15).toFixed(2));
  const nhilAmount = Number((baseAmount * 0.025).toFixed(2));
  const getfundAmount = Number((baseAmount * 0.025).toFixed(2));
  const covidLevy = Number((baseAmount * 0.01).toFixed(2));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Receipt Visual Container */}
        <div id="printable-receipt" className="bg-white text-slate-900 rounded-2xl p-6 space-y-5 shadow-lg border border-slate-200">
          {/* Top Receipt Header */}
          <div className="text-center border-b border-slate-200 pb-4 space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold">
              <Zap className="w-3 h-3 text-amber-600" />
              <span>GHANA TELECOM HUB & AGENT NETWORK</span>
            </div>
            <h3 className="text-xl font-extrabold font-['Outfit'] text-slate-900 mt-1">
              Official Electronic Receipt
            </h3>
            <p className="text-[11px] text-slate-500 font-mono">
              Order Ref: <strong>{order.id}</strong>
            </p>
            <p className="text-[10px] text-slate-400">
              Date: {new Date(order.createdAt).toLocaleString()}
            </p>
          </div>

          {/* Customer & Telecom Details */}
          <div className="space-y-2 text-xs border-b border-slate-200 pb-4">
            <div className="flex justify-between">
              <span className="text-slate-500">Recipient Phone:</span>
              <span className="font-mono font-bold text-slate-900">{order.customerPhone}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Telecom Network:</span>
              <span className="font-bold text-slate-900">{order.network} Ghana</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Item Purchased:</span>
              <span className="font-semibold text-slate-900">{order.packageName} ({order.dataAmount})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Sub-Merchant Store:</span>
              <span className="font-semibold text-emerald-700">{order.agentName || 'Direct'}</span>
            </div>
            {order.commissionAmount > 0 && (
              <div className="flex justify-between bg-emerald-50 p-1.5 rounded text-emerald-800 text-[11px]">
                <span>10% Agent Commission:</span>
                <span className="font-bold font-mono">GHS {order.commissionAmount.toFixed(2)} (Credited)</span>
              </div>
            )}
          </div>

          {/* Payment & Routing Specs */}
          <div className="space-y-1.5 text-[11px] border-b border-slate-200 pb-3 text-slate-600 font-mono">
            <div className="flex justify-between">
              <span>Payment Gateway:</span>
              <span className="text-slate-900 font-semibold">{order.paymentMethod} (Paystack)</span>
            </div>
            <div className="flex justify-between">
              <span>Paystack Ref:</span>
              <span className="text-slate-900 truncate max-w-[180px]">{order.paymentReference}</span>
            </div>
            <div className="flex justify-between">
              <span>Hubtel Routing ID:</span>
              <span className="text-slate-900">{order.hubtelTransactionId || 'HUB-TELCO-NODE-01'}</span>
            </div>
            <div className="flex justify-between">
              <span>Fulfillment Status:</span>
              <span className="text-emerald-600 font-bold">100% {order.deliveryStatus}</span>
            </div>
          </div>

          {/* Grand Total */}
          <div className="pt-1 flex items-baseline justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-700">Total Amount Paid:</p>
              <p className="text-[10px] text-slate-400">Inclusive of GRA Telecom Levies</p>
            </div>
            <span className="text-2xl font-black font-['Outfit'] text-slate-950">
              GHS {order.amount.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center justify-center gap-2 border border-slate-700 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4 text-amber-400" />
            <span>Print Receipt</span>
          </button>

          <button
            onClick={handleWhatsAppShare}
            className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
            <span>Share via WhatsApp</span>
          </button>
        </div>
      </div>
    </div>
  );
};
