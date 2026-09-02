import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Storefront } from './components/Storefront';
import { AgentPortal } from './components/AgentPortal';
import { AdminConsole } from './components/AdminConsole';
import { TransactionHistory } from './components/TransactionHistory';
import { CommissionAnalytics } from './components/CommissionAnalytics';
import { HubtelRetryService } from './components/HubtelRetryService';
import { ApiSecurityManager } from './components/ApiSecurityManager';
import { UssdHelper } from './components/UssdHelper';
import { ReceiptModal } from './components/ReceiptModal';
import { BulkPurchaseModal } from './components/BulkPurchaseModal';
import { AuthModal } from './components/AuthModal';
import { AgentSelectModal } from './components/AgentSelectModal';
import { ToastNotificationContainer } from './components/ToastNotificationContainer';
import { ToastNotificationProvider } from './context/ToastNotificationContext';
import { useFirestoreTransactionListener } from './lib/useFirestoreTransactionListener';
import { SubMerchant, TelecomOrder, UserProfile } from './types';
import {
  subscribeSubMerchants,
  DEFAULT_SEED_AGENTS,
} from './lib/firestoreService';
import { retryBackgroundSync } from './lib/retryBackgroundService';

function AppContent() {
  const [currentTab, setCurrentTab] = useState<'storefront' | 'agent-portal' | 'admin' | 'security' | 'ussd' | 'history' | 'analytics' | 'retry-service'>('storefront');
  const [agents, setAgents] = useState<SubMerchant[]>(DEFAULT_SEED_AGENTS);
  const [selectedAgent, setSelectedAgent] = useState<SubMerchant | null>(null);
  const [activeReceiptOrder, setActiveReceiptOrder] = useState<TelecomOrder | null>(null);

  // Modals
  const [showBulkModal, setShowBulkModal] = useState<boolean>(false);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [showAgentSelectModal, setShowAgentSelectModal] = useState<boolean>(false);

  // User Auth State
  const [currentUser, setCurrentUser] = useState<UserProfile | null>({
    uid: 'USR-MASTER-ADMIN',
    email: 'admin@ghanatelecom.gh',
    displayName: 'Master Merchant Admin',
    role: 'ADMIN',
  });

  // Attach Firestore Real-time Transaction Listener
  useFirestoreTransactionListener({ activeAgent: selectedAgent, enabled: true });

  // 1. Subscribe to Firebase Firestore Sub-Merchants & Start Auto-Retry Background Sync
  useEffect(() => {
    // Start background sync manager
    retryBackgroundSync.start();

    const unsubscribe = subscribeSubMerchants((loadedAgents) => {
      setAgents(loadedAgents);
      // Auto-resolve agent if URL param matches
      const params = new URLSearchParams(window.location.search);
      const agentSlugOrId = params.get('agent');
      if (agentSlugOrId) {
        const found = loadedAgents.find((a) => a.id === agentSlugOrId || a.slug === agentSlugOrId);
        if (found) {
          setSelectedAgent(found);
        }
      }
    });

    return () => {
      unsubscribe();
      retryBackgroundSync.stop();
    };
  }, []);

  // Handle Login
  const handleLogin = (user: UserProfile, agent?: SubMerchant) => {
    setCurrentUser(user);
    if (agent) {
      setSelectedAgent(agent);
      setCurrentTab('agent-portal');
    } else if (user.role === 'ADMIN') {
      setCurrentTab('admin');
    }
  };

  // Handle Logout
  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentTab('storefront');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-amber-400 selection:text-slate-950 font-sans">
      {/* Top Header Navigation */}
      <Header
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        selectedAgent={selectedAgent}
        onOpenAgentModal={() => setShowAgentSelectModal(true)}
        currentUser={currentUser}
        onOpenAuthModal={() => setShowAuthModal(true)}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-16">
        {currentTab === 'storefront' && (
          <Storefront
            selectedAgent={selectedAgent}
            onViewReceipt={(order) => setActiveReceiptOrder(order)}
            onOpenAgentModal={() => setShowAgentSelectModal(true)}
            onOpenBulkModal={() => setShowBulkModal(true)}
          />
        )}

        {currentTab === 'agent-portal' && (
          <AgentPortal
            agents={agents}
            activeAgent={selectedAgent}
            onSelectAgent={(agent) => setSelectedAgent(agent)}
            onViewReceipt={(order) => setActiveReceiptOrder(order)}
          />
        )}

        {currentTab === 'admin' && (
          <AdminConsole
            agents={agents}
            onSelectAgent={(agent) => {
              setSelectedAgent(agent);
              setCurrentTab('agent-portal');
            }}
            onViewReceipt={(order) => setActiveReceiptOrder(order)}
            onNavigateToAnalytics={() => setCurrentTab('analytics')}
            onNavigateToRetryService={() => setCurrentTab('retry-service')}
          />
        )}

        {currentTab === 'history' && (
          <TransactionHistory
            agentId={selectedAgent?.id}
            agentName={selectedAgent?.businessName}
            availableAgents={agents}
            onViewReceipt={(order) => setActiveReceiptOrder(order)}
            onSelectAgent={(agId) => {
              const found = agents.find((a) => a.id === agId);
              if (found) setSelectedAgent(found);
            }}
          />
        )}

        {currentTab === 'analytics' && (
          <CommissionAnalytics
            agents={agents}
            initialSelectedAgentId={selectedAgent?.id || 'ALL'}
            onSelectAgentForDetails={(agent) => {
              setSelectedAgent(agent);
            }}
            onNavigateToPortal={() => {
              setCurrentTab('agent-portal');
            }}
          />
        )}

        {currentTab === 'retry-service' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
            <HubtelRetryService
              onViewReceipt={(order) => setActiveReceiptOrder(order)}
            />
          </div>
        )}

        {currentTab === 'security' && <ApiSecurityManager />}

        {currentTab === 'ussd' && <UssdHelper />}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900/60 border-t border-slate-800/80 py-6 px-4 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Ghana Telecom Networks • Paystack Payment Gateway & Hubtel Direct Routing</span>
          </div>
          <p className="text-slate-500 text-[11px]">
            © {new Date().getFullYear()} Ghana Telecom Hub & Agent Network. Real-time Firebase Cloud Storage & 10% Commission Engine.
          </p>
        </div>
      </footer>

      {/* Modals */}
      <ReceiptModal
        order={activeReceiptOrder}
        onClose={() => setActiveReceiptOrder(null)}
      />

      {showBulkModal && (
        <BulkPurchaseModal
          selectedAgent={selectedAgent}
          onClose={() => setShowBulkModal(false)}
          onOrdersCompleted={() => {
            // refresh
          }}
        />
      )}

      {showAuthModal && (
        <AuthModal
          agents={agents}
          currentUser={currentUser}
          onLogin={handleLogin}
          onClose={() => setShowAuthModal(false)}
        />
      )}

      {showAgentSelectModal && (
        <AgentSelectModal
          agents={agents}
          selectedAgent={selectedAgent}
          onSelectAgent={(ag) => setSelectedAgent(ag)}
          onClose={() => setShowAgentSelectModal(false)}
        />
      )}

      {/* Global Real-time Firestore Toast Notification Stack */}
      <ToastNotificationContainer
        onViewReceipt={(order) => setActiveReceiptOrder(order)}
      />
    </div>
  );
}

export default function App() {
  return (
    <ToastNotificationProvider>
      <AppContent />
    </ToastNotificationProvider>
  );
}

