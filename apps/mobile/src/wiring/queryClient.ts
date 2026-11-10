import type { KeyValueStore } from '@scaleway-manager/adapters/device';
import { AppError } from '@scaleway-manager/core';
import type { AppErrorKind, ConnectivityPort } from '@scaleway-manager/core';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { focusManager, onlineManager, QueryClient } from '@tanstack/react-query';
import type { Persister } from '@tanstack/react-query-persist-client';
import { AppState } from 'react-native';

import type { Mode, Services } from './services';

// Saved data older than this is dropped at launch.
export const QUERY_CACHE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

// Bump when a query's data changes shape: the saved cache of the old shape is then dropped.
// 3: a month of spending has byProject and discount.
export const CACHE_SHAPE = 3;

// Retrying can't fix these.
const FINAL_ERRORS: AppErrorKind[] = ['unauthorized', 'forbidden', 'not_found'];

// Back from the background, stale data older than this is asked again: a quick trip to another app asks nothing.
export const FOCUS_REFRESH_AFTER = 30 * 1000;

// Demo mode ignores connectivity: its queries run whatever the network says.
export const networkModeFor = (mode: Mode) => (mode === 'demo' ? 'always' : 'online');

export const createQueryClient = (mode: Mode = 'real'): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: {
        networkMode: networkModeFor(mode),
        retry: (failureCount, error) =>
          failureCount < 2 && !(error instanceof AppError && FINAL_ERRORS.includes(error.kind)),
        // Unused data must outlive the saved copy, or it is dropped before maxAge.
        gcTime: QUERY_CACHE_MAX_AGE,
        refetchOnWindowFocus: (query) => Date.now() - query.state.dataUpdatedAt >= FOCUS_REFRESH_AFTER,
      },
    },
  });

export const createQueryPersister = (kv: KeyValueStore): Persister =>
  createAsyncStoragePersister({ storage: kv, key: 'sm.query-cache' });

// Lets TanStack Query pause and resume with the phone's connection.
export const bindOnlineManager = (connectivity: ConnectivityPort): (() => void) => {
  let bound = true;
  onlineManager.setEventListener((setOnline) => {
    // A failed check counts as online, like TanStack's default.
    void connectivity
      .isOnline()
      .catch(() => true)
      .then((online) => {
        if (bound) {
          setOnline(online);
        }
      });

    return connectivity.subscribe(setOnline);
  });

  return () => {
    bound = false;
    onlineManager.setEventListener(() => undefined);
  };
};

// Coming back from the background counts as a focus: stale data refreshes, and timers (the alerts' minute) wait while
// the app is away.
export const bindFocusManager = (): (() => void) => {
  focusManager.setEventListener((setFocused) => {
    const subscription = AppState.addEventListener('change', (state) => {
      // Only these two count: 'inactive' is a blip (Face ID, Control Center)
      if (state === 'active' || state === 'background') {
        setFocused(state === 'active');
      }
    });

    return () => subscription.remove();
  });

  return () => {
    focusManager.setEventListener(() => undefined);
    // Focused again, as before the binding
    focusManager.setFocused(undefined);
  };
};

// Wipes the cache, its saved copy, the saved pins and the cached invoice PDFs.
export const clearAppData = async (
  queryClient: QueryClient,
  persister: Persister,
  services: Pick<Services, 'pins' | 'files'>,
): Promise<void> => {
  queryClient.clear();
  // Every step runs, even if one fails.
  await Promise.allSettled([persister.removeClient(), services.pins.clear(), services.files.clear()]);
};
