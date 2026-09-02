import React, { useState } from 'react';
import {
  Users,
  X,
  CheckCircle2,
  PlusCircle,
  Sparkles,
  Phone,
  ShieldCheck,
  Gift,
} from 'lucide-react';
import { SubMerchant, TelecomNetwork } from '../types';
import { createSubMerchant } from '../lib/firestoreService';

interface AgentSelectModalProps {
  agents: SubMerchant[];
  selectedAgent: SubMerchant | null;
  onSelectAgent: (agent: SubMerchant | null) => void;
  onClose: () => void;
}

export const AgentSelectModal: React.FC<AgentSelectModalProps> = ({
  agents,
  selectedAgent,
  onSelectAgent,
  onClose,
}) => {
  const [showCreateInline, setShowCreateInline] = useState<boolean>(false);
  const [bName, setBName] = useState<string>('');
  const [aName, setAName] = useState<string>('');
  const [aPhone, setAPhone] = useState<string>('');
  const [aNet, setANet] = useState<TelecomNetwork>('MTN');
  const [isCreating, setIsCreating] = useState<boolean>(false);

  const handleCreateAndSelect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bName || !aName || !aPhone) return;

    setIsCreating(true);
    try {
      const slug = bName.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const newAgent = await createSubMerchant({
        businessName: bName,
        name: aName,
        phone: aPhone,
        network: aNet,
        email: `${slug}@ghanatelecom.gh`,
        pin: '1234',
        slug: slug,
        commissionRate: 10,
      });

      onSelectAgent(newAgent);
      onClose();
    } catch (err) {
      console.error('Error creating sub-merchant:', err);
    } finally {
      setIsCreating(false);
    }
  };

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

        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-semibold">
            <Gift className="w-3 h-3" />
            <span>10% Commission Referral System</span>
          </div>
          <h3 className="text-xl font-extrabold text-white font-['Outfit']">
            Select Sub-Merchant Storefront
          </h3>
          <p className="text-xs text-slate-400">
            Purchases through a sub-merchant auto-credit 10% commission to the agent's MoMo phone.
          </p>
        </div>

        {!showCreateInline ? (
          <div className="space-y-4">
            {/* Direct Platform Option */}
            <button
              onClick={() => {
                onSelectAgent(null);
                onClose();
              }}
              className={`w-full p-4 rounded-2xl border text-left transition-all flex items-center justify-between ${
                selectedAgent === null
                  ? 'bg-amber-950/40 border-amber-400 text-white'
                  : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
              }`}
            >
              <div>
                <p className="font-bold text-sm">Master Platform Direct</p>
                <p className="text-xs text-slate-400">No sub-merchant commission allocation</p>
              </div>
              {selectedAgent === null && <CheckCircle2 className="w-5 h-5 text-amber-400" />}
            </button>

            {/* List of Registered Sub-Merchants */}
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {agents.map((agent) => {
                const isSelected = selectedAgent?.id === agent.id;
                return (
                  <button
                    key={agent.id}
                    onClick={() => {
                      onSelectAgent(agent);
                      onClose();
                    }}
                    className={`w-full p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-emerald-950/40 border-emerald-400 text-white shadow-lg'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white">{agent.businessName}</span>
                        <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-500/20 text-emerald-300 font-bold">
                          10% Comm
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">
                        {agent.name} • <span className="font-mono text-slate-300">{agent.phone}</span> ({agent.network} MoMo)
                      </p>
                    </div>
                    {isSelected && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setShowCreateInline(true)}
              className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 flex items-center justify-center gap-2 transition-all"
            >
              <PlusCircle className="w-4 h-4 text-emerald-400" />
              <span>Register as a New Sub-Merchant</span>
            </button>
          </div>
        ) : (
          <form onSubmit={handleCreateAndSelect} className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Business Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Spintex Telecom Station"
                value={bName}
                onChange={(e) => setBName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Agent Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Yaw Donkor"
                  value={aName}
                  onChange={(e) => setAName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">MoMo Phone *</label>
                <input
                  type="tel"
                  required
                  placeholder="0244123456"
                  value={aPhone}
                  onChange={(e) => setAPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">MoMo Payout Network</label>
              <select
                value={aNet}
                onChange={(e) => setANet(e.target.value as TelecomNetwork)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
              >
                <option value="MTN">MTN MoMo</option>
                <option value="TELECEL">Telecel Cash</option>
                <option value="AT">AT Money</option>
              </select>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCreateInline(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={isCreating}
                className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold shadow-lg shadow-emerald-500/20"
              >
                {isCreating ? 'Creating...' : 'Create & Select Store'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
