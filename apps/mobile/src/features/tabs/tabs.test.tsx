import type { Session } from '@scaleway-manager/core';
import { lightColors, Text } from '@scaleway-manager/ui';
import { onlineManager, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, renderRouter, screen, within } from 'expo-router/testing-library';
import { Slot } from 'expo-router';
import type { ReactNode } from 'react';
import { AccessibilityInfo } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { createQueryClient } from '../../wiring/queryClient';
import { createServices } from '../../wiring/services';
import { ServicesProvider } from '../../wiring/ServicesProvider';
import { AppearanceProvider } from '../appearance/AppearanceProvider';
import { ToastProvider } from '../feedback/ToastProvider';
import { LockProvider } from '../lock/LockProvider';
import { SessionProvider } from '../session/SessionProvider';
import { useSignedOutRedirect } from '../session/useSignedOutRedirect';
import { WorkspaceProvider } from '../workspace/WorkspaceProvider';
import Account from '../../../app/(tabs)/account';
import Billing from '../../../app/(tabs)/billing';
import Home from '../../../app/(tabs)/home';
import TabsLayout from '../../../app/(tabs)/_layout';
import Resources from '../../../app/(tabs)/resources';
import * as ResourcesLayout from '../../../app/(tabs)/resources/_layout';

const SESSION: Session = {
  token: 'token',
  renewToken: 'renew',
  sessionId: 'session',
  userId: 'user',
  expiresAt: '2099-01-01T00:00:00.000Z',
};

// Real-mode services with a fake session store and no network.
const realServices = (session: Session | null) =>
  createServices('real', {
    fetch: async () => {
      throw new Error('Tests have no network');
    },
    store: { load: async () => session, save: async () => {}, clear: async () => {} },
  });

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

// A store screenshots build (EXPO_PUBLIC_SCREENSHOTS=1) when true
let mockScreenshotBuild = false;
jest.mock('../../wiring/buildConfig', () => ({
  get screenshotBuild() {
    return mockScreenshotBuild;
  },
}));

let services = createServices('demo');
let queryClient = createQueryClient();

// Fresh demo services (signed in as the demo user) and cache for each test.
beforeEach(() => {
  mockScreenshotBuild = false;
  services = createServices('demo');
  queryClient = createQueryClient();
  // Failures show at once.
  queryClient.setDefaultOptions({ queries: { retry: false } });
  onlineManager.setOnline(true);
});

afterEach(() => {
  jest.useRealTimers();
});

function Providers({ children }: { children: ReactNode }) {
  return (
    <ServicesProvider initial={services}>
      <SessionProvider>
        <AppearanceProvider initial="light">
          <QueryClientProvider client={queryClient}>
            <SafeAreaProvider initialMetrics={METRICS}>
              <WorkspaceProvider>
                <LockProvider>
                  <ToastProvider>{children}</ToastProvider>
                </LockProvider>
              </WorkspaceProvider>
            </SafeAreaProvider>
          </QueryClientProvider>
        </AppearanceProvider>
      </SessionProvider>
    </ServicesProvider>
  );
}

function WelcomeStub() {
  return <Text variant="body">Welcome</Text>;
}

// The root layout's sign-out guard, around the routes
function Root() {
  useSignedOutRedirect();

  return <Slot />;
}

const routes = {
  _layout: Root,
  welcome: WelcomeStub,
  '(tabs)/_layout': TabsLayout,
  '(tabs)/home': Home,
  '(tabs)/resources/_layout': ResourcesLayout,
  '(tabs)/resources/index': Resources,
  '(tabs)/billing': Billing,
  '(tabs)/account': Account,
};

// The router uses fake timers, so let Home's query finish inside act.
const settle = () =>
  act(async () => {
    await jest.advanceTimersByTimeAsync(50);
  });

test('tab bar switches screens', async () => {
  await renderRouter(routes, { initialUrl: '/home', wrapper: Providers });

  await settle();
  await act(async () => {
    fireEvent.press(screen.getByRole('tab', { name: 'Billing' }));
  });

  expect(await screen.findByRole('header', { name: 'Billing' })).toBeOnTheScreen();
});

test("Home shows this month's spending for the demo organization", async () => {
  await renderRouter(routes, { initialUrl: '/home', wrapper: Providers });

  await settle();
  // The demo's running month, whatever today is
  expect(await screen.findByText('€84.60')).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Acme · Production' })).toBeOnTheScreen();
});

test('Home says when the account can\'t be loaded', async () => {
  services = {
    ...services,
    account: {
      getCurrentUser: async () => {
        throw new Error('nope');
      },
    },
  };
  await renderRouter(routes, { initialUrl: '/home', wrapper: Providers });
  await settle();

  expect(await screen.findByText("Couldn't load your spending")).toBeOnTheScreen();
});

test('the layout floats the offline pill in a FloatingNotice', async () => {
  services = realServices(SESSION);
  onlineManager.setOnline(false);
  await renderRouter(routes, { initialUrl: '/home', wrapper: Providers });
  await settle();

  expect(within(screen.getByTestId('floating-notice')).getByText("You're offline")).toBeOnTheScreen();
});

test('demo mode shows a Demo badge where the offline pill goes, even offline', async () => {
  onlineManager.setOnline(false);
  await renderRouter(routes, { initialUrl: '/home', wrapper: Providers });
  await settle();

  const notice = within(screen.getByTestId('floating-notice'));

  expect(notice.getByText('Demo')).toBeOnTheScreen();
  expect(notice.getByTestId('pill')).toHaveStyle({ backgroundColor: lightColors.inverseBadge });
  expect(notice.queryByText(/You're offline/)).not.toBeOnTheScreen();

  await act(async () => {
    fireEvent.press(screen.getByRole('tab', { name: 'Account' }));
  });

  expect(within(screen.getByTestId('floating-notice')).getByText('Demo')).toBeOnTheScreen();
});

test('screen readers hear "Demo mode" when the tabs open in demo mode, and not again on every tab', async () => {
  // Only the app's own calls are counted
  const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
  const announced = () => announce.mock.calls.filter(([text]) => text === 'Demo mode').length;
  await renderRouter(routes, { initialUrl: '/home', wrapper: Providers });
  await settle();
  const atLaunch = announced();

  expect(atLaunch).toBeGreaterThan(0);

  await act(async () => {
    fireEvent.press(screen.getByRole('tab', { name: 'Billing' }));
  });
  await settle();
  await act(async () => {
    fireEvent.press(screen.getByRole('tab', { name: 'Home' }));
  });
  await settle();

  expect(announced()).toBe(atLaunch);
  announce.mockRestore();
});

test('a screenshots build hides the Demo badge and says nothing, but stays in the demo', async () => {
  mockScreenshotBuild = true;
  const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
  await renderRouter(routes, { initialUrl: '/home', wrapper: Providers });
  await settle();

  expect(within(screen.getByTestId('floating-notice')).queryByText('Demo')).not.toBeOnTheScreen();
  expect(announce).not.toHaveBeenCalledWith('Demo mode');
  // Still the demo's data
  expect(await screen.findByText('€84.60')).toBeOnTheScreen();
  announce.mockRestore();
});

test('real mode has no Demo badge', async () => {
  services = realServices(SESSION);
  await renderRouter(routes, { initialUrl: '/home', wrapper: Providers });
  await settle();

  expect(within(screen.getByTestId('floating-notice')).queryByText('Demo')).not.toBeOnTheScreen();
});

test('opening a tab while signed out goes to Welcome', async () => {
  services = realServices(null);
  await renderRouter(routes, { initialUrl: '/billing', wrapper: Providers });
  await settle();

  expect(screen).toHavePathname('/welcome');
});

test('signing out from a tab goes back to Welcome', async () => {
  await renderRouter(routes, { initialUrl: '/home', wrapper: Providers });
  await settle();
  await act(async () => {
    await services.keeper.signOut();
  });
  await settle();

  expect(screen).toHavePathname('/welcome');
});
