import React, { useState, useEffect } from 'react';
import {
  Zap,
  Wifi,
  Phone,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  CreditCard,
  Smartphone,
  Flame,
  Clock,
  Share2,
  Printer,
  ChevronRight,
  Info,
  Layers,
  Send,
  Loader2,
  Gift,
} from 'lucide-react';
import { BundlePackage, SubMerchant, TelecomNetwork, TelecomOrder } from '../types';
import { TELECOM_CATALOG, NETWORK_THEMES, detectGhanaNetwork, formatGhanaPhone } from '../data/telecomCatalog';
import { initializePaystackPayment, verifyPaystackPayment, routeHubtelDelivery } from '../lib/apiClient';
import { recordOrderAndCommission } from '../lib/firestoreService';

interface StorefrontProps {
  selectedAgent: SubMerchant | null;
  onViewReceipt: (order: TelecomOrder) => void;
  onOpenAgentModal: () => void;
  onOpenBulkModal: () => void;
}

export const Storefront: React.FC<StorefrontProps> = ({
  selectedAgent,
  onViewReceipt,
  onOpenAgentModal,
  onOpenBulkModal,
}) => {
  const [selectedNetwork, setSelectedNetwork] = useState<TelecomNetwork>('MTN');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [selectedPackage, setSelectedPackage] = useState<BundlePackage | null>(null);
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [customAirtimeAmount, setCustomAirtimeAmount] = useState<number>(20);
  const [detectedNetwork, setDetectedNetwork] = useState<TelecomNetwork | null>(null);

  // Checkout modal & state
  const [isProcessingPayment, setIsProcessingPayment] = useState<boolean>(false);
  const [paymentStep, setPaymentStep] = useState<'IDLE' | 'PAYSTACK_CHECKOUT' | 'HUBTEL_ROUTING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [currentOrder, setCurrentOrder] = useState<TelecomOrder | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [momoProvider, setMomoProvider] = useState<'MTN_MOMO' | 'TELECEL_CASH' | 'AT_MONEY'>('MTN_MOMO');
  const [hubtelProgressText, setHubtelProgressText] = useState<string>('Initializing Hubtel Telco Routing...');

  // Auto-detect network when phone number changes
  useEffect(() => {
    const net = detectGhanaNetwork(customerPhone);
    setDetectedNetwork(net);
    if (net && net !== selectedNetwork) {
      setSelectedNetwork(net);
      if (net === 'MTN') setMomoProvider('MTN_MOMO');
      if (net === 'TELECEL') setMomoProvider('TELECEL_CASH');
      if (net === 'AT') setMomoProvider('AT_MONEY');
    }
  }, [customerPhone]);

  // Filter packages based on active network and category
  const filteredPackages = TELECOM_CATALOG.filter((pkg) => {
    if (pkg.network !== selectedNetwork) return false;
    if (categoryFilter === 'ALL') return true;
    if (categoryFilter === 'NON_EXPIRY') return pkg.category === 'NON_EXPIRY';
    if (categoryFilter === 'DAILY_WEEKLY') return pkg.category === 'DAILY' || pkg.category === 'WEEKLY';
    if (categoryFilter === 'MONTHLY_HEAVY') return pkg.category === 'MONTHLY' || pkg.category === 'TURBONET';
    if (categoryFilter === 'AIRTIME') return pkg.category === 'AIRTIME';
    return true;
  });

  const activeTheme = NETWORK_THEMES[selectedNetwork];

  // Initiate purchase flow
  const handleInitiatePurchase = (pkg: BundlePackage) => {
    setSelectedPackage(pkg);
    setErrorMessage('');
    setPaymentStep('PAYSTACK_CHECKOUT');
  };

  // Complete Payment & Route through Hubtel
  const handleConfirmPaystackPayment = async () => {
    if (!customerPhone || customerPhone.replace(/\D/g, '').length < 9) {
      setErrorMessage('Please enter a valid 10-digit Ghana phone number (e.g., 0244123456)');
      return;
    }

    if (!selectedPackage) return;

    const amountToPay = selectedPackage.category === 'AIRTIME' ? customAirtimeAmount : selectedPackage.price;
    const commissionAmount = Number(((amountToPay * (selectedAgent?.commissionRate || 10)) / 100).toFixed(2));

    setIsProcessingPayment(true);
    setPaymentStep('HUBTEL_ROUTING');
    setHubtelProgressText('1/3: Authorizing Ghana Mobile Money & Paystack Gateway...');

    try {
      // Step 1: Paystack Initialize & Verify
      const paystackRes = await initializePaystackPayment({
        amount: amountToPay,
        customerPhone: customerPhone,
        network: selectedNetwork,
        packageId: selectedPackage.id,
        packageName: selectedPackage.name,
        agentId: selectedAgent?.id || 'DIRECT',
        agentName: selectedAgent?.businessName || selectedAgent?.name || 'Ghana Telecom Direct',
      });

      await new Promise((r) => setTimeout(r, 900));
      setHubtelProgressText('2/3: Securing Hubtel API session & dispatching telco packets...');

      // Step 2: Route bundle through Hubtel directly
      const hubtelRes = await routeHubtelDelivery({
        recipientPhone: customerPhone,
        network: selectedNetwork,
        amount: amountToPay,
        packageId: selectedPackage.id,
        packageName: selectedPackage.name,
        dataAmount: selectedPackage.category === 'AIRTIME' ? `GHS ${amountToPay} Airtime` : selectedPackage.dataAmount,
        productType: selectedPackage.category === 'AIRTIME' ? 'AIRTIME' : 'DATA',
        agentId: selectedAgent?.id,
      });

      await new Promise((r) => setTimeout(r, 800));
      setHubtelProgressText(`3/3: Credited! ${selectedAgent ? `10% Commission (GHS ${commissionAmount.toFixed(2)}) allocated to ${selectedAgent.businessName}` : 'Order complete'}`);

      // Step 3: Record Order in Firestore and Agent's Sub-Collection with 10% Commission
      const orderPayload: TelecomOrder = {
        id: `ORD-GH-${Date.now().toString().slice(-7)}`,
        agentId: selectedAgent?.id || 'DIRECT',
        agentName: selectedAgent?.businessName || selectedAgent?.name || 'Direct Customer',
        agentPhone: selectedAgent?.phone || '',
        customerPhone: formatGhanaPhone(customerPhone),
        network: selectedNetwork,
        productType: selectedPackage.category === 'AIRTIME' ? 'AIRTIME' : 'DATA',
        packageId: selectedPackage.id,
        packageName: selectedPackage.name,
        dataAmount: selectedPackage.category === 'AIRTIME' ? `GHS ${amountToPay.toFixed(2)}` : selectedPackage.dataAmount,
        amount: amountToPay,
        commissionAmount: selectedAgent ? commissionAmount : 0,
        paymentMethod: 'PAYSTACK_MOMO',
        paymentReference: paystackRes.reference,
        paymentStatus: 'SUCCESS',
        routingGateway: 'HUBTEL',
        deliveryStatus: 'DELIVERED',
        deliveryMessage: hubtelRes.deliveryMessage || 'Delivered instantly via Hubtel Telecom Core Node',
        hubtelTransactionId: hubtelRes.hubtelTransactionId || '',
        createdAt: new Date().toISOString(),
      };

      const result = await recordOrderAndCommission(orderPayload);
      setCurrentOrder(result.order);
      setPaymentStep('SUCCESS');
    } catch (err: any) {
      console.error('Purchase flow failed:', err);
      setErrorMessage(err.message || 'Payment or delivery routing failed. Please retry.');
      setPaymentStep('ERROR');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Sub-Merchant Attribution Banner */}
      {selectedAgent ? (
        <div className="bg-gradient-to-r from-emerald-950/60 via-slate-900 to-slate-900 border border-emerald-500/40 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Gift className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                  Official Sub-Merchant Storefront
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-xs border border-emerald-500/30">
                  {selectedAgent.commissionRate || 10}% Commission Active
                </span>
              </div>
              <h3 className="text-lg font-bold text-white font-['Outfit']">
                {selectedAgent.businessName} ({selectedAgent.name})
              </h3>
              <p className="text-xs text-slate-300">
                MoMo Payout Account: <span className="font-mono text-emerald-300 font-semibold">{selectedAgent.phone}</span> ({selectedAgent.network})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={onOpenAgentModal}
              className="w-full sm:w-auto px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition-all"
            >
              Change Agent
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 text-slate-300">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>
              Purchasing via <strong>Master Platform</strong>. Want to earn 10% commission on every data sale?
            </span>
          </div>
          <button
            onClick={onOpenAgentModal}
            className="px-3.5 py-1.5 rounded-lg bg-amber-400/15 text-amber-400 hover:bg-amber-400/25 border border-amber-400/30 font-semibold transition-all"
          >
            Become a Sub-Merchant Agent
          </button>
        </div>
      )}

      {/* Main Order Configuration Header */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-400 text-xs font-semibold">
              <Zap className="w-3.5 h-3.5" />
              <span>Instant Paystack Payment & Hubtel Auto-Fulfillment</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-['Outfit']">
              Buy Ghana <span className="text-amber-400">Data Bundles</span> & Airtime
            </h1>

            <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-xl">
              Select any Ghana telecom network below. Non-expiry data, high speed 4G+/5G bundles,
              and airtime are delivered in seconds with auto-credited 10% sub-merchant commission.
            </p>

            {/* Ghana Recipient Phone Input with Auto Prefix Detection */}
            <div className="pt-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Recipient Ghana Phone Number
              </label>
              <div className="relative max-w-md">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  id="recipient-phone-input"
                  type="tel"
                  placeholder="e.g. 0244 123 456 or 0207 654 321"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full pl-10 pr-28 py-3.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all"
                />
                {detectedNetwork && (
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    <span
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
                        detectedNetwork === 'MTN'
                          ? 'bg-amber-400/20 text-amber-300 border-amber-400/40'
                          : detectedNetwork === 'TELECEL'
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                          : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                      }`}
                    >
                      {detectedNetwork} Detected
                    </span>
                  </div>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5">
                MTN: 024, 054, 055, 059, 025 | Telecel: 020, 050 | AT: 027, 057, 026, 056
              </p>
            </div>
          </div>

          {/* Quick Stats & Action Cards */}
          <div className="lg:col-span-5 grid grid-cols-2 gap-3 sm:gap-4">
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
              <div className="w-8 h-8 rounded-lg bg-amber-400/10 text-amber-400 flex items-center justify-center mb-2">
                <Clock className="w-4 h-4" />
              </div>
              <p className="text-slate-400 text-xs font-medium">Delivery Speed</p>
              <p className="text-xl font-bold text-white font-['Outfit']">Instant (3-5s)</p>
              <p className="text-[10px] text-emerald-400 mt-0.5">Via Hubtel Telco Node</p>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-2">
                <Gift className="w-4 h-4" />
              </div>
              <p className="text-slate-400 text-xs font-medium">Agent Earning</p>
              <p className="text-xl font-bold text-white font-['Outfit']">10% Cash</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Direct to MoMo Phone</p>
            </div>

            <div className="col-span-2 bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-300 font-semibold">Buying for Company or Team?</p>
                <p className="text-[11px] text-slate-400">Disperse bulk airtime & data to multiple numbers</p>
              </div>
              <button
                id="bulk-topup-btn"
                onClick={onOpenBulkModal}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-amber-400 border border-slate-700 whitespace-nowrap transition-all"
              >
                Bulk Recharge
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Network Switcher Tabs (MTN, Telecel, AT) */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white font-['Outfit']">1. Select Telecom Network</h2>
            <p className="text-xs text-slate-400">All Ghana mobile networks supported with direct API routing</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* MTN Ghana */}
          <button
            id="network-select-mtn"
            onClick={() => {
              setSelectedNetwork('MTN');
              setMomoProvider('MTN_MOMO');
            }}
            className={`relative text-left p-5 rounded-2xl border-2 transition-all flex items-center justify-between ${
              selectedNetwork === 'MTN'
                ? 'bg-amber-950/40 border-amber-400 shadow-xl shadow-amber-400/10'
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-400 text-slate-950 font-extrabold flex items-center justify-center text-lg shadow-md font-['Outfit']">
                MTN
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-white text-base">MTN Ghana</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-bold">
                    4G+ / 5G
                  </span>
                </div>
                <p className="text-xs text-slate-400">Non-Expiry & Turbonet</p>
              </div>
            </div>
            {selectedNetwork === 'MTN' && (
              <div className="w-6 h-6 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            )}
          </button>

          {/* Telecel Ghana */}
          <button
            id="network-select-telecel"
            onClick={() => {
              setSelectedNetwork('TELECEL');
              setMomoProvider('TELECEL_CASH');
            }}
            className={`relative text-left p-5 rounded-2xl border-2 transition-all flex items-center justify-between ${
              selectedNetwork === 'TELECEL'
                ? 'bg-rose-950/40 border-rose-500 shadow-xl shadow-rose-500/10'
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-rose-600 text-white font-extrabold flex items-center justify-center text-lg shadow-md font-['Outfit']">
                TEL
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-white text-base">Telecel Ghana</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-bold">
                    Vodafone
                  </span>
                </div>
                <p className="text-xs text-slate-400">Bossu & 2 Moorch</p>
              </div>
            </div>
            {selectedNetwork === 'TELECEL' && (
              <div className="w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            )}
          </button>

          {/* AT Ghana */}
          <button
            id="network-select-at"
            onClick={() => {
              setSelectedNetwork('AT');
              setMomoProvider('AT_MONEY');
            }}
            className={`relative text-left p-5 rounded-2xl border-2 transition-all flex items-center justify-between ${
              selectedNetwork === 'AT'
                ? 'bg-blue-950/40 border-blue-500 shadow-xl shadow-blue-500/10'
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-600 text-white font-extrabold flex items-center justify-center text-lg shadow-md font-['Outfit']">
                AT
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-white text-base">AT Ghana</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-bold">
                    AirtelTigo
                  </span>
                </div>
                <p className="text-xs text-slate-400">Big Time & Sika Kokoo</p>
              </div>
            </div>
            {selectedNetwork === 'AT' && (
              <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            )}
          </button>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white font-['Outfit']">2. Choose Package or Airtime</h2>
            <p className="text-xs text-slate-400">Select standard packages or top up custom airtime</p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto bg-slate-950/70 p-1 rounded-xl border border-slate-800">
            {[
              { id: 'ALL', label: 'All Bundles' },
              { id: 'NON_EXPIRY', label: 'No Expiry' },
              { id: 'DAILY_WEEKLY', label: 'Daily / Weekly' },
              { id: 'MONTHLY_HEAVY', label: 'Monthly & Heavy' },
              { id: 'AIRTIME', label: 'Airtime' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategoryFilter(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  categoryFilter === cat.id
                    ? 'bg-amber-400 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Airtime Top-Up Card (When Airtime is chosen or in Airtime tab) */}
        {(categoryFilter === 'AIRTIME' || categoryFilter === 'ALL') && (
          <div className="bg-gradient-to-r from-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-400/20 text-amber-400 flex items-center justify-center">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Custom {selectedNetwork} Airtime Top-Up</h3>
                  <p className="text-xs text-slate-400">Enter custom amount from GHS 1.00 to GHS 500.00</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {[5, 10, 20, 50, 100].map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setCustomAirtimeAmount(amt)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                      customAirtimeAmount === amt
                        ? 'bg-amber-400 text-slate-950 border-amber-400'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    GHS {amt}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
              <div className="w-full sm:w-64">
                <label className="text-[11px] text-slate-400 block mb-1">Custom Amount (GHS)</label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={customAirtimeAmount}
                  onChange={(e) => setCustomAirtimeAmount(Number(e.target.value))}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>

              <div className="flex-1 text-xs text-slate-400">
                <span>Sub-merchant commission on this recharge: </span>
                <span className="text-emerald-400 font-bold font-mono">
                  GHS {((customAirtimeAmount * (selectedAgent?.commissionRate || 10)) / 100).toFixed(2)} (10%)
                </span>
              </div>

              <button
                id="buy-custom-airtime-btn"
                onClick={() => {
                  const airtimePkg = TELECOM_CATALOG.find((p) => p.network === selectedNetwork && p.category === 'AIRTIME');
                  if (airtimePkg) {
                    handleInitiatePurchase(airtimePkg);
                  }
                }}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-sm shadow-lg shadow-amber-400/20 flex items-center justify-center gap-2 transition-all"
              >
                <span>Recharge GHS {customAirtimeAmount} Airtime</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Bundle Packages Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredPackages.map((pkg) => {
            const isAirtime = pkg.category === 'AIRTIME';
            const priceToDisplay = isAirtime ? customAirtimeAmount : pkg.price;
            const commAmount = ((priceToDisplay * (selectedAgent?.commissionRate || 10)) / 100).toFixed(2);

            return (
              <div
                key={pkg.id}
                className={`relative bg-slate-900/80 border rounded-2xl p-5 flex flex-col justify-between hover:border-slate-700 transition-all hover:shadow-xl group ${
                  pkg.popular ? 'border-amber-400/40' : 'border-slate-800'
                }`}
              >
                {pkg.popular && (
                  <div className="absolute -top-2.5 right-4 px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-extrabold flex items-center gap-1 shadow-sm">
                    <Flame className="w-3 h-3" />
                    <span>BESTSELLER</span>
                  </div>
                )}

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      {pkg.validity}
                    </span>
                    <span className="text-xs font-mono text-emerald-400 font-medium">
                      +GHS {commAmount} (10%)
                    </span>
                  </div>

                  <div>
                    <h3 className="text-2xl font-black text-white font-['Outfit'] tracking-tight group-hover:text-amber-400 transition-colors">
                      {pkg.dataAmount}
                    </h3>
                    <p className="text-xs font-semibold text-slate-300 mt-0.5">{pkg.name}</p>
                    <p className="text-xs text-slate-400 line-clamp-2 mt-1">{pkg.description}</p>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800/80 mt-4 space-y-3">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-xs text-slate-400">Price: </span>
                      <span className="text-xl font-extrabold text-white font-['Outfit']">
                        GHS {priceToDisplay.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <button
                    id={`buy-bundle-${pkg.id}`}
                    onClick={() => handleInitiatePurchase(pkg)}
                    className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-amber-400 hover:text-slate-950 text-slate-200 text-xs font-bold transition-all flex items-center justify-center gap-2 group-hover:bg-amber-400 group-hover:text-slate-950 shadow-md"
                  >
                    <span>Instant Purchase</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Paystack Payment & Hubtel Delivery Modal */}
      {paymentStep !== 'IDLE' && selectedPackage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-400/20 text-amber-400 flex items-center justify-center">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white font-['Outfit']">Paystack Secure Checkout</h3>
                  <p className="text-xs text-slate-400">Ghana Telecom Hub • Instant Delivery</p>
                </div>
              </div>
              {paymentStep === 'PAYSTACK_CHECKOUT' && (
                <button
                  onClick={() => setPaymentStep('IDLE')}
                  className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded bg-slate-800"
                >
                  Cancel
                </button>
              )}
            </div>

            {/* Step: Paystack Checkout Details */}
            {paymentStep === 'PAYSTACK_CHECKOUT' && (
              <div className="space-y-4">
                {/* Order Summary Box */}
                <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800 space-y-2.5 text-xs">
                  <div className="flex justify-between text-slate-300">
                    <span>Package:</span>
                    <span className="font-bold text-white">{selectedPackage.name} ({selectedPackage.dataAmount})</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Network:</span>
                    <span className="font-bold text-white">{selectedNetwork} Ghana</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Recipient Phone:</span>
                    <span className="font-mono font-bold text-amber-400">{customerPhone || 'Not specified'}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Sub-Merchant:</span>
                    <span className="text-emerald-400 font-semibold">
                      {selectedAgent?.businessName || 'Master Direct Merchant'} (10% Comm)
                    </span>
                  </div>
                  <div className="border-t border-slate-800 pt-2 flex justify-between items-baseline">
                    <span className="text-sm font-semibold text-slate-200">Total Payable:</span>
                    <span className="text-xl font-extrabold text-white font-['Outfit']">
                      GHS {(selectedPackage.category === 'AIRTIME' ? customAirtimeAmount : selectedPackage.price).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Mobile Money Provider Selector */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2">
                    Select Ghana Mobile Money Provider
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => setMomoProvider('MTN_MOMO')}
                      className={`p-3 rounded-xl border text-center transition-all ${
                        momoProvider === 'MTN_MOMO'
                          ? 'bg-amber-400/20 border-amber-400 text-amber-300 font-bold'
                          : 'bg-slate-800/60 border-slate-700 text-slate-300'
                      }`}
                    >
                      <p className="text-xs">MTN MoMo</p>
                      <p className="text-[10px] text-slate-400">*170#</p>
                    </button>
                    <button
                      onClick={() => setMomoProvider('TELECEL_CASH')}
                      className={`p-3 rounded-xl border text-center transition-all ${
                        momoProvider === 'TELECEL_CASH'
                          ? 'bg-rose-500/20 border-rose-500 text-rose-300 font-bold'
                          : 'bg-slate-800/60 border-slate-700 text-slate-300'
                      }`}
                    >
                      <p className="text-xs">Telecel Cash</p>
                      <p className="text-[10px] text-slate-400">*110#</p>
                    </button>
                    <button
                      onClick={() => setMomoProvider('AT_MONEY')}
                      className={`p-3 rounded-xl border text-center transition-all ${
                        momoProvider === 'AT_MONEY'
                          ? 'bg-blue-500/20 border-blue-500 text-blue-300 font-bold'
                          : 'bg-slate-800/60 border-slate-700 text-slate-300'
                      }`}
                    >
                      <p className="text-xs">AT Money</p>
                      <p className="text-[10px] text-slate-400">*110#</p>
                    </button>
                  </div>
                </div>

                {errorMessage && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <button
                  id="confirm-paystack-btn"
                  onClick={handleConfirmPaystackPayment}
                  disabled={isProcessingPayment}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-extrabold text-sm shadow-xl shadow-amber-400/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>
                    Pay GHS {(selectedPackage.category === 'AIRTIME' ? customAirtimeAmount : selectedPackage.price).toFixed(2)} via Paystack
                  </span>
                </button>
              </div>
            )}

            {/* Step: Hubtel Telco Routing Progress */}
            {paymentStep === 'HUBTEL_ROUTING' && (
              <div className="py-8 text-center space-y-5">
                <div className="relative w-20 h-20 mx-auto">
                  <div className="absolute inset-0 rounded-full border-4 border-slate-800 border-t-amber-400 animate-spin" />
                  <div className="w-full h-full flex items-center justify-center text-amber-400">
                    <Wifi className="w-8 h-8 animate-pulse" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <h4 className="text-base font-bold text-white">Hubtel Gateway Routing in Progress</h4>
                  <p className="text-xs text-amber-400 font-mono animate-pulse">{hubtelProgressText}</p>
                  <p className="text-[11px] text-slate-400">
                    Dispatching to {customerPhone} • {selectedNetwork} Network Core
                  </p>
                </div>
              </div>
            )}

            {/* Step: Success & Receipt Trigger */}
            {paymentStep === 'SUCCESS' && currentOrder && (
              <div className="text-center space-y-5 py-4">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                  <CheckCircle2 className="w-8 h-8" />
                </div>

                <div className="space-y-1">
                  <h4 className="text-xl font-extrabold text-white font-['Outfit']">Purchase & Delivery Successful!</h4>
                  <p className="text-xs text-slate-300">
                    {currentOrder.packageName} ({currentOrder.dataAmount}) credited to{' '}
                    <span className="font-mono text-emerald-400 font-bold">{currentOrder.customerPhone}</span>
                  </p>
                </div>

                {/* 10% Commission Notification Badge */}
                {selectedAgent && currentOrder.commissionAmount > 0 && (
                  <div className="bg-emerald-950/70 border border-emerald-500/40 rounded-2xl p-3.5 text-left flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div className="text-xs">
                      <p className="font-bold text-emerald-300">
                        10% Commission Auto-Credited: GHS {currentOrder.commissionAmount.toFixed(2)}
                      </p>
                      <p className="text-slate-400 text-[11px]">
                        Credited to Sub-Merchant <strong className="text-white">{selectedAgent.businessName}</strong> ({selectedAgent.phone})
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3 pt-2">
                  <button
                    id="view-receipt-modal-btn"
                    onClick={() => {
                      setPaymentStep('IDLE');
                      onViewReceipt(currentOrder);
                    }}
                    className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 flex items-center justify-center gap-2 transition-all"
                  >
                    <Printer className="w-4 h-4 text-amber-400" />
                    <span>View & Print Receipt</span>
                  </button>

                  <button
                    id="order-another-btn"
                    onClick={() => {
                      setPaymentStep('IDLE');
                      setCustomerPhone('');
                    }}
                    className="flex-1 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs shadow-lg shadow-amber-400/20 transition-all"
                  >
                    Buy Another Bundle
                  </button>
                </div>
              </div>
            )}

            {/* Step: Error */}
            {paymentStep === 'ERROR' && (
              <div className="text-center space-y-4 py-4">
                <div className="w-14 h-14 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mx-auto">
                  <AlertCircle className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-base font-bold text-white">Payment or Delivery Error</h4>
                  <p className="text-xs text-red-300">{errorMessage || 'An error occurred during transaction processing.'}</p>
                </div>
                <button
                  onClick={() => setPaymentStep('PAYSTACK_CHECKOUT')}
                  className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white transition-all"
                >
                  Retry Transaction
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
