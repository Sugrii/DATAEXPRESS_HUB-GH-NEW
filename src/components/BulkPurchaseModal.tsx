import React, { useState } from 'react';
import {
  Layers,
  X,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Phone,
  Zap,
  Loader2,
  Send,
  Sparkles,
} from 'lucide-react';
import { BundlePackage, SubMerchant, TelecomNetwork, TelecomOrder } from '../types';
import { TELECOM_CATALOG, detectGhanaNetwork, formatGhanaPhone } from '../data/telecomCatalog';
import { initializePaystackPayment, routeHubtelDelivery } from '../lib/apiClient';
import { recordOrderAndCommission } from '../lib/firestoreService';

interface BulkPurchaseModalProps {
  selectedAgent: SubMerchant | null;
  onClose: () => void;
  onOrdersCompleted: () => void;
}

interface BulkRecipient {
  id: string;
  phone: string;
  network: TelecomNetwork;
  packageId: string;
  status: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED';
  error?: string;
}

export const BulkPurchaseModal: React.FC<BulkPurchaseModalProps> = ({
  selectedAgent,
  onClose,
  onOrdersCompleted,
}) => {
  const [phoneListText, setPhoneListText] = useState<string>('0244123456\n0207654321\n0271122334');
  const [selectedPackageId, setSelectedPackageId] = useState<string>('mtn-noexp-2-5gb');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progressStatus, setProgressStatus] = useState<string>('');
  const [completedCount, setCompletedCount] = useState<number>(0);

  const selectedPkg = TELECOM_CATALOG.find((p) => p.id === selectedPackageId) || TELECOM_CATALOG[0];

  // Parse phone numbers from text area
  const parsedPhones = phoneListText
    .split('\n')
    .map((p) => p.trim())
    .filter((p) => p.length >= 9);

  const totalCost = parsedPhones.length * selectedPkg.price;
  const totalCommission = (totalCost * (selectedAgent?.commissionRate || 10)) / 100;

  const handleExecuteBulkDispatch = async () => {
    if (parsedPhones.length === 0) return;

    setIsProcessing(true);
    setCompletedCount(0);
    setProgressStatus(`Initiating Paystack bulk authorization for GHS ${totalCost.toFixed(2)}...`);

    try {
      // Step 1: Paystack master transaction initialization
      await initializePaystackPayment({
        amount: totalCost,
        customerPhone: parsedPhones[0],
        network: selectedPkg.network,
        packageId: selectedPkg.id,
        packageName: `Bulk Order (${parsedPhones.length} Lines)`,
        agentId: selectedAgent?.id,
        agentName: selectedAgent?.businessName,
      });

      // Step 2: Route each recipient through Hubtel
      for (let i = 0; i < parsedPhones.length; i++) {
        const phone = parsedPhones[i];
        const detectedNet = detectGhanaNetwork(phone) || selectedPkg.network;

        setProgressStatus(`Dispatching ${i + 1}/${parsedPhones.length}: ${phone} (${detectedNet}) via Hubtel...`);

        const hubtelRes = await routeHubtelDelivery({
          recipientPhone: phone,
          network: detectedNet,
          amount: selectedPkg.price,
          packageId: selectedPkg.id,
          packageName: selectedPkg.name,
          dataAmount: selectedPkg.dataAmount,
          productType: 'DATA',
          agentId: selectedAgent?.id,
        });

        const singleComm = (selectedPkg.price * (selectedAgent?.commissionRate || 10)) / 100;

        const order: TelecomOrder = {
          id: `BULK-GH-${Date.now().toString().slice(-6)}-${i + 1}`,
          agentId: selectedAgent?.id || 'DIRECT',
          agentName: selectedAgent?.businessName || selectedAgent?.name || 'Direct Customer',
          agentPhone: selectedAgent?.phone || '',
          customerPhone: formatGhanaPhone(phone),
          network: detectedNet,
          productType: 'DATA',
          packageId: selectedPkg.id,
          packageName: selectedPkg.name,
          dataAmount: selectedPkg.dataAmount,
          amount: selectedPkg.price,
          commissionAmount: selectedAgent ? singleComm : 0,
          paymentMethod: 'PAYSTACK_MOMO',
          paymentReference: `BULK-PAY-${Date.now()}`,
          paymentStatus: 'SUCCESS',
          routingGateway: 'HUBTEL',
          deliveryStatus: 'DELIVERED',
          deliveryMessage: hubtelRes.deliveryMessage || 'Delivered via Hubtel Bulk Router',
          hubtelTransactionId: hubtelRes.hubtelTransactionId || '',
          createdAt: new Date().toISOString(),
        };

        await recordOrderAndCommission(order);
        setCompletedCount((prev) => prev + 1);
        await new Promise((r) => setTimeout(r, 400));
      }

      setProgressStatus(`All ${parsedPhones.length} numbers recharged successfully!`);
      setTimeout(() => {
        onOrdersCompleted();
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error('Bulk processing error:', err);
      setProgressStatus(`Error: ${err.message || 'Failed during bulk dispatch'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400/20 text-amber-400 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white font-['Outfit']">Bulk Airtime & Data Distribution</h3>
              <p className="text-xs text-slate-400">Recharge multiple lines in one batch via Hubtel</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded bg-slate-800"
          >
            Cancel
          </button>
        </div>

        <div className="space-y-4 text-xs">
          {/* Package Selector */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Select Data Bundle or Airtime Package
            </label>
            <select
              value={selectedPackageId}
              onChange={(e) => setSelectedPackageId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-medium focus:ring-2 focus:ring-amber-400 focus:outline-none"
            >
              {TELECOM_CATALOG.filter((p) => p.category !== 'AIRTIME').map((pkg) => (
                <option key={pkg.id} value={pkg.id}>
                  [{pkg.network}] {pkg.name} ({pkg.dataAmount}) - GHS {pkg.price.toFixed(2)}
                </option>
              ))}
            </select>
          </div>

          {/* Paste Numbers TextArea */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-slate-300 font-semibold">
                Recipient Ghana Phone Numbers (one per line)
              </label>
              <span className="text-amber-400 font-mono font-bold">
                {parsedPhones.length} Lines Detected
              </span>
            </div>
            <textarea
              rows={4}
              value={phoneListText}
              onChange={(e) => setPhoneListText(e.target.value)}
              placeholder="0244123456&#10;0207654321&#10;0271122334"
              className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-xs focus:ring-2 focus:ring-amber-400 focus:outline-none"
            />
          </div>

          {/* Order Summary */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1.5">
            <div className="flex justify-between text-slate-300">
              <span>Lines to Recharge:</span>
              <span className="font-bold text-white">{parsedPhones.length} Numbers</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Selected Bundle:</span>
              <span className="font-semibold text-white">{selectedPkg.name} ({selectedPkg.dataAmount})</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Sub-Merchant 10% Commission:</span>
              <span className="font-mono text-emerald-400 font-bold">
                GHS {totalCommission.toFixed(2)}
              </span>
            </div>
            <div className="border-t border-slate-800 pt-1.5 flex justify-between items-baseline">
              <span className="font-bold text-slate-200">Total Bulk Cost:</span>
              <span className="text-xl font-extrabold text-white font-['Outfit']">
                GHS {totalCost.toFixed(2)}
              </span>
            </div>
          </div>

          {progressStatus && (
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-amber-400 text-xs flex items-center gap-2 font-mono">
              {isProcessing && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
              <span>{progressStatus}</span>
            </div>
          )}

          <button
            id="confirm-bulk-recharge-btn"
            onClick={handleExecuteBulkDispatch}
            disabled={isProcessing || parsedPhones.length === 0}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-extrabold text-sm shadow-xl shadow-amber-400/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing Batch ({completedCount}/{parsedPhones.length})...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Pay & Dispatch Batch to {parsedPhones.length} Lines</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
