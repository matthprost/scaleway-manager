import { StatusBar } from '@scaleway-manager/ui';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import Constants from 'expo-constants';
import { Stack, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppearanceProvider } from '../src/features/appearance/AppearanceProvider';
import { ToastProvider } from '../src/features/feedback/ToastProvider';
import { LockGate } from '../src/features/lock/LockGate';
import { LockProvider, useLockState } from '../src/features/lock/LockProvider';
import { useStackOptions } from '../src/features/navigation/useStackOptions';
import { SessionProvider } from '../src/features/session/SessionProvider';
import { useSignedOutRedirect } from '../src/features/session/useSignedOutRedirect';
import { SplashGate } from '../src/features/splash/SplashGate';
import { StatusBarReportsContext } from '../src/features/statusBar/StatusBarReports';
import type { StatusBarReports } from '../src/features/statusBar/StatusBarReports';
import { WorkspaceProvider } from '../src/features/workspace/WorkspaceProvider';
import {
  bindFocusManager,
  bindOnlineManager,
  CACHE_SHAPE,
  clearAppData,
  createQueryClient,
  QUERY_CACHE_MAX_AGE,
} from '../src/wiring/queryClient';
import { ServicesProvider, useQueryPersister, useServices } from '../src/wiring/ServicesProvider';

// Keep the native splash up until our own one has drawn.
void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <ServicesProvider>
      <AppProviders />
    </ServicesProvider>
  );
}

// Everything below needs the services.
function AppProviders() {
  const { mode, connectivity, keeper, pins, files } = useServices();
  const persister = useQueryPersister();
  // A mode switch keeps this client and updates its network mode (useSwitchMode)
  const [queryClient] = useState(() => createQueryClient(mode));
  // A new app version or a new data shape (CACHE_SHAPE) drops the saved cache.
  const persistOptions = useMemo(
    () => ({ persister, maxAge: QUERY_CACHE_MAX_AGE, buster: `${Constants.expoConfig?.version}-${CACHE_SHAPE}` }),
    [persister],
  );

  useEffect(() => bindOnlineManager(connectivity), [connectivity]);

  useEffect(() => bindFocusManager(), []);

  // The one place that wipes cached and saved data: on every sign-out (also when Scaleway refuses the session), and
  // when a login replaces another session (switching organization: the same user may come back with another
  // organization), so nothing of the old organization stays. A renew replaces nothing.
  useEffect(
    () =>
      keeper.subscribe((session, replaced) => {
        if (session === null || replaced !== undefined) {
          void clearAppData(queryClient, persister, { pins, files });
        }
      }),
    [keeper, queryClient, persister, pins, files],
  );

  return (
    <AppearanceProvider>
      <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
        <SafeAreaProvider>
          <SessionProvider>
            <WorkspaceProvider>
              <LockProvider>
                <AppScreens />
              </LockProvider>
            </WorkspaceProvider>
          </SessionProvider>
        </SafeAreaProvider>
      </PersistQueryClientProvider>
    </AppearanceProvider>
  );
}

// The status bar, the splash, the lock, the sign-out guard and the screens.
function AppScreens() {
  const stackOptions = useStackOptions();
  const { locked, decided, privacyCover } = useLockState();
  const pathname = usePathname();
  const [splashUp, setSplashUp] = useState(true);
  const [homeHeaderUnder, setHomeHeaderUnder] = useState(true);
  const [billingHeaderUnder, setBillingHeaderUnder] = useState(true);
  const [sheetsUp, setSheetsUp] = useState(0);

  useSignedOutRedirect();

  const reports = useMemo<StatusBarReports>(
    () => ({
      setHomeHeaderUnder,
      setBillingHeaderUnder,
      sheetShown: () => {
        setSheetsUp((count) => count + 1);

        return () => setSheetsUp((count) => count - 1);
      },
    }),
    [],
  );
  // An Android sheet takes the screen's icon colour when it opens, over its light page: the theme decides then
  const sheetOverScreen = Platform.OS === 'android' && sheetsUp > 0;
  // Light icons while purple is under them: the splash, the lock and privacy covers, Welcome, and Home's and Billing's
  // headers (until scrolled away).
  const onBrand =
    !sheetOverScreen &&
    (splashUp ||
      locked ||
      !decided ||
      privacyCover ||
      pathname === '/welcome' ||
      (pathname === '/home' && homeHeaderUnder) ||
      (pathname === '/billing' && billingHeaderUnder));

  return (
    <StatusBarReportsContext.Provider value={reports}>
      <StatusBar onBrand={onBrand} />

      <SplashGate onFinished={() => setSplashUp(false)}>
        <LockGate>
          {/* The one toast sits inside the lock, so the lock screen covers it */}
          <ToastProvider>
            <Stack screenOptions={stackOptions} />
          </ToastProvider>
        </LockGate>
      </SplashGate>
    </StatusBarReportsContext.Provider>
  );
}
