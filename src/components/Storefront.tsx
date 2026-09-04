import React, { useState, useEffect, useRef } from 'react';
import { TelecomPackage, TelecomNetwork, SubMerchant, TelecomOrder } from '../types';
import {
  TELECOM_PACKAGES,
  TELECOM_NETWORKS,
  detectNetworkFromPhone,
  formatGhanaPhone,
  isValidGhanaPhone,
} from '../data/telecomCatalog';
import { recordTelecomOrder } from '../lib/firestoreService';
import {
  processHubtelFulfillment,
  chargePaystackMobileMoney,
  checkPaystackChargeStatus,
  submitPaystackOtp,
  fetchGatewayConfig,
  GatewayConfigStatus,
} from '../lib/apiClient';
import { useToastNotification } from '../context/ToastNotificationContext';
import confetti from 'canvas-confetti';
import {
  Zap,
  Smartphone,
  CheckCircle2,
  ShieldCheck,
  CreditCard,
  Layers,
  ArrowRight,
  Flame,
  Radio,
  Loader2,
  Info,
  KeyRound,
  Check,
  Receipt,
  Download,
  Share2,
  RefreshCw,
  ExternalLink,
  Store,
  Users,
  UserCheck,
  X,
} from 'lucide-react';

interface StorefrontProps {
  selectedAgent: SubMerchant | null;
  onOrderCompleted: (order: TelecomOrder) => void;
  onOpenAgentSelect?: () => void;
  agents?: SubMerchant[];
  onSelectAgent?: (agent: SubMerchant | null) => void;
  onNavigateToTab?: (tab: 'storefront' | 'agent-portal' | 'admin' | 'security' | 'ussd' | 'history' | 'analytics' | 'retry-service') => void;
}

export const Storefront: React.FC<StorefrontProps> = ({
  selectedAgent,
  onOrderCompleted,
  onOpenAgentSelect,
  agents = [],
  onSelectAgent,
  onNavigateToTab,
}) => {
  const { addToast } = useToastNotification();
  const [selectedNetwork, setSelectedNetwork] = useState<TelecomNetwork>('MTN');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'DATA' | 'AIRTIME'>('ALL');
  const [customerPhone, setCustomerPhone] = useState('');
  const [momoProvider, setMomoProvider] = useState<TelecomNetwork>('MTN');
  const [selectedPackage, setSelectedPackage] = useState<TelecomPackage | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<'SELECT' | 'CONFIRM' | 'PROCESSING' | 'RECEIPT'>('SELECT');
  const [dispatchStage, setDispatchStage] = useState<'IDLE' | 'PROMPT' | 'DEBITED' | 'CARRIER' | 'SYNC' | 'COMPLETED'>('IDLE');

  // Multi-party billing & OTP states
  const [useSeparatePayer, setUseSeparatePayer] = useState(false);
  const [payerPhone, setPayerPhone] = useState('');
  const [gatewayConfig, setGatewayConfig] = useState<GatewayConfigStatus | null>(null);
  const [paystackPromptText, setPaystackPromptText] = useState('');
  const [currentReference, setCurrentReference] = useState('');
  const [needsOtp, setNeedsOtp] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [completedOrder, setCompletedOrder] = useState<TelecomOrder | null>(null);
  const [isChannelCardDismissed, setIsChannelCardDismissed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('storefront_channel_card_dismissed') === 'true';
    } catch {
      return false;
    }
  });
  const pollingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleDismissChannelCard = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setIsChannelCardDismissed(true);
    try {
      localStorage.setItem('storefront_channel_card_dismissed', 'true');
    } catch (err) {
      console.warn('Could not persist channel card state:', err);
    }
    addToast('info', 'Main Store View', 'Channel selector minimized. Main store canvas is ready.');
  };

  const handleReopenChannelCard = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setIsChannelCardDismissed(false);
    try {
      localStorage.setItem('storefront_channel_card_dismissed', 'false');
    } catch (err) {
      console.warn('Could not persist channel card state:', err);
    }
  };

  // Load gateway status on mount
  useEffect(() => {
    fetchGatewayConfig().then(setGatewayConfig);
  }, []);

  // Auto-detect network from entered phone number
  const handlePhoneChange = (val: string) => {
    setCustomerPhone(val);
    if (val.length >= 3) {
      const detected = detectNetworkFromPhone(val);
      setSelectedNetwork(detected);
      if (!useSeparatePayer) {
        setMomoProvider(detected);
      }
    }
  };

  const handlePayerPhoneChange = (val: string) => {
    setPayerPhone(val);
    if (val.length >= 3) {
      const detected = detectNetworkFromPhone(val);
      setMomoProvider(detected);
    }
  };

  const currentNetworkInfo = TELECOM_NETWORKS[selectedNetwork];

  const packages = TELECOM_PACKAGES.filter((p) => {
    if (p.network !== selectedNetwork) return false;
    if (categoryFilter === 'ALL') return true;
    return p.category === categoryFilter;
  });

  const handleSelectPackage = (pkg: TelecomPackage) => {
    setSelectedPackage(pkg);
    setCheckoutStep('CONFIRM');
    setNeedsOtp(false);
    setOtpCode('');
  };

  // Clean up polling timer
  useEffect(() => {
    return () => {
      if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
    };
  }, []);

  // Main purchase execution: 1) Paystack MoMo deduction -> 2) Hubtel carrier dispatch
  const handleExecutePurchase = async () => {
    if (!selectedPackage) return;

    if (!isValidGhanaPhone(customerPhone)) {
      addToast('error', 'Invalid Recipient Number', 'Please enter a valid 10-digit Ghana mobile number (e.g. 0244123456).');
      return;
    }

    const billingPhone = useSeparatePayer ? payerPhone : customerPhone;
    if (useSeparatePayer && !isValidGhanaPhone(billingPhone)) {
      addToast('error', 'Invalid Billing Number', 'Please enter a valid Ghana Mobile Money wallet number.');
      return;
    }

    setIsCheckingOut(true);
    setCheckoutStep('PROCESSING');
    setDispatchStage('PROMPT');
    const orderId = `ORD-GH-${Date.now().toString().slice(-7)}`;
    setCurrentReference(orderId);

    try {
      // Step 1: Initiate Mobile Money Deduction via Paystack API
      const chargeRes = await chargePaystackMobileMoney({
        customerPhone: formatGhanaPhone(billingPhone),
        network: momoProvider,
        amountGhs: selectedPackage.priceGhs,
        orderId,
      });

      const ref = chargeRes.reference || orderId;
      setCurrentReference(ref);
      setPaystackPromptText(
        chargeRes.displayText ||
          `Mobile Money USSD prompt sent to ${formatGhanaPhone(billingPhone)}. Please approve with your PIN on your phone.`
      );

      // Handle OTP requirement (for some banks/wallets)
      if (chargeRes.status === 'send_otp') {
        setNeedsOtp(true);
        setIsCheckingOut(false);
        return;
      }

      // Step 2: Poll Paystack until customer authorizes PIN on their phone
      let paymentConfirmed = false;
      let checkAttempts = 0;
      const maxAttempts = 18; // ~36 seconds max polling

      while (!paymentConfirmed && checkAttempts < maxAttempts) {
        checkAttempts++;
        await new Promise((r) => setTimeout(r, 2000));

        const statusRes = await checkPaystackChargeStatus(ref);
        if (statusRes.status === 'success') {
          paymentConfirmed = true;
          break;
        } else if (statusRes.status === 'failed') {
          throw new Error(statusRes.message || 'Mobile Money deduction declined by customer or carrier.');
        }
      }

      setDispatchStage('DEBITED');
      addToast('success', 'Mobile Money Deducted', `Paystack debited GHS ${selectedPackage.priceGhs.toFixed(2)} from ${formatGhanaPhone(billingPhone)}`);

      // Step 3: Immediate Carrier Fulfillment via Hubtel Telecom Core
      setDispatchStage('CARRIER');
      const hubtelRes = await processHubtelFulfillment({
        orderId,
        customerPhone: formatGhanaPhone(customerPhone),
        network: selectedNetwork,
        productType: selectedPackage.category === 'AIRTIME' ? 'AIRTIME' : 'DATA',
        packageName: selectedPackage.name,
        amountGhs: selectedPackage.priceGhs,
        paymentReference: ref,
      });

      // Step 4: Record Transaction in Firestore and Credit Sub-merchant in Real-Time
      setDispatchStage('SYNC');
      const commRate = selectedAgent?.commissionRate || 0;
      const commissionAmount = (selectedPackage.priceGhs * commRate) / 100;

      const order: TelecomOrder = {
        id: orderId,
        agentId: selectedAgent?.id || 'DIRECT',
        agentName: selectedAgent?.businessName || selectedAgent?.name || 'Direct Customer',
        agentPhone: selectedAgent?.phone || '',
        customerPhone: formatGhanaPhone(customerPhone),
        network: selectedNetwork,
        productType: selectedPackage.category === 'AIRTIME' ? 'AIRTIME' : 'DATA',
        packageId: selectedPackage.id,
        packageName: selectedPackage.name,
        amountGhs: selectedPackage.priceGhs,
        commissionGhs: commissionAmount,
        paymentStatus: 'SUCCESS',
        routingGateway: 'HUBTEL',
        deliveryStatus: 'DELIVERED',
        deliveryMessage: hubtelRes.deliveryMessage || `Delivered instantly via Hubtel Telecom Core to ${customerPhone}`,
        hubtelTransactionId: hubtelRes.hubtelTransactionId || `HUB-${Date.now().toString().slice(-8)}`,
        paystackReference: ref,
        momoProvider,
        paidAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };

      const savedOrder = await recordTelecomOrder(order);
      setCompletedOrder(savedOrder);
      setDispatchStage('COMPLETED');
      setCheckoutStep('RECEIPT');

      // Trigger Confetti
      try {
        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.6 },
        });
      } catch (e) {}

      addToast(
        'success',
        'Order Dispatched!',
        `${selectedPackage.name} sent to ${formatGhanaPhone(customerPhone)} via Hubtel direct switch.`
      );

      onOrderCompleted(savedOrder);
    } catch (err: any) {
      console.error('Purchase failed:', err);
      addToast('error', 'Transaction Failed', err.message || 'Payment deduction or dispatch encountered an error.');
      setCheckoutStep('CONFIRM');
    } finally {
      setIsCheckingOut(false);
    }
  };

  // Submit OTP if prompted by Paystack
  const handleOtpSubmit = async () => {
    if (!otpCode) return;
    setIsCheckingOut(true);
    try {
      const res = await submitPaystackOtp(currentReference, otpCode);
      if (res.status !== false) {
        addToast('success', 'OTP Verified', 'Processing telecom dispatch...');
        setNeedsOtp(false);
        // Continue to fulfill via Hubtel
        handleExecutePurchase();
      } else {
        addToast('error', 'Invalid OTP', res.message || 'Please check the OTP code and try again.');
        setIsCheckingOut(false);
      }
    } catch (err: any) {
      addToast('error', 'OTP Error', err.message);
      setIsCheckingOut(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Hero / Header Section with Live Status Indicators */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="max-w-2xl relative z-10">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Paystack MoMo Auto-Debit: Active
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold font-mono">
              <Zap className="w-3.5 h-3.5" />
              Hubtel Direct Switch: Real-Time
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
            Buy Instant Ghana Telecom Bundles & Airtime
          </h1>
          <p className="mt-2 text-sm sm:text-base text-slate-300">
            Real-time automated deductions via Mobile Money and instant line dispatch across MTN, Telecel, and AirtelTigo.
          </p>
        </div>

        {/* Decorative background glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
      </div>

      {/* Sub-Merchant Channel Routing Card or Compact Re-open Banner */}
      {isChannelCardDismissed ? (
        <div
          id="channel-card-reopen-banner"
          className="bg-slate-900/90 border border-slate-800 rounded-2xl px-4 sm:px-5 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg transition-all"
        >
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-xl ${
                selectedAgent
                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                  : 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
              }`}
            >
              {selectedAgent ? <ShieldCheck className="w-4 h-4" /> : <Store className="w-4 h-4" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Active Channel
                </span>
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold font-mono ${
                    selectedAgent
                      ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                      : 'bg-amber-500/15 border border-amber-500/30 text-amber-300'
                  }`}
                >
                  {selectedAgent ? 'RESELLER' : 'DIRECT STORE'}
                </span>
              </div>
              <div className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                <span>{selectedAgent ? selectedAgent.businessName : 'Direct Platform Purchases (Official Store)'}</span>
                {selectedAgent && (
                  <span className="text-emerald-400 text-xs font-normal">
                    ({selectedAgent.commissionRate}% comm.)
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {selectedAgent && (
              <button
                id="banner-switch-direct-btn"
                type="button"
                onClick={() => {
                  onSelectAgent?.(null);
                  addToast('info', 'Direct Purchases', 'Switched to official Direct Platform channel.');
                }}
                className="text-xs font-medium text-slate-300 hover:text-white px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
                title="Switch to Direct Purchases"
              >
                <Store className="w-3.5 h-3.5 text-amber-400" />
                <span>Direct Store</span>
              </button>
            )}

            <button
              id="channel-card-reopen-btn"
              type="button"
              onClick={handleReopenChannelCard}
              className="text-xs font-bold text-amber-400 hover:text-amber-300 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-amber-500/40 transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="Open channel selector card"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Show Channel Selector</span>
            </button>
          </div>
        </div>
      ) : (
        <div
          id="sub-merchant-channel-card"
          className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl transition-all duration-200 relative"
        >
          {/* Top-Right Dedicated Card Close Button */}
          <button
            id="sub-merchant-card-close-top-btn"
            type="button"
            onClick={handleDismissChannelCard}
            aria-label="Close sub-merchant channel card"
            title="Close channel selector card and view main store"
            className="absolute top-4 right-4 sm:top-5 sm:right-5 text-slate-400 hover:text-white p-2 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer z-10 flex items-center gap-1.5 text-xs group"
          >
            <span className="hidden sm:inline text-[11px] font-semibold text-slate-400 group-hover:text-slate-200">
              Close
            </span>
            <X className="w-4 h-4 text-slate-400 group-hover:text-white" />
          </button>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-4 pr-16 sm:pr-24">
            <div className="flex items-center gap-3">
              <div
                className={`p-2.5 rounded-2xl ${
                  selectedAgent
                    ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                    : 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
                }`}
              >
                {selectedAgent ? <ShieldCheck className="w-5 h-5" /> : <Store className="w-5 h-5" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Selected Channel
                  </span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold font-mono ${
                      selectedAgent
                        ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                        : 'bg-amber-500/15 border border-amber-500/30 text-amber-300'
                    }`}
                  >
                    {selectedAgent ? 'RESELLER OUTLET' : 'DIRECT PLATFORM'}
                  </span>
                </div>
                <h2 className="text-base sm:text-lg font-extrabold text-white mt-0.5">
                  {selectedAgent ? selectedAgent.businessName : 'Direct Platform Purchases'}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {selectedAgent
                    ? `Agent: ${selectedAgent.name} • ${selectedAgent.phone} • ${selectedAgent.commissionRate}% commission attributed`
                    : 'Official Hubtel carrier dispatch • Standard network pricing • Zero reseller markup'}
                </p>
              </div>
            </div>

            {/* Primary Channel Action Buttons and Close button */}
            <div className="flex flex-wrap items-center gap-2">
              {/* 1. Direct Platform Purchases Button */}
              <button
                id="channel-card-direct-purchase-btn"
                type="button"
                onClick={() => {
                  onSelectAgent?.(null);
                  addToast(
                    'info',
                    'Direct Platform Purchases',
                    'Switched to Direct Platform Purchases. Standard carrier pricing with no intermediary commission markup.'
                  );
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  selectedAgent === null
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 ring-2 ring-amber-400/50'
                    : 'bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-200 hover:text-white'
                }`}
                title="Switch to Direct Platform Purchases (no intermediary agent)"
              >
                <Store className="w-3.5 h-3.5" />
                <span>Direct Platform Purchases</span>
                {selectedAgent === null && <Check className="w-3.5 h-3.5 ml-0.5" />}
              </button>

              {/* 2. Choose/Change Sub-Merchant Button */}
              {onOpenAgentSelect && (
                <button
                  id="channel-card-select-agent-btn"
                  type="button"
                  onClick={onOpenAgentSelect}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    selectedAgent !== null
                      ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30'
                      : 'bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-200 hover:text-white'
                  }`}
                  title="Select or switch sub-merchant reseller agent"
                >
                  <UserCheck className="w-3.5 h-3.5 text-amber-400" />
                  <span>{selectedAgent ? 'Change Agent' : 'Select Agent'}</span>
                </button>
              )}

              {/* 3. Agent Portal Link */}
              {onNavigateToTab && (
                <button
                  id="channel-card-agent-portal-btn"
                  type="button"
                  onClick={() => onNavigateToTab('agent-portal')}
                  className="px-3 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
                  title="Open Sub-Merchant Reseller Portal"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Agent Portal</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}

              {/* Close Button: closes channel card and shows clean main store page */}
              <button
                id="channel-card-close-btn"
                type="button"
                onClick={handleDismissChannelCard}
                aria-label="Close channel card and show main store"
                title="Close channel selector card"
                className="text-slate-400 hover:text-white px-2.5 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer flex items-center gap-1 text-xs font-semibold"
              >
                <X className="w-3.5 h-3.5" />
                <span>Close</span>
              </button>
            </div>
          </div>

          {/* Quick Channel Chips: Direct + Top Sub-Merchants */}
          <div className="mt-3.5 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-500 text-[11px] font-medium mr-1">Quick Select:</span>
            <button
              id="quick-channel-direct-btn"
              type="button"
              onClick={() => {
                onSelectAgent?.(null);
                addToast('info', 'Direct Purchases', 'Active channel set to Direct Platform.');
              }}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedAgent === null
                  ? 'bg-amber-400/20 text-amber-300 border border-amber-400/50 font-bold'
                  : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <Store className="w-3 h-3" />
              <span>Direct (Official)</span>
              {selectedAgent === null && <Check className="w-3 h-3 text-amber-400" />}
            </button>

            {agents &&
              agents.slice(0, 3).map((ag) => {
                const isSelected = selectedAgent?.id === ag.id;
                return (
                  <button
                    key={ag.id}
                    id={`quick-channel-agent-${ag.id}-btn`}
                    type="button"
                    onClick={() => {
                      onSelectAgent?.(ag);
                      addToast('success', 'Reseller Selected', `Switched to ${ag.businessName}`);
                    }}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/50 font-bold'
                        : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    <span className="truncate max-w-[140px]">{ag.businessName}</span>
                    <span className="text-[10px] opacity-75 font-mono">({ag.commissionRate}%)</span>
                    {isSelected && <Check className="w-3 h-3 text-emerald-400" />}
                  </button>
                );
              })}
          </div>
        </div>
      )}

      {/* Main Order Configuration Canvas */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
        {/* Step 1: Customer Phone Number Input */}
        <div>
          <label className="block text-sm font-bold text-slate-200 mb-2">
            1. Recipient Phone Number
          </label>
          <div className="relative max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Smartphone className="w-5 h-5 text-amber-400" />
            </div>
            <input
              type="tel"
              value={customerPhone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              placeholder="e.g. 0244123456 or 055XXXXXXX"
              className="w-full pl-11 pr-4 py-3 bg-slate-950 border border-slate-700 rounded-2xl text-white font-mono text-base placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
            />
            {customerPhone && (
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black uppercase font-mono tracking-wider bg-slate-800 text-amber-400 border border-slate-700">
                  {selectedNetwork}
                </span>
              </div>
            )}
          </div>
          <p className="mt-1.5 text-xs text-slate-400 flex items-center gap-1">
            <Info className="w-3.5 h-3.5 text-slate-400" />
            Network is automatically detected from prefix (024/054/055: MTN, 020/050: Telecel, 027/057: AT).
          </p>
        </div>

        {/* Step 2: Telecom Carrier Network Selector */}
        <div>
          <label className="block text-sm font-bold text-slate-200 mb-2">
            2. Choose Telecom Carrier
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(Object.keys(TELECOM_NETWORKS) as TelecomNetwork[]).map((net) => {
              const info = TELECOM_NETWORKS[net];
              const isSelected = selectedNetwork === net;
              return (
                <button
                  key={net}
                  onClick={() => {
                    setSelectedNetwork(net);
                    if (!useSeparatePayer) setMomoProvider(net);
                  }}
                  className={`flex items-center gap-3 p-4 rounded-2xl border transition-all text-left cursor-pointer ${
                    isSelected
                      ? 'bg-slate-800/90 border-amber-500 shadow-md shadow-amber-500/10'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                  }`}
                >
                  <div
                    className="w-4 h-10 rounded-full"
                    style={{ backgroundColor: info.primaryColor }}
                  />
                  <div>
                    <span className="font-bold text-white text-sm block">{info.name}</span>
                    <span className="text-xs text-slate-400 block font-mono">
                      Hubtel Node: Active
                    </span>
                  </div>
                  {isSelected && (
                    <CheckCircle2 className="w-5 h-5 text-amber-400 ml-auto" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 3: Product Category Filter */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-2">
            Category:
          </span>
          {(['ALL', 'DATA', 'AIRTIME'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                categoryFilter === cat
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {cat === 'ALL' ? 'All Products' : cat === 'DATA' ? '⚡ Data Bundles' : '📞 Airtime Top-Up'}
            </button>
          ))}
        </div>

        {/* Step 4: Package Selection Grid */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-bold text-slate-200">
              3. Select Package ({packages.length} Available on {currentNetworkInfo.name})
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {packages.map((pkg) => (
              <div
                key={pkg.id}
                onClick={() => handleSelectPackage(pkg)}
                className="group relative bg-slate-950 border border-slate-800 hover:border-amber-500/60 rounded-2xl p-4 transition-all hover:shadow-xl hover:shadow-amber-500/5 cursor-pointer flex flex-col justify-between"
              >
                {pkg.isPopular && (
                  <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-bold flex items-center gap-1">
                    <Flame className="w-3 h-3" />
                    Popular
                  </div>
                )}

                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono font-bold text-amber-400">
                      {pkg.category === 'DATA' ? 'DATA BUNDLE' : 'AIRTIME TOPUP'}
                    </span>
                    <span className="text-[10px] text-slate-500">• {pkg.validity}</span>
                  </div>

                  <h3 className="text-base font-bold text-white group-hover:text-amber-400 transition-colors">
                    {pkg.name}
                  </h3>

                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                    {pkg.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-lg font-black text-white font-mono">
                      GHS {pkg.priceGhs.toFixed(2)}
                    </span>
                    {pkg.originalPriceGhs && (
                      <span className="text-xs text-slate-500 line-through font-mono">
                        GHS {pkg.originalPriceGhs.toFixed(2)}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    className="px-3 py-1.5 rounded-xl bg-slate-800 group-hover:bg-amber-500 group-hover:text-slate-950 text-slate-300 text-xs font-bold transition-all flex items-center gap-1"
                  >
                    <span>Select</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Checkout & Real-time Dispatch Modal */}
      {(checkoutStep === 'CONFIRM' || checkoutStep === 'PROCESSING') && selectedPackage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Order Summary & Payment</h3>
                  <p className="text-xs text-slate-400">Paystack MoMo Debit + Hubtel Core Dispatch</p>
                </div>
              </div>
              <button
                onClick={() => {
                  if (!isCheckingOut) {
                    setCheckoutStep('SELECT');
                    setNeedsOtp(false);
                  }
                }}
                disabled={isCheckingOut}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded-lg bg-slate-800 cursor-pointer disabled:opacity-50"
              >
                Close
              </button>
            </div>

            {/* Order Details Preview */}
            <div className="mt-4 p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Product:</span>
                <strong className="text-white font-medium">{selectedPackage.name}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Carrier Switch:</span>
                <span className="text-amber-400 font-bold uppercase">{selectedNetwork} Ghana</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Recipient Mobile:</span>
                <strong className="text-white font-mono">{formatGhanaPhone(customerPhone)}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Validity:</span>
                <span className="text-slate-300">{selectedPackage.validity}</span>
              </div>
              <div className="pt-2 border-t border-slate-800 flex justify-between items-baseline">
                <span className="text-sm font-bold text-slate-300">Total Due:</span>
                <span className="text-xl font-black text-amber-400 font-mono">
                  GHS {selectedPackage.priceGhs.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Payment Configuration (Paystack MoMo) */}
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300">
                  Pay with Mobile Money (Paystack Gateway):
                </label>
                <button
                  type="button"
                  onClick={() => setUseSeparatePayer(!useSeparatePayer)}
                  className="text-[11px] text-amber-400 hover:underline cursor-pointer"
                >
                  {useSeparatePayer ? 'Use recipient number' : 'Pay with different number?'}
                </button>
              </div>

              {/* Separate Payer Phone Input if toggled */}
              {useSeparatePayer && (
                <div>
                  <input
                    type="tel"
                    value={payerPhone}
                    onChange={(e) => handlePayerPhoneChange(e.target.value)}
                    placeholder="Enter payer MoMo number (e.g. 0244000000)"
                    className="w-full px-3 py-2 bg-slate-950 border border-amber-500/40 rounded-xl text-white font-mono text-xs placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
              )}

              {/* MoMo Provider selector */}
              <div className="grid grid-cols-3 gap-2">
                {(['MTN', 'TELECEL', 'AIRTELTIGO'] as TelecomNetwork[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMomoProvider(m)}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      momoProvider === m
                        ? 'bg-amber-500/10 border-amber-500 text-amber-400'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    {m === 'MTN' ? 'MTN MoMo' : m === 'TELECEL' ? 'Telecel Cash' : 'AT Money'}
                  </button>
                ))}
              </div>
            </div>

            {/* Live Progress Stage Indicators */}
            {isCheckingOut && (
              <div className="mt-4 p-3 bg-slate-950/90 border border-amber-500/40 rounded-2xl space-y-2">
                <div className="flex items-center gap-2.5">
                  <Loader2 className="w-4 h-4 text-amber-400 animate-spin shrink-0" />
                  <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wide">
                    {dispatchStage === 'PROMPT' && '1/3 Authorizing Mobile Money Debit...'}
                    {dispatchStage === 'DEBITED' && '2/3 Paystack Debit Confirmed!'}
                    {dispatchStage === 'CARRIER' && '2/3 Hubtel Core Dispatching Data...'}
                    {dispatchStage === 'SYNC' && '3/3 Updating Firestore & Ledger...'}
                  </span>
                </div>
                <p className="text-xs text-slate-300 pl-6 leading-relaxed">
                  {dispatchStage === 'PROMPT' && (paystackPromptText || `Push prompt sent to ${formatGhanaPhone(useSeparatePayer ? payerPhone : customerPhone)}. Please enter your Mobile Money PIN on your phone.`)}
                  {dispatchStage === 'DEBITED' && 'Funds deducted successfully. Forwarding telecom packet to Hubtel carrier router.'}
                  {dispatchStage === 'CARRIER' && `Pushing ${selectedPackage.name} directly through Hubtel ${selectedNetwork} Node.`}
                  {dispatchStage === 'SYNC' && 'Finalizing transaction receipt and updating reseller commission.'}
                </p>
              </div>
            )}

            {/* OTP Input Form if required by Paystack */}
            {needsOtp && (
              <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-3">
                <div className="flex items-center gap-2 text-amber-400 text-xs font-bold">
                  <KeyRound className="w-4 h-4" />
                  <span>Enter OTP Sent to Mobile Money Phone</span>
                </div>
                <input
                  type="text"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="Enter OTP from SMS"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-center text-sm tracking-widest focus:outline-none focus:border-amber-500"
                />
                <button
                  type="button"
                  onClick={handleOtpSubmit}
                  disabled={isCheckingOut || !otpCode}
                  className="w-full py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer disabled:opacity-50"
                >
                  Verify OTP & Complete Purchase
                </button>
              </div>
            )}

            {/* Action Buttons */}
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setCheckoutStep('SELECT')}
                disabled={isCheckingOut}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecutePurchase}
                disabled={isCheckingOut || !customerPhone || needsOtp}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all shadow-lg shadow-amber-500/20 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isCheckingOut ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <span>Authorize GHS {selectedPackage.priceGhs.toFixed(2)}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Completed Order & Real-Time Receipt Modal */}
      {checkoutStep === 'RECEIPT' && completedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto mb-3">
              <Check className="w-8 h-8" />
            </div>

            <span className="text-xs font-bold text-emerald-400 font-mono uppercase tracking-wider">
              Transaction Successful & Dispatched
            </span>
            <h3 className="text-xl font-black text-white mt-1">
              Bundle Dispatched in Real-Time!
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              The amount was deducted via Paystack and delivered via Hubtel Core Gateway.
            </p>

            {/* Receipt Summary Card */}
            <div className="mt-5 p-4 bg-slate-950 border border-slate-800 rounded-2xl text-left space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Order Ref:</span>
                <strong className="text-white font-mono">{completedOrder.id}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Recipient Phone:</span>
                <strong className="text-amber-400 font-mono">{completedOrder.customerPhone}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Network Switch:</span>
                <strong className="text-white uppercase">{completedOrder.network} Ghana</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Product:</span>
                <span className="text-white">{completedOrder.packageName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Amount Paid:</span>
                <strong className="text-white font-mono">GHS {completedOrder.amountGhs.toFixed(2)}</strong>
              </div>
              <div className="pt-2 border-t border-slate-800 flex justify-between">
                <span className="text-slate-400">Paystack Ref:</span>
                <span className="text-slate-300 font-mono truncate max-w-[180px]">
                  {completedOrder.paystackReference || 'PS-OK'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Hubtel Dispatch Ref:</span>
                <span className="text-slate-300 font-mono truncate max-w-[180px]">
                  {completedOrder.hubtelTransactionId}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Delivery Status:</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold text-[10px]">
                  DELIVERED INSTANTLY
                </span>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setCheckoutStep('SELECT');
                  setSelectedPackage(null);
                  setCompletedOrder(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all shadow-md cursor-pointer"
              >
                Buy Another Bundle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
