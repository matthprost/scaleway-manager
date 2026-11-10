import { DEFAULT_PREFERENCES } from '@scaleway-manager/core';
import type { Preferences } from '@scaleway-manager/core';
import { ThemeProvider } from '@scaleway-manager/ui';
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { useServices } from '../../wiring/ServicesProvider';

type Appearance = Preferences['appearance'];

type AppearanceState = {
  appearance: Appearance;
  setAppearance: (appearance: Appearance) => void;
};

const AppearanceContext = createContext<AppearanceState | null>(null);

type AppearanceProviderProps = {
  // Known already (tests): nothing is read
  initial?: Appearance;
  children: ReactNode;
};

// The app's theme: the saved appearance, read once at launch, then changed at once from Account.
export function AppearanceProvider({ initial, children }: AppearanceProviderProps) {
  const { preferences } = useServices();
  const [appearance, setAppearance] = useState<Appearance>(initial ?? 'system');
  // A choice made on Account wins over a late read
  const known = useRef(initial !== undefined);

  useEffect(() => {
    if (known.current) {
      return;
    }
    let cancelled = false;
    void preferences
      .read()
      .catch(() => DEFAULT_PREFERENCES)
      .then((saved) => {
        if (!cancelled && !known.current) {
          setAppearance(saved.appearance);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [preferences]);

  const value = useMemo<AppearanceState>(
    () => ({
      appearance,
      setAppearance: (next) => {
        known.current = true;
        setAppearance(next);
      },
    }),
    [appearance],
  );

  return (
    <AppearanceContext.Provider value={value}>
      <ThemeProvider preference={appearance}>{children}</ThemeProvider>
    </AppearanceContext.Provider>
  );
}

const useAppearanceState = (): AppearanceState => {
  const state = useContext(AppearanceContext);

  if (state === null) {
    throw new Error('useAppearance must be used inside an AppearanceProvider');
  }

  return state;
};

// The appearance the app shows: 'system' follows the phone.
export function useAppearance(): Appearance {
  return useAppearanceState().appearance;
}

// Applies an appearance at once (the caller saves it).
export function useSetAppearance(): (appearance: Appearance) => void {
  return useAppearanceState().setAppearance;
}
