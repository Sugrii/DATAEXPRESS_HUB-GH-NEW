import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { TransactionToast, TelecomOrder } from '../types';

interface ToastContextType {
  toasts: TransactionToast[];
  addTransactionToast: (order: TelecomOrder, isAgentSpecific?: boolean) => void;
  dismissToast: (id: string) => void;
  clearAllToasts: () => void;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  playNotificationChime: () => void;
  listenerActive: boolean;
  setListenerActive: (active: boolean) => void;
  lastReceivedAt: string | null;
}

const ToastNotificationContext = createContext<ToastContextType | undefined>(undefined);

// Web Audio API synthesized transaction chime
function playSynthesizedChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    // Note 1: E5 (659.25 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now);
    gain1.gain.setValueAtTime(0.12, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    // Note 2: B5 (987.77 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(987.77, now + 0.08);
    gain2.gain.setValueAtTime(0.14, now + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.45);

    // Note 3: E6 (1318.51 Hz) - celebratory high chime
    const osc3 = ctx.createOscillator();
    const gain3 = ctx.createGain();
    osc3.type = 'triangle';
    osc3.frequency.setValueAtTime(1318.51, now + 0.16);
    gain3.gain.setValueAtTime(0.16, now + 0.16);
    gain3.gain.exponentialRampToValueAtTime(0.0001, now + 0.65);
    osc3.connect(gain3);
    gain3.connect(ctx.destination);
    osc3.start(now + 0.16);
    osc3.stop(now + 0.65);
  } catch (err) {
    // Audio contexts might be blocked until first user interaction
    console.debug('Audio chime unable to play:', err);
  }
}

export const ToastNotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<TransactionToast[]>([]);
  const [soundEnabled, setSoundEnabledState] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('gh_telecom_toast_sound');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });
  const [listenerActive, setListenerActive] = useState<boolean>(true);
  const [lastReceivedAt, setLastReceivedAt] = useState<string | null>(null);

  const toastsRef = useRef(toasts);
  toastsRef.current = toasts;

  const setSoundEnabled = (enabled: boolean) => {
    setSoundEnabledState(enabled);
    try {
      localStorage.setItem('gh_telecom_toast_sound', String(enabled));
    } catch {
      // ignore
    }
  };

  const playNotificationChime = useCallback(() => {
    if (soundEnabled) {
      playSynthesizedChime();
    }
  }, [soundEnabled]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  const addTransactionToast = useCallback(
    (order: TelecomOrder, isAgentSpecific = false) => {
      const commAmount = order.commissionAmount || Number(((order.amount * 10) / 100).toFixed(2));
      const isAgentOrder = isAgentSpecific || (order.agentId && order.agentId !== 'DIRECT');

      const toastId = `TOAST-${order.id}-${Date.now()}`;
      
      const newToast: TransactionToast = {
        id: toastId,
        order,
        type: isAgentOrder ? 'COMMISSION_EARNED' : 'TRANSACTION_SUCCESS',
        title: isAgentOrder ? '🎉 10% Commission Earned!' : '⚡ New Transaction Completed',
        message: `${order.packageName} (${order.dataAmount}) delivered to ${order.customerPhone}`,
        amount: order.amount,
        commissionAmount: commAmount,
        network: order.network,
        customerPhone: order.customerPhone,
        packageName: order.packageName,
        dataAmount: order.dataAmount,
        agentId: order.agentId,
        agentName: order.agentName,
        timestamp: new Date().toISOString(),
        durationMs: 8000,
      };

      // Cap toast stack at max 4 to avoid cluttering screen
      setToasts((prev) => {
        const filtered = prev.filter((t) => t.order.id !== order.id);
        return [newToast, ...filtered].slice(0, 4);
      });

      setLastReceivedAt(new Date().toISOString());
      playNotificationChime();
    },
    [playNotificationChime]
  );

  return (
    <ToastNotificationContext.Provider
      value={{
        toasts,
        addTransactionToast,
        dismissToast,
        clearAllToasts,
        soundEnabled,
        setSoundEnabled,
        playNotificationChime,
        listenerActive,
        setListenerActive,
        lastReceivedAt,
      }}
    >
      {children}
    </ToastNotificationContext.Provider>
  );
};

export function useToastNotification() {
  const context = useContext(ToastNotificationContext);
  if (!context) {
    throw new Error('useToastNotification must be used within a ToastNotificationProvider');
  }
  return context;
}
