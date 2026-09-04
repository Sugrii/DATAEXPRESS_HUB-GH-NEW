import React, { useState } from 'react';
import { UserProfile, SubMerchant } from '../types';
import { Shield, User, X, Check, Key } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: UserProfile) => void;
  agents: SubMerchant[];
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  agents,
}) => {
  const [selectedRole, setSelectedRole] = useState<'customer' | 'agent' | 'admin'>('customer');
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [selectedAgentId, setSelectedAgentId] = useState(agents[0]?.id || '');

  if (!isOpen) return null;

  const handleDemoPreset = (role: 'customer' | 'agent' | 'admin') => {
    setSelectedRole(role);
    if (role === 'customer') {
      setEmail('subscriber@ghanatelecom.com');
      setDisplayName('Ama Osei');
    } else if (role === 'agent') {
      const ag = agents[0];
      setEmail(ag?.email || 'agent.circle@ghanatelecom.com');
      setDisplayName(ag?.name || 'Kofi Mensah');
      if (ag) setSelectedAgentId(ag.id);
    } else {
      setEmail('admin@telecom.hubtel.com');
      setDisplayName('System Operations Admin');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const user: UserProfile = {
      uid: `USER-${Date.now().toString().slice(-6)}`,
      email: email || `${selectedRole}@ghanatelecom.com`,
      displayName: displayName || (selectedRole === 'admin' ? 'Operations Admin' : 'Demo User'),
      role: selectedRole,
      agentId: selectedRole === 'agent' ? selectedAgentId : undefined,
    };
    onLoginSuccess(user);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Telecom Account Portal</h3>
              <p className="text-xs text-slate-400">Switch workspace profile or sign in</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Role Quick Selector */}
        <div className="mt-4">
          <label className="text-xs font-bold text-slate-300 block mb-1.5">Select Role Preset</label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleDemoPreset('customer')}
              className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                selectedRole === 'customer'
                  ? 'bg-amber-500/10 border-amber-500 text-amber-400'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              Subscriber
            </button>
            <button
              type="button"
              onClick={() => handleDemoPreset('agent')}
              className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                selectedRole === 'agent'
                  ? 'bg-amber-500/10 border-amber-500 text-amber-400'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              Sub-Merchant
            </button>
            <button
              type="button"
              onClick={() => handleDemoPreset('admin')}
              className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                selectedRole === 'admin'
                  ? 'bg-amber-500/10 border-amber-500 text-amber-400'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              Admin
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">Display Name</label>
            <input
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Kwame Mensah"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. kwame@example.com"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          {selectedRole === 'agent' && (
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Link Registered Outlet</label>
              <select
                value={selectedAgentId}
                onChange={(e) => setSelectedAgentId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              >
                {agents.map((ag) => (
                  <option key={ag.id} value={ag.id}>
                    {ag.businessName} ({ag.name})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all shadow-md shadow-amber-500/20 cursor-pointer"
            >
              Access Workspace
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
