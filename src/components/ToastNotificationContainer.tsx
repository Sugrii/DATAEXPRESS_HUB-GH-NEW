import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CheckCircle2,
  Coins,
  Receipt,
  Copy,
  Check,
  X,
  Volume2,
  VolumeX,
  Radio,
  ExternalLink,
  Sparkles,
  Zap,
} from 'lucide-react';
import { useToastNotification } from '../context/ToastNotificationContext';
import { TransactionToast, TelecomOrder } from '../types';

interface ToastNotificationContainerProps {
  onViewReceipt: (order: TelecomOrder) => void;
}

const NETWORK_BADGES = {
  MTN: {
    bg: 'bg-amber-400/20',
    border: 'border-amber-400/40',
    text: 'text-amber-400',
    dot: 'bg-amber-400',
    glow: 'shadow-amber-500/10',
  },
  TELECEL: {
    bg: 'bg-rose-500/20',
    border: 'border-rose-500/40',
    text: 'text-rose-400',
    dot: 'bg-rose-500',
    glow: 'shadow-rose-500/10',
  },
  AT: {
    bg: 'bg-blue-500/20',
    border: 'border-blue-500/40',
    text: 'text-blue-400',
    dot: 'bg-blue-500',
    glow: 'shadow-blue-500/10',
  },
};

const ToastItem: React.FC<{
  toast: TransactionToast;
  onDismiss: (id: string) => void;
  onViewReceipt: (order: TelecomOrder) => void;
}> = ({ toast, onDismiss, onViewReceipt }) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(100);

  const startTimeRef = useRef<number>(Date.now());
  const remainingTimeRef = useRef<number>(toast.durationMs);

  useEffect(() => {
    if (isPaused) return;

    const interval = 50;
    const timer = setInterval(() => {
      remainingTimeRef.current -= interval;
      const pct = Math.max(0, (remainingTimeRef.current / toast.durationMs) * 100);
      setProgress(pct);

      if (remainingTimeRef.current <= 0) {
        clearInterval(timer);
        onDismiss(toast.id);
      }
    }, interval);

    return () => clearInterval(timer);
  }, [isPaused, toast.id, toast.durationMs, onDismiss]);

  const handleCopyId = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(toast.order.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const netStyle = NETWORK_BADGES[toast.network] || NETWORK_BADGES.MTN;
  const isCommissionToast = toast.type === 'COMMISSION_EARNED';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 50, scale: 0.9 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className={`relative w-full max-w-sm sm:max-w-md rounded-2xl bg-slate-900/95 border backdrop-blur-md shadow-2xl p-4 overflow-hidden group select-none transition-all ${
        isCommissionToast
          ? 'border-amber-400/50 shadow-amber-500/10'
          : 'border-emerald-500/40 shadow-emerald-500/10'
      }`}
    >
      {/* Top Background Glow Effect */}
      <div
        className={`absolute -top-10 -right-10 w-32 h-32 rounded-full blur-2xl pointer-events-none opacity-30 ${
          isCommissionToast ? 'bg-amber-400' : 'bg-emerald-400'
        }`}
      />

      {/* Progress countdown bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-800/80">
        <div
          className={`h-full transition-all duration-75 ${
            isCommissionToast ? 'bg-amber-400' : 'bg-emerald-400'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex items-start gap-3">
        {/* Left Icon Badge */}
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
            isCommissionToast
              ? 'bg-amber-400/20 text-amber-400 border-amber-400/30'
              : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
          }`}
        >
          {isCommissionToast ? (
            <Coins className="w-5 h-5 animate-bounce" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          )}
        </div>

        {/* Middle Content */}
        <div className="flex-1 min-w-0 pr-6">
          {/* Header Tag / Network & Commission Pill */}
          <div className="flex items-center flex-wrap gap-1.5 mb-1">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${netStyle.bg} ${netStyle.border} ${netStyle.text}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${netStyle.dot}`} />
              {toast.network}
            </span>

            {isCommissionToast ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-400 text-slate-950 shadow-sm">
                <Sparkles className="w-3 h-3" />
                +GHS {toast.commissionAmount.toFixed(2)} Commission
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <Zap className="w-3 h-3 text-emerald-400" />
                GHS {toast.amount.toFixed(2)}
              </span>
            )}

            <span className="text-[10px] text-slate-400 font-mono ml-auto">
              {new Date(toast.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>

          {/* Title & Body */}
          <h4 className="text-sm font-bold text-white leading-tight font-['Outfit'] truncate">
            {toast.title}
          </h4>

          <p className="text-xs text-slate-300 mt-0.5 leading-snug line-clamp-2">
            <span className="font-semibold text-white">{toast.packageName}</span> ({toast.dataAmount})
            {' delivered to '}
            <span className="font-mono text-amber-300">{toast.customerPhone}</span>
          </p>

          {/* Action Row */}
          <div className="flex items-center gap-2 mt-2.5 pt-2 border-t border-slate-800/80">
            <button
              id={`view-receipt-btn-${toast.order.id}`}
              onClick={() => {
                onViewReceipt(toast.order);
                onDismiss(toast.id);
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors shadow-sm"
            >
              <Receipt className="w-3.5 h-3.5 text-amber-400" />
              <span>View Receipt</span>
            </button>

            <button
              id={`copy-toast-id-btn-${toast.order.id}`}
              onClick={handleCopyId}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs transition-colors"
              title="Copy Order ID"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-semibold">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span className="font-mono text-[11px]">{toast.order.id.slice(-8)}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Close Button */}
        <button
          id={`dismiss-toast-btn-${toast.id}`}
          onClick={() => onDismiss(toast.id)}
          aria-label="Dismiss toast"
          className="absolute top-3 right-3 text-slate-500 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
};

export const ToastNotificationContainer: React.FC<ToastNotificationContainerProps> = ({
  onViewReceipt,
}) => {
  const {
    toasts,
    dismissToast,
    clearAllToasts,
    soundEnabled,
    setSoundEnabled,
    listenerActive,
  } = useToastNotification();

  if (toasts.length === 0) return null;

  return (
    <div
      id="firestore-toast-container"
      className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 flex flex-col items-end gap-3 pointer-events-auto max-w-full px-3 sm:px-0"
    >
      {/* Top Header Controls Bar when multiple toasts */}
      {toasts.length > 1 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/90 border border-slate-800 text-xs text-slate-300 shadow-xl backdrop-blur-md"
        >
          <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            <span>{toasts.length} Live Alerts</span>
          </span>

          <div className="w-px h-3 bg-slate-800 mx-0.5" />

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="text-slate-400 hover:text-white p-1 rounded transition-colors"
            title={soundEnabled ? 'Mute notification chimes' : 'Enable notification chimes'}
          >
            {soundEnabled ? (
              <Volume2 className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <VolumeX className="w-3.5 h-3.5 text-slate-500" />
            )}
          </button>

          <button
            id="clear-all-toasts-btn"
            onClick={clearAllToasts}
            className="text-slate-400 hover:text-rose-400 text-[11px] font-semibold transition-colors"
          >
            Clear all
          </button>
        </motion.div>
      )}

      {/* Stack of animated Toast Items */}
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastItem
            key={toast.id}
            toast={toast}
            onDismiss={dismissToast}
            onViewReceipt={onViewReceipt}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};
