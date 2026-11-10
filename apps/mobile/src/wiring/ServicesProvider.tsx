import { createKeyValueStore, createPreferences } from '@scaleway-manager/adapters/device';
import { DEFAULT_PREFERENCES } from '@scaleway-manager/core';
import { useQueryClient } from '@tanstack/react-query';
import type { Persister } from '@tanstack/react-query-persist-client';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { clearAppData, createQueryPersister, networkModeFor } from './queryClient';
import { createServices } from './services';
import type { Mode, Services } from './services';

type ServicesContextValue = {
  services: Services;
  setServices: (services: Services) => void;
  persister: Persister;
};

const ServicesContext = createContext<ServicesContextValue | null>(null);

type ServicesProviderProps = {
  children: ReactNode;
  initial?: Services;
};

export function ServicesProvider({ children, initial }: ServicesProviderProps) {
  const [services, setServices] = useState<Services | null>(initial ?? null);

  // Without `initial`, the saved mode picks real or demo services.
  useEffect(() => {
    if (initial !== undefined) {
      return;
    }
    let cancelled = false;
    const kv = createKeyValueStore();
    void createPreferences(kv)
      .read()
      .catch(() => DEFAULT_PREFERENCES)
      .then(({ mode }) => {
        if (!cancelled) {
          setServices(createServices(mode, { kv }));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [initial]);

  // One persister for the app's life: a mode switch keeps the same kv.
  const kv = services?.kv;
  const persister = useMemo(() => (kv === undefined ? null : createQueryPersister(kv)), [kv]);
  const value = useMemo(
    () => (services === null || persister === null ? null : { services, setServices, persister }),
    [services, persister],
  );

  if (value === null) {
    return null;
  }

  return <ServicesContext.Provider value={value}>{children}</ServicesContext.Provider>;
}

const useServicesContext = (): ServicesContextValue => {
  const context = useContext(ServicesContext);

  if (context === null) {
    throw new Error('useServices must be used inside a ServicesProvider');
  }

  return context;
};

export function useServices(): Services {
  return useServicesContext().services;
}

// The saved copy of the query cache, for persistOptions and clearAppData.
export function useQueryPersister(): Persister {
  return useServicesContext().persister;
}

// Saves the mode, signs out, clears cached and saved data, then swaps every adapter.
export function useSwitchMode(): (mode: Mode) => Promise<void> {
  const { services, setServices, persister } = useServicesContext();
  const queryClient = useQueryClient();

  return useCallback(
    async (mode: Mode) => {
      await services.preferences.update({ mode });
      await services.keeper.signOut();
      await clearAppData(queryClient, persister, services);
      queryClient.setDefaultOptions({
        queries: { ...queryClient.getDefaultOptions().queries, networkMode: networkModeFor(mode) },
      });
      // The phone's storage and biometrics don't depend on the mode.
      setServices(createServices(mode, { kv: services.kv, biometric: services.biometric }));
    },
    [services, setServices, persister, queryClient],
  );
}
