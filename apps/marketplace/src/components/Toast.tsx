'use client';
import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { CheckCircle2, Info, XCircle } from 'lucide-react';

type ToastType = 'success' | 'info' | 'error';
interface ToastState { message: string; type: ToastType }

const ToastContext = createContext<(message: string, type?: ToastType) => void>(() => {});

const STYLES: Record<ToastType, { bg: string; icon: typeof CheckCircle2 }> = {
  success: { bg: 'bg-[#2F7A3E]', icon: CheckCircle2 },
  info: { bg: 'bg-[#383497]', icon: Info },
  error: { bg: 'bg-[#D32F2F]', icon: XCircle },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    clearTimeout(timer.current);
    setToast({ message, type });
    timer.current = setTimeout(() => setToast(null), 5000);
  }, []);

  const Icon = toast ? STYLES[toast.type].icon : null;

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      {toast && Icon && (
        <div
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] ${STYLES[toast.type].bg} text-white px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-2.5 font-sans font-semibold text-sm [animation:fadeUp_.3s_ease_both] max-w-[90vw]`}
        >
          <Icon className="w-5 h-5 flex-shrink-0" />
          <span>{toast.message}</span>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
