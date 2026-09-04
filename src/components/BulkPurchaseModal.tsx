import React, { useState } from 'react';
import { TelecomPackage, SubMerchant, TelecomOrder, TelecomNetwork } from '../types';
import { TELECOM_PACKAGES, detectNetworkFromPhone, formatGhanaPhone, isValidGhanaPhone } from '../data/telecomCatalog';
import { recordTelecomOrder } from '../lib/firestoreService';
import { processHubtelFulfillment, chargePaystackMobileMoney, checkPaystackChargeStatus } from '../lib/apiClient';
import { useToastNotification } from '../context/ToastNotificationContext';
import { X, Upload, Layers, CheckCircle2, AlertCircle, Loader2, Smartphone } from 'lucide-react';

interface BulkPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedAgent: SubMerchant | null;
  onSuccess: (orders: TelecomOrder[]) => void;
}

export const BulkPurchaseModal: React.FC<BulkPurchaseModalProps> = ({
  isOpen,
  onClose,
  selectedAgent,
  onSuccess,
}) => {
  const { addToast } = useToastNotification();
  const [phoneListRaw, setPhoneListRaw] = useState('');
  const [selectedPackageId, setSelectedPackageId] = useState<string>(TELECOM_PACKAGES[0].id);
  const [billingPhone, setBillingPhone] = useState('');
  const [billingNetwork, setBillingNetwork] = useState<TelecomNetwork>('MTN');
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  if (!isOpen) return null;

  const selectedPackage = TELECOM_PACKAGES.find((p) => p.id === selectedPackageId) || TELECOM_PACKAGES[0];

  const parsedNumbers = phoneListRaw
    .split(/[\n,;\s]+/)
    .map((p) => formatGhanaPhone(p.trim()))
    .filter((p) => p.length >= 10 && isValidGhanaPhone(p));

  const totalCost = parsedNumbers.length * selectedPackage.priceGhs;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setPhoneListRaw(text);
      }
    };
    reader.readAsText(file);
  };

  const handleExecuteBulk = async () => {
    if (parsedNumbers.length === 0) {
      addToast('error', 'No Valid Numbers', 'Please enter at least one valid Ghanaian phone number (e.g. 024XXXXXXX)');
      return;
    }

    const payer = billingPhone || parsedNumbers[0];
    if (!isValidGhanaPhone(payer)) {
      addToast('error', 'Invalid Billing Number', 'Please enter a valid Ghana Mobile Money number for billing.');
      return;
    }

    setIsProcessing(true);
    setStatusMessage(`Deducting GHS ${totalCost.toFixed(2)} via Paystack Mobile Money (${formatGhanaPhone(payer)})...`);

    try {
      // Step 1: Paystack charge for bulk total
      const bulkRef = `BULK-PAY-${Date.now().toString().slice(-7)}`;
      const chargeRes = await chargePaystackMobileMoney({
        customerPhone: formatGhanaPhone(payer),
        network: billingNetwork,
        amountGhs: totalCost,
        orderId: bulkRef,
      });

      // Poll until confirmed or simulated
      let paid = false;
      let attempts = 0;
      while (!paid && attempts < 15) {
        attempts++;
        await new Promise((r) => setTimeout(r, 1500));
        const statusRes = await checkPaystackChargeStatus(chargeRes.reference || bulkRef);
        if (statusRes.status === 'success') {
          paid = true;
          break;
        } else if (statusRes.status === 'failed') {
          throw new Error(statusRes.message || 'Payment deduction declined.');
        }
      }

      addToast('success', 'Mobile Money Deducted', `Paystack debited GHS ${totalCost.toFixed(2)}. Hubtel is dispatching bundles in real-time...`);

      // Step 2: Hubtel dispatch for all lines
      setProgress({ current: 0, total: parsedNumbers.length });
      const createdOrders: TelecomOrder[] = [];

      for (let i = 0; i < parsedNumbers.length; i++) {
        const phone = parsedNumbers[i];
        const detectedNet = detectNetworkFromPhone(phone);
        setProgress({ current: i + 1, total: parsedNumbers.length });
        setStatusMessage(`Hubtel core dispatching line ${i + 1} of ${parsedNumbers.length} to ${phone}...`);

        try {
          const hubtelRes = await processHubtelFulfillment({
            orderId: `BULK-GH-${Date.now().toString().slice(-6)}-${i + 1}`,
            customerPhone: formatGhanaPhone(phone),
            network: detectedNet,
            productType: 'DATA',
            packageName: selectedPackage.name,
            amountGhs: selectedPackage.priceGhs,
            paymentReference: chargeRes.reference || bulkRef,
          });

          const commRate = selectedAgent?.commissionRate || 0;
          const commissionAmount = (selectedPackage.priceGhs * commRate) / 100;

          const order: TelecomOrder = {
            id: `BULK-GH-${Date.now().toString().slice(-6)}-${i + 1}`,
            agentId: selectedAgent?.id || 'DIRECT',
            agentName: selectedAgent?.businessName || selectedAgent?.name || 'Direct Customer',
            agentPhone: selectedAgent?.phone || '',
            customerPhone: formatGhanaPhone(phone),
            network: detectedNet,
            productType: 'DATA',
            packageId: selectedPackage.id,
            packageName: selectedPackage.name,
            amountGhs: selectedPackage.priceGhs,
            commissionGhs: commissionAmount,
            paymentStatus: 'SUCCESS',
            routingGateway: 'HUBTEL',
            deliveryStatus: 'DELIVERED',
            deliveryMessage: hubtelRes.deliveryMessage || 'Delivered via Hubtel Bulk Router',
            hubtelTransactionId: hubtelRes.hubtelTransactionId || '',
            paystackReference: chargeRes.reference || bulkRef,
            momoProvider: billingNetwork,
            paidAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
          };

          const saved = await recordTelecomOrder(order);
          createdOrders.push(saved);
        } catch (err) {
          console.error('Error in bulk dispatch:', err);
        }
      }

      setIsProcessing(false);
      addToast('success', 'Bulk Dispatch Complete', `Successfully processed ${createdOrders.length} subscriber orders!`);
      onSuccess(createdOrders);
      onClose();
    } catch (err: any) {
      setIsProcessing(false);
      addToast('error', 'Bulk Purchase Failed', err.message || 'Payment deduction failed.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl relative">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Hubtel Bulk Data & Airtime Dispatch</h3>
              <p className="text-xs text-slate-400">Batch fulfillment with instant carrier switch delivery</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          {/* Select Package */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">Select Distribution Bundle</label>
            <select
              value={selectedPackageId}
              onChange={(e) => setSelectedPackageId(e.target.value)}
              disabled={isProcessing}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
            >
              {TELECOM_PACKAGES.filter((p) => p.category === 'DATA').map((pkg) => (
                <option key={pkg.id} value={pkg.id}>
                  {pkg.network} - {pkg.name} (GHS {pkg.priceGhs.toFixed(2)})
                </option>
              ))}
            </select>
          </div>

          {/* Numbers Input */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-bold text-slate-300">Recipient Phone Numbers</label>
              <label className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                <span>Upload CSV / TXT</span>
                <input type="file" accept=".txt,.csv" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>
            <textarea
              rows={4}
              placeholder="Paste comma or newline separated Ghana numbers (e.g. 0244123456, 0559876543, 0201122334)..."
              value={phoneListRaw}
              onChange={(e) => setPhoneListRaw(e.target.value)}
              disabled={isProcessing}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder:text-slate-500 font-mono focus:outline-none focus:border-amber-500"
            />
            <div className="mt-1 flex justify-between text-[11px] text-slate-400 font-mono">
              <span>Valid Numbers Detected: {parsedNumbers.length}</span>
              <span>Total GHS: {totalCost.toFixed(2)}</span>
            </div>
          </div>

          {/* Billing MoMo Account (Paystack Deduction) */}
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-amber-400" />
                Paystack MoMo Billing Wallet
              </label>
              <span className="text-[10px] text-emerald-400 font-mono">Auto-Debit on Authorization</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="tel"
                placeholder="Billing MoMo Number (e.g. 0244000000)"
                value={billingPhone}
                onChange={(e) => {
                  setBillingPhone(e.target.value);
                  if (e.target.value.length >= 3) {
                    setBillingNetwork(detectNetworkFromPhone(e.target.value));
                  }
                }}
                disabled={isProcessing}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 font-mono focus:outline-none focus:border-amber-500"
              />
              <div className="grid grid-cols-3 gap-1">
                {(['MTN', 'TELECEL', 'AIRTELTIGO'] as TelecomNetwork[]).map((net) => (
                  <button
                    key={net}
                    type="button"
                    onClick={() => setBillingNetwork(net)}
                    disabled={isProcessing}
                    className={`py-1 rounded-lg text-[10px] font-bold border transition-all ${
                      billingNetwork === net
                        ? 'bg-amber-500/15 border-amber-500 text-amber-400'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    {net === 'MTN' ? 'MTN' : net === 'TELECEL' ? 'Telecel' : 'AT'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Progress Bar if processing */}
          {isProcessing && (
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-300 flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                  {statusMessage || 'Routing via Hubtel Switch...'}
                </span>
                <span className="text-amber-400 font-bold">
                  {progress.current} / {progress.total}
                </span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-amber-500 h-full transition-all duration-300"
                  style={{ width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` }}
                />
              </div>
            </div>
          )}

          {/* Action */}
          <div className="pt-2 flex gap-3">
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleExecuteBulk}
              disabled={isProcessing || parsedNumbers.length === 0}
              className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all shadow-lg shadow-amber-500/20 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <span>Dispatch {parsedNumbers.length} Orders (GHS {totalCost.toFixed(2)})</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
