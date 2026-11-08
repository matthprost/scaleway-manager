import { Toast } from '@scaleway-manager/ui';
import { createContext, useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

// How long a toast stays up.
const TOAST_MS = 2000;

export const ToastContext = createContext<((message: string) => void) | null>(null);

type ToastProviderProps = {
  children: ReactNode;
};

// Draws the app's one Toast and lets screens show it. Inside the lock, so the lock screen covers it.
export function ToastProvider({ children }: ToastProviderProps) {
  // `count` goes up with every message, so a new one gets its own 2 seconds. The message stays while it fades out.
  const [toast, setToast] = useState({ message: '', visible: false, count: 0 });

  const show = useCallback((message: string) => {
    setToast((current) => ({ message, visible: true, count: current.count + 1 }));
  }, []);

  useEffect(() => {
    if (!toast.visible) {
      return undefined;
    }

    const timer = setTimeout(() => setToast((current) => ({ ...current, visible: false })), TOAST_MS);

    return () => clearTimeout(timer);
  }, [toast.visible, toast.count]);

  return (
    <ToastContext.Provider value={show}>
      {children}

      <Toast message={toast.message} visible={toast.visible} />
    </ToastContext.Provider>
  );
}
