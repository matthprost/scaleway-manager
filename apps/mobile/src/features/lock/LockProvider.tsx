import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';

import { useBiometricLock } from './useBiometricLock';

type LockState = ReturnType<typeof useBiometricLock>;

const LockContext = createContext<LockState | null>(null);

type LockProviderProps = {
  children: ReactNode;
};

// Runs the lock once for the whole app (one launch check, one Face ID prompt).
export function LockProvider({ children }: LockProviderProps) {
  const lock = useBiometricLock();

  return <LockContext.Provider value={lock}>{children}</LockContext.Provider>;
}

export function useLockState(): LockState {
  const lock = useContext(LockContext);

  if (lock === null) {
    throw new Error('useLockState must be used inside a LockProvider');
  }

  return lock;
}
