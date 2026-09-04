import React, { useState, useEffect } from 'react';
import {
  Signal,
  Radio,
  Users,
  Shield,
  Layers,
  PhoneCall,
  History,
  TrendingUp,
  RefreshCw,
  Volume2,
  VolumeX,
  Sun,
  Moon,
  Store,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
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
  onOpenBulkModal: () => void;
  currentUser: UserProfile | null;
  onOpenAuthModal: () => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  selectedAgent,
  onOpenAgentModal,
  onOpenBulkModal,
  currentUser,
  onOpenAuthModal,
  onLogout,
}) => {
  const [networkHealth, setNetworkHealth] = useState<NetworkHealth[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { soundEnabled, setSoundEnabled } = useToastNotification();
  const { theme, toggleTheme, isDark } = useTheme();

  const loadHealth = async () => {
    setIsRefreshing(true);
    try {
      const data = await fetchNetworkHealth();
      setNetworkHealth(data);
    } catch (e) {
      console.warn(e);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadHealth();
    const interval = setInterval(loadHealth, 45000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 transition-colors duration-200">
      {/* Top Banner: Network Status & Toggles */}
      <div className="border-b border-slate-800/80 px-4 py-1.5 text-xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-slate-400">
              <Signal className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span className="font-semibold text-slate-200">Telecom Core Node:</span>
              <span className="text-emerald-400 font-mono">Hubtel Direct Switch (Online)</span>
            </div>

            <div className="hidden md:flex items-center gap-2 pl-3 border-l border-slate-800">
              {networkHealth.map((net) => (
                <span
                  key={net.network}
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-300"
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      net.network === 'MTN'
                        ? 'bg-amber-400'
                        : net.network === 'TELECEL'
                        ? 'bg-red-500'
                        : 'bg-blue-400'
                    }`}
                  />
                  {net.network}: {net.successRate}%
                </span>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2.5 ml-auto">
            {/* Theme Toggle Button */}
            <button
              id="header-theme-toggle-btn"
              onClick={toggleTheme}
              aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
              title={`Switch to ${isDark ? 'light' : 'dark'} mode for improved accessibility`}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-all duration-200 cursor-pointer text-[11px] font-medium shadow-sm"
            >
              {isDark ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400 transition-transform hover:rotate-45" />
                  <span className="hidden sm:inline">Light Mode</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-indigo-400 transition-transform hover:-rotate-12" />
                  <span className="hidden sm:inline">Dark Mode</span>
                </>
              )}
            </button>

            {/* Sound Toggle */}
            <button
              id="header-sound-toggle-btn"
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              aria-label={soundEnabled ? 'Disable chime sound' : 'Enable chime sound'}
              title={soundEnabled ? 'Chime sound enabled' : 'Chime sound muted'}
              className="p-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-amber-400" /> : <VolumeX className="w-3.5 h-3.5" />}
            </button>

            {/* Health Refresh */}
            <button
              id="header-health-refresh-btn"
              type="button"
              onClick={loadHealth}
              disabled={isRefreshing}
              aria-label="Refresh telecom gateway health"
              className="p-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-50 cursor-pointer"
              title="Refresh telecom gateway health"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Header Bar */}
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Brand Logo & Tagline */}
          <button
            type="button"
            className="flex items-center gap-3 text-left cursor-pointer group focus:outline-none focus:ring-2 focus:ring-amber-500 rounded-2xl p-1 -m-1"
            onClick={() => onSelectTab('storefront')}
            aria-label="Go to Ghana Telecom Storefront"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform">
              <Radio className="w-5 h-5 text-slate-950 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight text-white font-sans">GHANA TELECOM</span>
                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-amber-400/10 border border-amber-400/30 text-amber-400">
                  HUBTEL DIRECT
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Direct Carrier Node • Instant MoMo Auto-Fulfillment
              </p>
            </div>
          </button>

          {/* Quick Actions: Selected Agent & Bulk Purchase */}
          <div className="flex items-center gap-2">
            <button
              id="header-select-agent-btn"
              type="button"
              onClick={onOpenAgentModal}
              aria-label={`Current channel: ${selectedAgent ? selectedAgent.businessName : 'Direct Portal'}. Click to change.`}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                selectedAgent
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
              }`}
            >
              <UserCheck className="w-4 h-4 text-emerald-400" />
              <div className="text-left hidden sm:block">
                <div className="text-[10px] text-slate-400 uppercase leading-none">Agent Channel</div>
                <div className="truncate max-w-[120px] font-bold">
                  {selectedAgent ? selectedAgent.businessName : 'Direct Portal'}
                </div>
              </div>
            </button>

            <button
              id="header-bulk-purchase-btn"
              type="button"
              onClick={onOpenBulkModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold transition-all cursor-pointer"
            >
              <Layers className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">Bulk Top-Up</span>
            </button>

            {currentUser ? (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
                <div className="hidden md:block text-right">
                  <div className="text-xs font-bold text-slate-200">{currentUser.displayName}</div>
                  <div className="text-[10px] text-amber-400 uppercase">{currentUser.role}</div>
                </div>
                <button
                  type="button"
                  onClick={onLogout}
                  className="px-2.5 py-1 text-xs rounded-lg bg-slate-900 border border-slate-800 text-rose-400 hover:bg-rose-950/30 transition-colors cursor-pointer"
                >
                  Logout
                </button>
              </div>
            ) : (
              <button
                id="header-login-btn"
                type="button"
                onClick={onOpenAuthModal}
                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all shadow-md shadow-amber-500/20 cursor-pointer"
              >
                Sign In
              </button>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="mt-3 flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar border-t border-slate-800/60 pt-2">
          <button
            id="nav-tab-storefront"
            onClick={() => onSelectTab('storefront')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
              currentTab === 'storefront'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            Storefront
          </button>

          <button
            id="nav-tab-agent-portal"
            onClick={() => onSelectTab('agent-portal')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
              currentTab === 'agent-portal'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Agent Portal
          </button>

          <button
            id="nav-tab-admin"
            onClick={() => onSelectTab('admin')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
              currentTab === 'admin'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            Admin Console
          </button>

          <button
            id="nav-tab-analytics"
            onClick={() => onSelectTab('analytics')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
              currentTab === 'analytics'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Commissions & Analytics
          </button>

          <button
            id="nav-tab-retry"
            onClick={() => onSelectTab('retry-service')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
              currentTab === 'retry-service'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Hubtel Router & Retries
          </button>

          <button
            id="nav-tab-history"
            onClick={() => onSelectTab('history')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
              currentTab === 'history'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Orders & Receipts
          </button>

          <button
            id="nav-tab-ussd"
            onClick={() => onSelectTab('ussd')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
              currentTab === 'ussd'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <PhoneCall className="w-3.5 h-3.5" />
            USSD Helper (*124#)
          </button>
        </nav>
      </div>
    </header>
  );
};
