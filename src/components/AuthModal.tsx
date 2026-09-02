import React, { useState } from 'react';
import {
  LogIn,
  X,
  Lock,
  Mail,
  User,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Users,
  Sparkles,
} from 'lucide-react';
import { SubMerchant, UserProfile } from '../types';

interface AuthModalProps {
  agents: SubMerchant[];
  currentUser: UserProfile | null;
  onLogin: (user: UserProfile, agent?: SubMerchant) => void;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  agents,
  currentUser,
  onLogin,
  onClose,
}) => {
  const [authMode, setAuthMode] = useState<'LOGIN' | 'AGENT_PIN' | 'REGISTER'>('LOGIN');
  const [email, setEmail] = useState<string>('admin@ghanatelecom.gh');
  const [password, setPassword] = useState<string>('••••••••');
  const [agentPin, setAgentPin] = useState<string>('');
  const [selectedAgentId, setSelectedAgentId] = useState<string>(agents[0]?.id || '');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const handleStandardLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setErrorMsg('Please enter an email address');
      return;
    }

    if (email.includes('admin')) {
      onLogin({
        uid: 'USR-ADMIN-01',
        email: email,
        displayName: 'Master Merchant Admin',
        role: 'ADMIN',
      });
    } else {
      onLogin({
        uid: `USR-CUST-${Date.now()}`,
        email: email,
        displayName: email.split('@')[0],
        role: 'CUSTOMER',
      });
    }
    onClose();
  };

  const handleAgentPinLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const agent = agents.find((a) => a.id === selectedAgentId);
    if (!agent) {
      setErrorMsg('Please select a valid sub-merchant');
      return;
    }

    if (agent.pin && agentPin && agentPin !== agent.pin && agentPin !== '1234') {
      setErrorMsg(`Incorrect PIN. (Default test PIN is 1234 or ${agent.pin})`);
      return;
    }

    onLogin(
      {
        uid: `USR-${agent.id}`,
        email: agent.email,
        displayName: agent.name,
        role: 'AGENT',
        agentId: agent.id,
      },
      agent
    );
    onClose();
  };

  // Quick Demo Profiles
  const selectDemoProfile = (type: 'ADMIN' | 'AGENT_1' | 'AGENT_2' | 'CUSTOMER') => {
    if (type === 'ADMIN') {
      onLogin({
        uid: 'USR-ADMIN-01',
        email: 'admin@ghanatelecom.gh',
        displayName: 'Master Merchant (Admin)',
        role: 'ADMIN',
      });
    } else if (type === 'AGENT_1' && agents[0]) {
      onLogin(
        {
          uid: `USR-${agents[0].id}`,
          email: agents[0].email,
          displayName: agents[0].name,
          role: 'AGENT',
          agentId: agents[0].id,
        },
        agents[0]
      );
    } else if (type === 'AGENT_2' && agents[1]) {
      onLogin(
        {
          uid: `USR-${agents[1].id}`,
          email: agents[1].email,
          displayName: agents[1].name,
          role: 'AGENT',
          agentId: agents[1].id,
        },
        agents[1]
      );
    } else {
      onLogin({
        uid: 'USR-CUST-DEMO',
        email: 'customer.gh@gmail.com',
        displayName: 'Regular Customer',
        role: 'CUSTOMER',
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-amber-400/10 text-amber-400 text-[10px] font-semibold">
            <ShieldCheck className="w-3 h-3" />
            <span>Firebase & Local Authentication</span>
          </div>
          <h3 className="text-xl font-extrabold text-white font-['Outfit']">
            Sign In to Ghana Telecom
          </h3>
          <p className="text-xs text-slate-400">
            Access your sub-merchant dashboard, admin tools, or customer account
          </p>
        </div>

        {/* Auth Mode Toggle */}
        <div className="grid grid-cols-2 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
          <button
            onClick={() => setAuthMode('LOGIN')}
            className={`py-2 rounded-lg transition-all ${
              authMode === 'LOGIN' ? 'bg-amber-400 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Email Login
          </button>
          <button
            onClick={() => setAuthMode('AGENT_PIN')}
            className={`py-2 rounded-lg transition-all ${
              authMode === 'AGENT_PIN' ? 'bg-amber-400 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Sub-Agent PIN
          </button>
        </div>

        {/* Email Login Form */}
        {authMode === 'LOGIN' && (
          <form onSubmit={handleStandardLogin} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-amber-400 focus:outline-none"
                  placeholder="admin@ghanatelecom.gh"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-amber-400 focus:outline-none"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs shadow-lg shadow-amber-400/20 transition-all cursor-pointer"
            >
              Sign In
            </button>
          </form>
        )}

        {/* Agent PIN Quick Login */}
        {authMode === 'AGENT_PIN' && (
          <form onSubmit={handleAgentPinLogin} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Select Sub-Merchant Account</label>
              <select
                value={selectedAgentId}
                onChange={(e) => setSelectedAgentId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-amber-400 focus:outline-none"
              >
                {agents.map((ag) => (
                  <option key={ag.id} value={ag.id}>
                    {ag.businessName} ({ag.phone} - {ag.network})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">4-Digit Agent PIN</label>
              <input
                type="password"
                maxLength={4}
                required
                value={agentPin}
                onChange={(e) => setAgentPin(e.target.value)}
                placeholder="1234"
                className="w-full py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-center tracking-widest text-base focus:ring-2 focus:ring-amber-400 focus:outline-none"
              />
              <p className="text-[10px] text-slate-400 mt-1 text-center">Test PIN is 1234</p>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
            >
              Access Sub-Merchant Database
            </button>
          </form>
        )}

        {/* Quick Demo Switcher */}
        <div className="pt-2 border-t border-slate-800 space-y-2">
          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
            Quick 1-Click Demo Profiles:
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => selectDemoProfile('ADMIN')}
              className="p-2 rounded-xl bg-slate-800 hover:bg-amber-400 hover:text-slate-950 text-slate-300 text-[11px] font-semibold transition-all border border-slate-700"
            >
              Master Admin
            </button>
            <button
              onClick={() => selectDemoProfile('AGENT_1')}
              className="p-2 rounded-xl bg-slate-800 hover:bg-emerald-400 hover:text-slate-950 text-slate-300 text-[11px] font-semibold transition-all border border-slate-700"
            >
              Kofi (Sub-Agent 1)
            </button>
            <button
              onClick={() => selectDemoProfile('AGENT_2')}
              className="p-2 rounded-xl bg-slate-800 hover:bg-rose-400 hover:text-slate-950 text-slate-300 text-[11px] font-semibold transition-all border border-slate-700"
            >
              Ama (Sub-Agent 2)
            </button>
            <button
              onClick={() => selectDemoProfile('CUSTOMER')}
              className="p-2 rounded-xl bg-slate-800 hover:bg-blue-400 hover:text-slate-950 text-slate-300 text-[11px] font-semibold transition-all border border-slate-700"
            >
              Customer Mode
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
