'use client';

import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';
type ToastItem = { id: number; type: ToastType; message: string };

interface ToastContextType {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

const ICONS: Record<ToastType, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

const DURATION_MS = 4500;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts(current => current.filter(t => t.id !== id));
  }, []);

  const push = useCallback((type: ToastType, message: string) => {
    const id = ++idRef.current;
    setToasts(current => [...current, { id, type, message }]);
    setTimeout(() => dismiss(id), DURATION_MS);
  }, [dismiss]);

  const value: ToastContextType = {
    success: message => push('success', message),
    error: message => push('error', message),
    info: message => push('info', message),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-viewport" aria-live="polite">
        {toasts.map(t => {
          const Icon = ICONS[t.type];
          return (
            <div
              key={t.id}
              className={`toast toast-${t.type}`}
              role={t.type === 'error' ? 'alert' : 'status'}
            >
              <Icon className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{t.message}</span>
              <button
                className="toast-close"
                aria-label="Fermer la notification"
                onClick={() => dismiss(t.id)}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast doit être utilisé à l\'intérieur de ToastProvider');
  return ctx;
}
