import React, { useState, useEffect } from 'react';
import { SubMerchant, TelecomOrder, PayoutRecord, UserProfile } from './types';
import {
  subscribeSubMerchants,
  subscribeOrders,
  subscribePayouts,
} from './lib/firestoreService';
import { Header } from './components/Header';
import { LiveDispatchTicker } from './components/LiveDispatchTicker';
import { Storefront } from './components/Storefront';
import { AgentPortal } from './components/AgentPortal';
import { AdminConsole } from './components/AdminConsole';
import { HubtelRetryService } from './components/HubtelRetryService';
import { TransactionHistory } from './components/TransactionHistory';
import { CommissionAnalytics } from './components/CommissionAnalytics';
import { UssdHelper } from './components/UssdHelper';
import { ReceiptModal } from './components/ReceiptModal';
import { AgentSelectModal } from './components/AgentSelectModal';
import { BulkPurchaseModal } from './components/BulkPurchaseModal';
import { AuthModal } from './components/AuthModal';
import { ToastNotificationContainer } from './components/ToastNotificationContainer';
import { useFirestoreTransactionListener } from './lib/useFirestoreTransactionListener';

export const App: React.FC = () => {
  // Listen for realtime transactions to trigger chimes and toasts
  useFirestoreTransactionListener();

  const [currentTab, setCurrentTab] = useState<
    'storefront' | 'agent-portal' | 'admin' | 'security' | 'ussd' | 'history' | 'analytics' | 'retry-service'
  >('storefront');

  const [agents, setAgents] = useState<SubMerchant[]>([]);
  const [orders, setOrders] = useState<TelecomOrder[]>([]);
  const [payouts, setPayouts] = useState<PayoutRecord[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<SubMerchant | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  // Modals
  const [receiptOrder, setReceiptOrder] = useState<TelecomOrder | null>(null);
  const [isAgentModalOpen, setIsAgentModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Initialize Firestore listeners
  useEffect(() => {
    const unsubAgents = subscribeSubMerchants((data) => {
      setAgents(data);
      // Check query param for agent referral link
      const params = new URLSearchParams(window.location.search);
      const refAgentId = params.get('agentId');
      if (refAgentId) {
        const found = data.find((a) => a.id === refAgentId);
        if (found) setSelectedAgent(found);
      }
    });

    const unsubOrders = subscribeOrders((data) => {
      setOrders(data);
    });

    const unsubPayouts = subscribePayouts((data) => {
      setPayouts(data);
    });

    return () => {
      unsubAgents();
      unsubOrders();
      unsubPayouts();
    };
  }, []);

  const handleOrderCompleted = (order: TelecomOrder) => {
    setReceiptOrder(order);
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans transition-colors duration-200">
      <Header
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        selectedAgent={selectedAgent}
        onOpenAgentModal={() => setIsAgentModalOpen(true)}
        onOpenBulkModal={() => setIsBulkModalOpen(true)}
        currentUser={currentUser}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 md:p-8">
        <LiveDispatchTicker
          orders={orders}
          agents={agents}
          selectedAgent={selectedAgent}
          onNavigateToStorefront={() => setCurrentTab('storefront')}
        />

        {currentTab === 'storefront' && (
          <Storefront
            agents={agents}
            selectedAgent={selectedAgent}
            onSelectAgent={(agent) => setSelectedAgent(agent)}
            onOrderCompleted={handleOrderCompleted}
            onOpenAgentSelect={() => setIsAgentModalOpen(true)}
            onNavigateToTab={(tab) => setCurrentTab(tab)}
          />
        )}

        {currentTab === 'agent-portal' && (
          <AgentPortal
            agents={agents}
            selectedAgent={selectedAgent}
            onSelectAgent={(agent) => setSelectedAgent(agent)}
            onNavigateToTab={(tab) => setCurrentTab(tab)}
          />
        )}

        {currentTab === 'admin' && (
          <AdminConsole
            agents={agents}
            orders={orders}
            payouts={payouts}
          />
        )}

        {currentTab === 'analytics' && (
          <CommissionAnalytics
            agents={agents}
            orders={orders}
            payouts={payouts}
          />
        )}

        {currentTab === 'retry-service' && (
          <HubtelRetryService orders={orders} />
        )}

        {currentTab === 'history' && (
          <TransactionHistory
            orders={orders}
            onViewReceipt={(ord) => setReceiptOrder(ord)}
          />
        )}

        {currentTab === 'ussd' && <UssdHelper />}
      </main>

      {/* Global Modals */}
      <ReceiptModal order={receiptOrder} onClose={() => setReceiptOrder(null)} />

      {isAgentModalOpen && (
        <AgentSelectModal
          isOpen={isAgentModalOpen}
          agents={agents}
          selectedAgent={selectedAgent}
          onSelectAgent={(ag) => setSelectedAgent(ag)}
          onClose={() => setIsAgentModalOpen(false)}
          onNavigateToTab={(tab) => setCurrentTab(tab)}
        />
      )}

      {isBulkModalOpen && (
        <BulkPurchaseModal
          isOpen={isBulkModalOpen}
          onClose={() => setIsBulkModalOpen(false)}
          selectedAgent={selectedAgent}
          onSuccess={(newOrders) => {
            if (newOrders.length > 0) {
              setReceiptOrder(newOrders[0]);
            }
          }}
        />
      )}

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          if (user.role === 'admin') setCurrentTab('admin');
          if (user.role === 'agent' && user.agentId) {
            const ag = agents.find((a) => a.id === user.agentId);
            if (ag) setSelectedAgent(ag);
            setCurrentTab('agent-portal');
          }
        }}
        agents={agents}
      />

      {/* Realtime Toasts & Synthesized Audio Alerts */}
      <ToastNotificationContainer />
    </div>
  );
};
