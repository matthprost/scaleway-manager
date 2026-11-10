import type { Session, SessionKeeper } from '@scaleway-manager/core';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { useServices } from '../../wiring/ServicesProvider';

type SessionState = { status: 'loading' | 'signed-out' | 'signed-in'; session: Session | null };

// switches: goes up each time a login replaces another session (switching organization)
type SessionValue = SessionState & { switches: number };

const SessionContext = createContext<SessionValue | null>(null);

// The app's one login: Welcome and "Switch organization" share it (one at a time, one error line).
type LoginRun = {
  isPending: boolean;
  error: string | null;
  // False when a login is already running
  begin: () => boolean;
  end: (error: string | null) => void;
};

export const LoginRunContext = createContext<LoginRun | null>(null);

type SessionProviderProps = {
  children: ReactNode;
};

// Reads the saved session once for the whole app, then follows changes. Never calls the network.
export function SessionProvider({ children }: SessionProviderProps) {
  const { keeper } = useServices();
  const [state, setState] = useState<SessionState & { keeper: SessionKeeper }>({
    keeper,
    status: 'loading',
    session: null,
  });
  const [login, setLogin] = useState<{ isPending: boolean; error: string | null }>({ isPending: false, error: null });
  const [switches, setSwitches] = useState(0);
  const running = useRef(false);

  // New services (a mode switch): their session isn't known yet.
  if (state.keeper !== keeper) {
    setState({ keeper, status: 'loading', session: null });
  }

  useEffect(() => {
    let active = true;
    let changed = false;
    const show = (session: Session | null) => {
      if (active) {
        setState({ keeper, status: session === null ? 'signed-out' : 'signed-in', session });
      }
      // Signed in (a login or the demo): an old login error is out of date
      if (active && session !== null) {
        setLogin((current) => (current.error === null ? current : { ...current, error: null }));
      }
    };
    const unsubscribe = keeper.subscribe((session, replaced) => {
      changed = true;
      if (active && replaced !== undefined) {
        setSwitches((count) => count + 1);
      }
      show(session);
    });
    // A change that arrived first is newer than the saved read.
    const initial = (session: Session | null) => {
      if (!changed) {
        show(session);
      }
    };
    keeper.current().then(initial, () => initial(null));

    return () => {
      active = false;
      unsubscribe();
    };
  }, [keeper]);

  const begin = useCallback(() => {
    if (running.current) {
      return false;
    }
    running.current = true;
    setLogin({ isPending: true, error: null });

    return true;
  }, []);

  const end = useCallback((error: string | null) => {
    running.current = false;
    setLogin({ isPending: false, error });
  }, []);

  const loginRun = useMemo(() => ({ ...login, begin, end }), [login, begin, end]);
  const value = useMemo(() => ({ ...state, switches }), [state, switches]);

  return (
    <SessionContext.Provider value={value}>
      <LoginRunContext.Provider value={loginRun}>{children}</LoginRunContext.Provider>
    </SessionContext.Provider>
  );
}

export function useSession(): SessionValue {
  const session = useContext(SessionContext);

  if (session === null) {
    throw new Error('useSession must be used inside a SessionProvider');
  }

  return session;
}
