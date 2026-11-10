import { Text, ThemeProvider } from '@scaleway-manager/ui';
import { focusManager, onlineManager, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import type { ReactNode } from 'react';
import { AppState } from 'react-native';
import type { AppStateStatus } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import Home from '../../../app/(tabs)/home';
import TabsLayout from '../../../app/(tabs)/_layout';
import Resources from '../../../app/(tabs)/resources';
import * as ResourcesLayout from '../../../app/(tabs)/resources/_layout';
import ProductResources from '../../../app/(tabs)/resources/[product]';
import ResourceDetail from '../../../app/(tabs)/resources/[product]/[locality]/[id]';
import { bindFocusManager, createQueryClient } from '../../wiring/queryClient';
import { createServices } from '../../wiring/services';
import { ServicesProvider } from '../../wiring/ServicesProvider';
import { useFiringAlerts } from '../alerts/useFiringAlerts';
import { useSelectedMonth } from '../spending/useSelectedMonth';
import { useSpendingHistory } from '../spending/useSpendingHistory';
import { ToastProvider } from '../feedback/ToastProvider';
import { LockProvider } from '../lock/LockProvider';
import { SessionProvider } from '../session/SessionProvider';
import { WorkspaceProvider } from '../workspace/WorkspaceProvider';

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

// The demo (signed in, no network), with its own empty phone storage
const demo = () => {
  const saved = new Map<string, string>();

  return createServices('demo', {
    kv: {
      getItem: async (key) => saved.get(key) ?? null,
      setItem: async (key, value) => {
        saved.set(key, value);
      },
      removeItem: async (key) => {
        saved.delete(key);
      },
    },
  });
};

let services = demo();
let queryClient = createQueryClient();

beforeEach(() => {
  // Minutes pass in an instant (renderRouter turns them on too; don't rely on it)
  jest.useFakeTimers();
  services = demo();
  queryClient = createQueryClient();
  // Failures show at once, and no clean-up timer keeps Jest running
  queryClient.setDefaultOptions({
    queries: { ...queryClient.getDefaultOptions().queries, retry: false, gcTime: Infinity },
  });
  onlineManager.setOnline(true);
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

function Providers({ children }: { children: ReactNode }) {
  return (
    <ServicesProvider initial={services}>
      <SessionProvider>
        <ThemeProvider preference="light">
          <QueryClientProvider client={queryClient}>
            <SafeAreaProvider initialMetrics={METRICS}>
              <WorkspaceProvider>
                <LockProvider>
                  <ToastProvider>{children}</ToastProvider>
                </LockProvider>
              </WorkspaceProvider>
            </SafeAreaProvider>
          </QueryClientProvider>
        </ThemeProvider>
      </SessionProvider>
    </ServicesProvider>
  );
}

// Billing and Account belong to other tasks: stand-ins keep these tests about Home
function BillingStub() {
  return <Text variant="body">Billing</Text>;
}

function AccountStub() {
  return <Text variant="body">Account</Text>;
}

function WelcomeStub() {
  return <Text variant="body">Welcome</Text>;
}

const routes = {
  welcome: WelcomeStub,
  '(tabs)/_layout': TabsLayout,
  '(tabs)/home': Home,
  '(tabs)/resources/_layout': ResourcesLayout,
  '(tabs)/resources/index': Resources,
  '(tabs)/resources/[product]/index': ProductResources,
  '(tabs)/resources/[product]/[locality]/[id]': ResourceDetail,
  '(tabs)/billing': BillingStub,
  '(tabs)/account': AccountStub,
};

// The router uses fake timers: let the queries finish inside act
const settle = () =>
  act(async () => {
    await jest.advanceTimersByTimeAsync(50);
  });

test('See all opens the Resources tab', async () => {
  const router = await renderRouter(routes, { initialUrl: '/home', wrapper: Providers });
  await settle();

  await act(async () => {
    fireEvent.press(screen.getByRole('button', { name: 'See all' }));
  });

  expect(await screen.findByRole('header', { name: 'Resources' })).toBeOnTheScreen();
  expect(router.getPathname()).toBe('/resources');
});

test('tapping a card opens its resource, in the Resources tab', async () => {
  const router = await renderRouter(routes, { initialUrl: '/home', wrapper: Providers });
  await settle();

  await act(async () => {
    fireEvent.press(
      screen.getByRole('button', { name: 'api-prod-2, Instance · Debian, nl-ams-1 · 203.0.113.21, Running' }),
    );
  });

  expect(await screen.findByRole('header', { name: 'api-prod-2' })).toBeOnTheScreen();
  expect(router.getPathname()).toBe('/resources/instances/nl-ams-1/demo-api-prod-2');
});

// Home's alerts alone: the full Home animates every frame, which makes minutes of fake time slow
function AlertsOnly() {
  const { alerts } = useFiringAlerts();

  return <Text variant="body">{`${alerts.length} alerts`}</Text>;
}

test('firing alerts refresh every minute while Home is on screen, not behind another tab', async () => {
  const listFiring = jest.spyOn(services.alerts, 'listFiring');
  await renderRouter({ ...routes, '(tabs)/home': AlertsOnly }, { initialUrl: '/home', wrapper: Providers });
  await settle();

  expect(screen.getByText('1 alerts')).toBeOnTheScreen();
  expect(listFiring).toHaveBeenCalledTimes(1);

  await act(async () => {
    await jest.advanceTimersByTimeAsync(60_000);
  });

  expect(listFiring).toHaveBeenCalledTimes(2);

  await act(async () => {
    fireEvent.press(screen.getByRole('tab', { name: 'Resources' }));
  });
  await act(async () => {
    await jest.advanceTimersByTimeAsync(3 * 60_000);
  });

  expect(listFiring).toHaveBeenCalledTimes(2);

  // Back on Home after 3 minutes: the alerts are asked again at once, then every minute
  await act(async () => {
    fireEvent.press(screen.getByRole('tab', { name: 'Home' }));
  });
  await settle();

  expect(listFiring).toHaveBeenCalledTimes(3);

  await act(async () => {
    await jest.advanceTimersByTimeAsync(60_000);
  });

  expect(listFiring).toHaveBeenCalledTimes(4);
});

test('back on Home within the minute, the alerts are fresh enough: nothing is asked at once', async () => {
  const listFiring = jest.spyOn(services.alerts, 'listFiring');
  await renderRouter({ ...routes, '(tabs)/home': AlertsOnly }, { initialUrl: '/home', wrapper: Providers });
  await settle();

  await act(async () => {
    fireEvent.press(screen.getByRole('tab', { name: 'Resources' }));
  });
  await act(async () => {
    await jest.advanceTimersByTimeAsync(20_000);
  });
  await act(async () => {
    fireEvent.press(screen.getByRole('tab', { name: 'Home' }));
  });
  await settle();

  expect(listFiring).toHaveBeenCalledTimes(1);

  // Then every minute again
  await act(async () => {
    await jest.advanceTimersByTimeAsync(60_000);
  });

  expect(listFiring).toHaveBeenCalledTimes(2);
});

// Home's alerts and spending alone (the full Home animates every frame, which makes minutes of fake time slow)
function AlertsAndSpending() {
  const { alerts } = useFiringAlerts();
  const { loaded } = useSpendingHistory(useSelectedMonth(6).range);

  return <Text variant="body">{`${alerts.length} alerts, ${loaded.length} months`}</Text>;
}

test("back from the background, Home's stale data refreshes at once; while away, the alert timer waits", async () => {
  const appState = new Set<(state: AppStateStatus) => void>();
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
    appState.add(listener);

    return { remove: () => appState.delete(listener) };
  });
  const goTo = async (state: AppStateStatus) => {
    await act(async () => {
      appState.forEach((listener) => listener(state));
    });
    await settle();
  };
  const unbind = bindFocusManager();
  const listFiring = jest.spyOn(services.alerts, 'listFiring');
  const getMonth = jest.spyOn(services.spending, 'getMonth');
  await renderRouter({ ...routes, '(tabs)/home': AlertsAndSpending }, { initialUrl: '/home', wrapper: Providers });
  await settle();

  expect(screen.getByText('1 alerts, 6 months')).toBeOnTheScreen();
  expect(listFiring).toHaveBeenCalledTimes(1);
  expect(getMonth).toHaveBeenCalledTimes(6);

  // A night away: nothing is asked while the app is in the background
  await goTo('background');
  await act(async () => {
    await jest.advanceTimersByTimeAsync(8 * 60 * 60_000);
  });

  expect(listFiring).toHaveBeenCalledTimes(1);
  expect(getMonth).toHaveBeenCalledTimes(6);

  // Back: the alerts, this month and last month are asked again at once (older months don't change)
  await goTo('active');

  expect(listFiring).toHaveBeenCalledTimes(2);
  expect(getMonth).toHaveBeenCalledTimes(8);

  // Then the alerts every minute again, also behind Face ID or Control Center (inactive)
  await goTo('inactive');
  await act(async () => {
    await jest.advanceTimersByTimeAsync(60_000);
  });

  expect(listFiring).toHaveBeenCalledTimes(3);

  unbind();
  focusManager.setFocused(undefined);
});
