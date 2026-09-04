import React, { useState } from 'react';
import { SubMerchant } from '../types';
import { UserCheck, Search, Check, X, ShieldCheck, Store, ArrowRight, ExternalLink } from 'lucide-react';
import { useToastNotification } from '../context/ToastNotificationContext';

interface AgentSelectModalProps {
  isOpen?: boolean;
  agents: SubMerchant[];
  selectedAgent: SubMerchant | null;
  onSelectAgent: (agent: SubMerchant | null) => void;
  onClose: () => void;
  onNavigateToTab?: (tab: 'storefront' | 'agent-portal' | 'admin' | 'security' | 'ussd' | 'history' | 'analytics' | 'retry-service') => void;
}

export const AgentSelectModal: React.FC<AgentSelectModalProps> = ({
  isOpen = true,
  agents,
  selectedAgent,
  onSelectAgent,
  onClose,
  onNavigateToTab,
}) => {
  if (!isOpen) return null;

  const { addToast } = useToastNotification();
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = agents.filter(
    (a) =>
      a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.phone.includes(searchTerm)
  );

  const handleSelectDirect = () => {
    onSelectAgent(null);
    if (onNavigateToTab) {
      onNavigateToTab('storefront');
    }
    addToast('info', 'Direct Platform Purchases', 'Switched to Direct Platform Purchases. Standard network rates apply with no reseller commission.');
    onClose();
  };

  const handleSelectAgentItem = (agent: SubMerchant) => {
    onSelectAgent(agent);
    if (onNavigateToTab) {
      onNavigateToTab('storefront');
    }
    addToast('success', 'Sub-Merchant Selected', `Purchases now attributed to ${agent.businessName} (${agent.commissionRate}% commission).`);
    onClose();
  };

  const handleOpenAgentPortal = () => {
    if (onNavigateToTab) {
      onNavigateToTab('agent-portal');
    }
    onClose();
  };

  const handleCloseToStorefront = () => {
    if (onNavigateToTab) {
      onNavigateToTab('storefront');
    }
    onClose();
  };

  return (
    <div
      id="agent-select-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="agent-select-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleCloseToStorefront();
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl flex flex-col max-h-[85vh] relative">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 id="agent-select-modal-title" className="text-base font-bold text-white">
                Select Sub-Merchant Channel
              </h3>
              <p className="text-xs text-slate-400">
                Choose a registered reseller agent or buy directly from Ghana Telecom
              </p>
            </div>
          </div>
          <button
            id="close-agent-select-modal-btn"
            type="button"
            onClick={handleCloseToStorefront}
            aria-label="Close modal and show main store"
            className="text-slate-400 hover:text-white p-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="mt-4 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            id="agent-search-input"
            type="text"
            placeholder="Search by agent name, outlet, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500 font-sans"
          />
        </div>

        {/* Channel Options */}
        <div className="mt-4 space-y-2.5 overflow-y-auto pr-1 flex-1">
          {/* Option: Direct Purchase (No Agent) */}
          <button
            id="select-direct-platform-purchase-btn"
            type="button"
            onClick={handleSelectDirect}
            className={`w-full text-left p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group ${
              selectedAgent === null
                ? 'bg-amber-500/10 border-amber-500 text-white shadow-md shadow-amber-500/10'
                : 'bg-slate-950 border-slate-800 hover:border-amber-500/50 hover:bg-slate-800/50 text-slate-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-slate-800 text-amber-400 group-hover:bg-amber-500 group-hover:text-slate-950 transition-colors">
                <Store className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-xs sm:text-sm text-white flex items-center gap-2">
                  <span>Direct Platform Purchases</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono">
                    OFFICIAL
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Direct carrier switch • Standard rates • No reseller commission
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {selectedAgent === null ? (
                <div className="flex items-center gap-1 text-xs font-bold text-amber-400">
                  <Check className="w-4 h-4 text-amber-400" />
                  <span className="hidden sm:inline">Active</span>
                </div>
              ) : (
                <span className="text-xs text-slate-400 group-hover:text-amber-400 font-semibold flex items-center gap-1">
                  <span>Select</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              )}
            </div>
          </button>

          {/* List of Registered Agents */}
          {filtered.map((agent) => {
            const isSelected = selectedAgent?.id === agent.id;
            return (
              <button
                key={agent.id}
                id={`select-agent-${agent.id}-btn`}
                type="button"
                onClick={() => handleSelectAgentItem(agent)}
                className={`w-full text-left p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group ${
                  isSelected
                    ? 'bg-emerald-950/30 border-emerald-500 text-white shadow-md shadow-emerald-500/10'
                    : 'bg-slate-950 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40 text-slate-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-slate-800 text-emerald-400">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-xs sm:text-sm text-white flex items-center gap-2">
                      <span>{agent.businessName}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-amber-400 border border-slate-700 font-mono font-bold">
                        {agent.commissionRate}% comm
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5 flex flex-wrap items-center gap-2">
                      <span>Agent: {agent.name}</span>
                      <span>•</span>
                      <span className="font-mono text-slate-300">{agent.phone}</span>
                      <span>•</span>
                      <span className="text-emerald-400 font-mono">{agent.momoNetwork} MoMo</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isSelected ? (
                    <div className="flex items-center gap-1 text-xs font-bold text-emerald-400">
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span className="hidden sm:inline">Active</span>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 group-hover:text-emerald-400 font-semibold flex items-center gap-1">
                      <span>Select</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  )}
                </div>
              </button>
            );
          })}

          {filtered.length === 0 && (
            <div className="text-center py-8 text-xs text-slate-400">
              No matching agents found for &ldquo;{searchTerm}&rdquo;.
            </div>
          )}
        </div>

        {/* Footer with quick link to Agent Portal */}
        <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between text-xs">
          <span className="text-slate-400">Are you a registered reseller?</span>
          <button
            id="modal-goto-agent-portal-btn"
            type="button"
            onClick={handleOpenAgentPortal}
            className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 cursor-pointer hover:underline"
          >
            <span>Open Agent Portal</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
