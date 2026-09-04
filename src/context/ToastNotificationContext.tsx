import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export interface ToastItem {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: Date;
}

interface ToastNotificationContextType {
  toasts: ToastItem[];
  addToast: (type: ToastItem['type'], title: string, message: string) => void;
  removeToast: (id: string) => void;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  listenerActive: boolean;
  setListenerActive: (active: boolean) => void;
}

const ToastNotificationContext = createContext<ToastNotificationContextType | undefined>(undefined);

// Synthesize pleasant chime using Web Audio API
function playChime(type: ToastItem['type']) {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    if (type === 'success') {
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.setValueAtTime(880, now + 0.1); // A5
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc.start(now);
      osc.stop(now + 0.4);
    } else if (type === 'error') {
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.setValueAtTime(220, now + 0.12);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);
    } else {
      osc.frequency.setValueAtTime(520, now);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
    }
  } catch (e) {
    // AudioContext autoplay restrictions or disabled
  }
}

export const ToastNotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [soundEnabled, setSoundEnabledState] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('ghana_telecom_sound');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });
  const [listenerActive, setListenerActive] = useState<boolean>(true);

  const setSoundEnabled = (enabled: boolean) => {
    setSoundEnabledState(enabled);
    try {
      localStorage.setItem('ghana_telecom_sound', String(enabled));
    } catch (e) {
      console.warn(e);
    }
  };

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((type: ToastItem['type'], title: string, message: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newToast: ToastItem = { id, type, title, message, timestamp: new Date() };

    setToasts((prev) => [newToast, ...prev.slice(0, 4)]);

    if (soundEnabled) {
      playChime(type);
    }

    setTimeout(() => {
      removeToast(id);
    }, 5000);
  }, [soundEnabled, removeToast]);

  return (
    <ToastNotificationContext.Provider
      value={{
        toasts,
        addToast,
        removeToast,
        soundEnabled,
        setSoundEnabled,
        listenerActive,
        setListenerActive,
      }}
    >
      {children}
    </ToastNotificationContext.Provider>
  );
};

export const useToastNotification = (): ToastNotificationContextType => {
  const context = useContext(ToastNotificationContext);
  if (!context) {
    throw new Error('useToastNotification must be used within ToastNotificationProvider');
  }
  return context;
};
