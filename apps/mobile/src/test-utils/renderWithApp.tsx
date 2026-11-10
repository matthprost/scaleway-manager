import type { Session } from '@scaleway-manager/core';
import { onlineManager, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppearanceProvider } from '../features/appearance/AppearanceProvider';
import { ToastProvider } from '../features/feedback/ToastProvider';
import { SessionProvider } from '../features/session/SessionProvider';
import { WorkspaceProvider } from '../features/workspace/WorkspaceProvider';
import { createQueryClient } from '../wiring/queryClient';
import { createServices } from '../wiring/services';
import type { Services } from '../wiring/services';
import { ServicesProvider } from '../wiring/ServicesProvider';

// An iPhone-sized screen with a notch and a home indicator.
const TEST_METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

type RenderWithAppOptions = {
  services?: Services;
  online?: boolean;
};

// Renders `ui` inside the app's providers, except the lock (add LockProvider when needed).
// By default: real mode, signed out, no network, nothing saved, a light theme that Account's appearance can change.
export async function renderWithApp(ui: ReactElement, { services, online }: RenderWithAppOptions = {}) {
  const connectivity = { isOnline: async () => online ?? true, subscribe: () => () => {} };
  const saved = new Map<string, string>();
  let session: Session | null = null;
  const base =
    services ??
    createServices('real', {
      fetch: async () => {
        throw new Error('Tests have no network');
      },
      kv: {
        getItem: async (key) => saved.get(key) ?? null,
        setItem: async (key, value) => {
          saved.set(key, value);
        },
        removeItem: async (key) => {
          saved.delete(key);
        },
      },
      store: {
        load: async () => session,
        save: async (next) => {
          session = next;
        },
        clear: async () => {
          session = null;
        },
      },
      biometric: { isAvailable: async () => false, authenticate: async () => false },
      connectivity,
    });
  const app = online === undefined ? base : { ...base, connectivity };
  const queryClient = createQueryClient(app.mode);
  // Failures show at once, and no clean-up timer keeps Jest running.
  queryClient.setDefaultOptions({
    queries: { ...queryClient.getDefaultOptions().queries, retry: false, gcTime: Infinity },
  });
  onlineManager.setOnline(online ?? true);

  const result = await render(
    <ServicesProvider initial={app}>
      <SessionProvider>
        <AppearanceProvider initial="light">
          <QueryClientProvider client={queryClient}>
            <SafeAreaProvider initialMetrics={TEST_METRICS}>
              <WorkspaceProvider>
                <ToastProvider>{ui}</ToastProvider>
              </WorkspaceProvider>
            </SafeAreaProvider>
          </QueryClientProvider>
        </AppearanceProvider>
      </SessionProvider>
    </ServicesProvider>,
  );

  return { ...result, queryClient, services: app };
}
