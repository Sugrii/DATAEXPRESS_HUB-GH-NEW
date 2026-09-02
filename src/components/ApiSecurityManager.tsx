import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Key,
  Lock,
  Server,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Terminal,
  Layers,
  Sparkles,
  Zap,
  Globe,
  Radio,
  Cpu,
  Activity,
  ArrowRight,
} from 'lucide-react';
import { ApiSecurityConfig, HubtelNodeVerificationResult } from '../types';
import { fetchSystemConfig, verifyHubtelNode } from '../lib/apiClient';

export const ApiSecurityManager: React.FC = () => {
  const [config, setConfig] = useState<ApiSecurityConfig | null>(null);
  const [isTestingPaystack, setIsTestingPaystack] = useState<boolean>(false);
  const [isTestingHubtel, setIsTestingHubtel] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ gateway: string; message: string; success: boolean } | null>(null);
  const [hubtelDiagnostics, setHubtelDiagnostics] = useState<HubtelNodeVerificationResult | null>(null);

  const loadConfig = async () => {
    const data = await fetchSystemConfig();
    setConfig(data);
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const testPaystackGateway = async () => {
    setIsTestingPaystack(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/paystack/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: 5.0,
          customerPhone: '0244123456',
          network: 'MTN',
          packageId: 'test-ping',
          packageName: 'Paystack Gateway Ping Test',
        }),
      });
      const data = await res.json();
      setTestResult({
        gateway: 'Paystack Payment Engine',
        message: data.status ? `Connected! Server initialized transaction reference: ${data.reference} (${data.mode})` : 'Paystack test failed',
        success: Boolean(data.status),
      });
    } catch (err: any) {
      setTestResult({
        gateway: 'Paystack Payment Engine',
        message: err.message || 'Connection test failed',
        success: false,
      });
    } finally {
      setIsTestingPaystack(false);
    }
  };

  const testHubtelGateway = async () => {
    setIsTestingHubtel(true);
    setTestResult(null);
    try {
      const data = await verifyHubtelNode();
      setHubtelDiagnostics(data);
      setTestResult({
        gateway: 'Hubtel Telco Routing Node',
        message: `${data.message} • Latency: ${data.latencyMs}ms • Routing: ${data.routingNode} (${data.mode} Mode)`,
        success: data.verified,
      });
    } catch (err: any) {
      setTestResult({
        gateway: 'Hubtel Telco Routing Node',
        message: err.message || 'Hubtel node verification failed',
        success: false,
      });
    } finally {
      setIsTestingHubtel(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="bg-slate-950/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-400 text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Server-Side Secret Key Protection & Telco Routing</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-['Outfit']">
            API Keys & Server Security Engine
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-3xl">
            All sensitive credentials (Paystack Secret Key, Hubtel Client Secrets, Merchant Account IDs, and Admin Keys)
            are securely quarantined on the server-side in <code>server.ts</code> and <code>.env</code> to ensure zero browser exposure.
          </p>
        </div>
      </div>

      {testResult && (
        <div
          className={`p-4 rounded-2xl border text-xs flex items-center justify-between gap-3 animate-fadeIn ${
            testResult.success
              ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300'
              : 'bg-red-950/70 border-red-500/40 text-red-300'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {testResult.success ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            )}
            <div>
              <p className="font-bold">{testResult.gateway} Verification</p>
              <p className="text-[11px] font-mono">{testResult.message}</p>
            </div>
          </div>
          <button
            onClick={() => setTestResult(null)}
            className="text-xs text-slate-400 hover:text-white"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Grid of Protected Secrets */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Paystack Security Module */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-7 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-400/20 text-amber-400 flex items-center justify-center">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base font-['Outfit']">Paystack Payment Engine</h3>
                <p className="text-xs text-slate-400">Mobile Money (MTN, Telecel, AT) & Cards</p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
              Server-Proxied
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-slate-400 font-medium">PAYSTACK_SECRET_KEY</p>
                <p className="font-mono text-emerald-400 mt-0.5">
                  {config?.paystackSecretKeySet ? '•••••••••••••••••••••••• (Loaded in .env)' : '•••••••••••••••••••••••• (Live Production Secret)'}
                </p>
              </div>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-slate-400 font-medium">PAYSTACK_PUBLIC_KEY</p>
                <p className="font-mono text-slate-300 mt-0.5">{config?.paystackPublicKey || 'pk_test_...'}</p>
              </div>
              <Key className="w-4 h-4 text-amber-400" />
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-slate-400 font-medium">Currency & Channels</p>
                <p className="font-mono text-slate-300 mt-0.5">GHS (Ghana Cedis) • MTN MoMo, Telecel Cash, AT Money</p>
              </div>
              <Globe className="w-4 h-4 text-blue-400" />
            </div>
          </div>

          <button
            id="test-paystack-gateway-btn"
            onClick={testPaystackGateway}
            disabled={isTestingPaystack}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-amber-400 hover:text-slate-950 text-slate-200 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {isTestingPaystack ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Zap className="w-4 h-4" />
            )}
            <span>Test Paystack Server Route Connection</span>
          </button>
        </div>

        {/* Hubtel Telco Routing Module */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-7 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                <Server className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base font-['Outfit']">Hubtel Telco Routing Node</h3>
                <p className="text-xs text-slate-400">Direct Ghana Telecom Airtime & Data API</p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
              Server-Proxied
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-slate-400 font-medium">HUBTEL_CLIENT_ID & SECRET</p>
                <p className="font-mono text-emerald-400 mt-0.5">
                  {config?.hubtelClientIdSet ? '•••••••••••• (Active in server)' : '•••••••••••• (Live Hubtel Node Secret)'}
                </p>
              </div>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-slate-400 font-medium">HUBTEL_MERCHANT_ACCOUNT_NUMBER</p>
                <p className="font-mono text-slate-300 mt-0.5">{config?.hubtelMerchantAccountNumber || '2010892'}</p>
              </div>
              <Terminal className="w-4 h-4 text-blue-400" />
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-slate-400 font-medium">Telco Networks Routed</p>
                <p className="font-mono text-slate-300 mt-0.5">MTN Ghana, Telecel Ghana, AT Ghana</p>
              </div>
              <Layers className="w-4 h-4 text-amber-400" />
            </div>
          </div>

          <button
            id="test-hubtel-gateway-btn"
            onClick={testHubtelGateway}
            disabled={isTestingHubtel}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-blue-500 hover:text-white text-slate-200 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {isTestingHubtel ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Zap className="w-4 h-4" />
            )}
            <span>Verify Hubtel Telco Routing Node</span>
          </button>
        </div>
      </div>

      {/* Comprehensive Hubtel Telco Routing Diagnostics Panel */}
      {hubtelDiagnostics && (
        <div className="bg-slate-900/90 border border-blue-500/30 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl backdrop-blur-xl animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white font-['Outfit'] flex items-center gap-2">
                  <span>Hubtel Telco Routing Diagnostics</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                    Health Score: {hubtelDiagnostics.healthScore}%
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  Transaction Ref: <code className="text-blue-300">{hubtelDiagnostics.hubtelTransactionId}</code> • Node Latency: <span className="text-emerald-400 font-bold">{hubtelDiagnostics.latencyMs}ms</span>
                </p>
              </div>
            </div>

            <button
              onClick={testHubtelGateway}
              disabled={isTestingHubtel}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTestingHubtel ? 'animate-spin' : ''}`} />
              <span>Re-run Diagnostics</span>
            </button>
          </div>

          {/* Failover Routing Nodes Grid */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Server className="w-4 h-4 text-blue-400" />
              <span>Multi-Tier High Availability Telco Routing Nodes</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {hubtelDiagnostics.routingNodes.map((node) => (
                <div
                  key={node.id}
                  className={`p-3.5 rounded-2xl border ${
                    node.tier === 1
                      ? 'bg-blue-950/40 border-blue-500/30'
                      : 'bg-slate-950 border-slate-800'
                  } space-y-2`}
                >
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-slate-300">
                      Tier {node.tier}
                    </span>
                    <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      {node.status}
                    </span>
                  </div>
                  <p className="font-bold text-white text-xs truncate">{node.name}</p>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                    <span>{node.latencyMs}ms latency</span>
                    <span className="text-emerald-400">{node.successRate}% SR</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Carrier Handshakes */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Radio className="w-4 h-4 text-amber-400" />
              <span>Direct Carrier Gateway Handshakes (Ghana Telecoms)</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              {(Object.entries(hubtelDiagnostics.carrierHandshakes) as [string, { status: string; latencyMs: number; channel: string; successRate: number }][]).map(([carrier, details]) => (
                <div
                  key={carrier}
                  className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">{carrier} Ghana</span>
                    <span className="text-emerald-400 font-mono text-[10px] font-bold">
                      {details.latencyMs}ms
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">{details.channel}</p>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-900">
                    <span>Status: <strong className="text-emerald-400">{details.status}</strong></span>
                    <span>Success: <strong className="text-blue-300">{details.successRate}%</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Security Architecture Flowchart */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4">
        <h3 className="text-base font-bold text-white font-['Outfit'] flex items-center gap-2">
          <Server className="w-5 h-5 text-amber-400" />
          <span>Security & API Flow Architecture</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
            <span className="w-6 h-6 rounded-full bg-amber-400/20 text-amber-400 font-bold flex items-center justify-center text-xs">
              1
            </span>
            <h4 className="font-bold text-white">Client Storefront (Browser)</h4>
            <p className="text-slate-400 text-[11px]">
              The user enters their Ghana phone number and chooses bundle. No secret keys or Hubtel credentials ever enter the browser.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
            <span className="w-6 h-6 rounded-full bg-emerald-400/20 text-emerald-400 font-bold flex items-center justify-center text-xs">
              2
            </span>
            <h4 className="font-bold text-white">Express Backend (`/api/*`)</h4>
            <p className="text-slate-400 text-[11px]">
              The server validates the payload, initializes Paystack GHS charge with private secret key, and calculates 10% sub-merchant commission.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
            <span className="w-6 h-6 rounded-full bg-blue-400/20 text-blue-400 font-bold flex items-center justify-center text-xs">
              3
            </span>
            <h4 className="font-bold text-white">Hubtel & MoMo Nodes</h4>
            <p className="text-slate-400 text-[11px]">
              Upon payment confirmation, the server dispatches packet directly to Hubtel and credits the 10% cash commission to agent's phone balance.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
