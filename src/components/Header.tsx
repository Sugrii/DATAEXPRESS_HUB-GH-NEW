import React, { useEffect, useState } from 'react';
import {
  Zap,
  Radio,
  ShieldCheck,
  Store,
  Users,
  CreditCard,
  PhoneCall,
  LogIn,
  LogOut,
  UserCheck,
  Sparkles,
  RefreshCw,
  Sliders,
  History,
  TrendingUp,
  RotateCw,
  Volume2,
  VolumeX,
  BellRing,
  Sun,
  Moon,
} from 'lucide-react';
import { NetworkHealth, SubMerchant, UserProfile } from '../types';
import { fetchNetworkHealth } from '../lib/apiClient';
import { useToastNotification } from '../context/ToastNotificationContext';
import { useTheme } from '../context/ThemeContext';

interface HeaderProps {
  currentTab: 'storefront' | 'agent-portal' | 'admin' | 'security' | 'ussd' | 'history' | 'analytics' | 'retry-service';
  onSelectTab: (tab: 'storefront' | 'agent-portal' | 'admin' | 'security' | 'ussd' | 'history' | 'analytics' | 'retry-service') => void;
  selectedAgent: SubMerchant | null;
  onOpenAgentModal: () => void;
  currentUser: UserProfile | null;
  onOpenAuthModal: () => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  selectedAgent,
  onOpenAgentModal,
  currentUser,
  onOpenAuthModal,
  onLogout,
}) => {
  const [networkHealth, setNetworkHealth] = useState<NetworkHealth[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { soundEnabled, setSoundEnabled, listenerActive } = useToastNotification();
  const { theme, toggleTheme, isDark } = useTheme();

  const loadHealth = async () => {
    setIsRefreshing(true);
    const data = await fetchNetworkHealth();
    setNetworkHealth(data.networks);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  useEffect(() => {
    loadHealth();
    const interval = setInterval(loadHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
      {/* Top Telemetry & Network Status Bar */}
      <div className="bg-slate-950/80 px-4 py-1.5 border-b border-slate-800/80 text-xs flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 font-medium text-emerald-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>Ghana Telecom Gateways:</span>
          </div>

          <div className="flex items-center gap-3">
            {networkHealth.map((net) => (
              <div
                key={net.network}
                className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-900 border border-slate-800"
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    net.network === 'MTN'
                      ? 'bg-amber-400'
                      : net.network === 'TELECEL'
                      ? 'bg-rose-500'
                      : 'bg-blue-500'
                  }`}
                />
                <span className="font-semibold text-slate-300">{net.network}</span>
                <span className="text-emerald-400 font-mono text-[10px]">{net.latencyMs}ms</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Firestore Real-time Stream Status */}
          <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[11px] text-slate-300">
            <Radio className={`w-3 h-3 ${listenerActive ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
            <span>Firestore Stream:</span>
            <span className={listenerActive ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
              {listenerActive ? 'Live' : 'Offline'}
            </span>
          </div>

          {/* Quick Sound Chime Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-300 transition-colors"
            title={soundEnabled ? 'Live completed order chime sound is ON' : 'Chime sound is muted'}
          >
            {soundEnabled ? (
              <Volume2 className="w-3 h-3 text-amber-400" />
            ) : (
              <VolumeX className="w-3 h-3 text-slate-500" />
            )}
            <span className="hidden sm:inline">{soundEnabled ? 'Chime ON' : 'Muted'}</span>
          </button>

          <div className="flex items-center gap-1 text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            <span>Paystack & Hubtel:</span>
            <span className="text-emerald-400 font-medium">10% Comm</span>
          </div>
          <button
            onClick={loadHealth}
            title="Refresh Gateway Health"
            className="text-slate-400 hover:text-slate-200 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo & Platform Name */}
          <div
            onClick={() => onSelectTab('storefront')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform">
              <Zap className="w-6 h-6 text-slate-950 font-bold" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-white font-['Outfit'] tracking-tight">
                  Ghana<span className="text-amber-400">Telecom</span>
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-400/10 text-amber-400 border border-amber-400/20">
                  Hub
                </span>
              </div>
              <p className="text-xs text-slate-400">MTN • Telecel • AT • Sub-Merchants</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800">
            <button
              id="tab-storefront-btn"
              onClick={() => onSelectTab('storefront')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                currentTab === 'storefront'
                  ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Store className="w-4 h-4" />
              <span>Buy Bundles & Airtime</span>
            </button>

            <button
              id="tab-agent-portal-btn"
              onClick={() => onSelectTab('agent-portal')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                currentTab === 'agent-portal'
                  ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Sub-Merchant Portal</span>
              <span className="bg-emerald-500/20 text-emerald-300 text-[10px] px-1.5 py-0.2 rounded border border-emerald-500/30">
                10% Comm
              </span>
            </button>

            <button
              id="tab-admin-btn"
              onClick={() => onSelectTab('admin')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                currentTab === 'admin'
                  ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>Admin Console</span>
            </button>

            <button
              id="tab-history-btn"
              onClick={() => onSelectTab('history')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                currentTab === 'history'
                  ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Sales History</span>
            </button>

            <button
              id="tab-analytics-btn"
              onClick={() => onSelectTab('analytics')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                currentTab === 'analytics'
                  ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span>Commission Analytics</span>
              <span className="bg-amber-400/20 text-amber-300 text-[10px] px-1.5 py-0.2 rounded border border-amber-400/30">
                10%
              </span>
            </button>

            <button
              id="tab-security-btn"
              onClick={() => onSelectTab('security')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                currentTab === 'security'
                  ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>Paystack & Hubtel</span>
            </button>

            <button
              id="tab-retry-service-btn"
              onClick={() => onSelectTab('retry-service')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                currentTab === 'retry-service'
                  ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <RotateCw className="w-4 h-4" />
              <span>Auto-Retry Engine</span>
              <span className="bg-emerald-500/20 text-emerald-300 text-[10px] px-1.5 py-0.2 rounded border border-emerald-500/30 animate-pulse">
                Failover
              </span>
            </button>

            <button
              id="tab-ussd-btn"
              onClick={() => onSelectTab('ussd')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                currentTab === 'ussd'
                  ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <PhoneCall className="w-4 h-4" />
              <span>USSD Codes</span>
            </button>
          </nav>

          {/* Right Action: Active Sub-Merchant Indicator & User Auth */}
          <div className="flex items-center gap-3">
            {/* Active Sub-Merchant Badge */}
            {selectedAgent ? (
              <button
                onClick={onOpenAgentModal}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 transition-all text-left"
              >
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <div className="text-xs">
                  <p className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider">
                    Agent Storefront
                  </p>
                  <p className="font-bold text-white truncate max-w-[120px]">
                    {selectedAgent.businessName}
                  </p>
                </div>
              </button>
            ) : (
              <button
                onClick={onOpenAgentModal}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-all"
              >
                <Users className="w-3.5 h-3.5 text-amber-400" />
                <span>Select Sub-Merchant</span>
              </button>
            )}

            {/* User Auth Profile Button */}
            {currentUser ? (
              <div className="flex items-center gap-2">
                <div className="px-3 py-1 rounded-lg bg-slate-800 border border-slate-700 text-xs">
                  <p className="font-semibold text-white">{currentUser.displayName || currentUser.email}</p>
                  <p className="text-[10px] text-amber-400 uppercase font-bold">{currentUser.role}</p>
                </div>
                <button
                  id="logout-btn"
                  onClick={onLogout}
                  title="Logout"
                  className="p-2 rounded-lg bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-slate-700 transition-all"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                id="login-btn"
                onClick={onOpenAuthModal}
                className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all"
              >
                <LogIn className="w-4 h-4 text-amber-400" />
                <span>Sign In / Sub-Agent</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Sub-Navigation */}
        <div className="flex md:hidden overflow-x-auto py-2 gap-2 border-t border-slate-800 scrollbar-none">
          <button
            onClick={() => onSelectTab('storefront')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${
              currentTab === 'storefront' ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-300'
            }`}
          >
            Buy Bundles
          </button>
          <button
            onClick={() => onSelectTab('agent-portal')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${
              currentTab === 'agent-portal' ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-300'
            }`}
          >
            Sub-Merchant (10% Comm)
          </button>
          <button
            onClick={() => onSelectTab('admin')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${
              currentTab === 'admin' ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-300'
            }`}
          >
            Admin
          </button>
          <button
            onClick={() => onSelectTab('history')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${
              currentTab === 'history' ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-300'
            }`}
          >
            History
          </button>
          <button
            onClick={() => onSelectTab('analytics')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${
              currentTab === 'analytics' ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-300'
            }`}
          >
            Analytics (10%)
          </button>
          <button
            onClick={() => onSelectTab('security')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${
              currentTab === 'security' ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-300'
            }`}
          >
            Paystack & Hubtel
          </button>
          <button
            onClick={() => onSelectTab('retry-service')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${
              currentTab === 'retry-service' ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-300'
            }`}
          >
            Auto-Retry (Failover)
          </button>
          <button
            onClick={() => onSelectTab('ussd')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${
              currentTab === 'ussd' ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-300'
            }`}
          >
            USSD
          </button>
        </div>
      </div>
    </header>
  );
};
