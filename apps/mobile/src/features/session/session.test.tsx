import type { LoginReceiver, Session } from '@scaleway-manager/core';
import { Text } from '@scaleway-manager/ui';
import { onlineManager, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { Slot } from 'expo-router';
import { userEvent } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
// Types for Reanimated's jest matchers (toHaveAnimatedStyle)
import type {} from 'react-native-reanimated/lib/typescript/jestUtils/index.native';

import TabsLayout from '../../../app/(tabs)/_layout';
import Account from '../../../app/(tabs)/account';
import Home from '../../../app/(tabs)/home';
import Index from '../../../app/index';
import Welcome from '../../../app/welcome';
import { AppearanceProvider } from '../appearance/AppearanceProvider';
import { ToastProvider } from '../feedback/ToastProvider';
import { LockProvider } from '../lock/LockProvider';
import { SplashHandOverContext } from '../splash/SplashHandOver';
import { WorkspaceProvider } from '../workspace/WorkspaceProvider';
import type { SplashHandOver } from '../splash/SplashHandOver';
import { layOutLogoSlot, LOGO_PLACE, mockLogoPlace } from '../../test-utils/logoPlace';
import { createQueryClient } from '../../wiring/queryClient';
import { createServices } from '../../wiring/services';
import type { Services } from '../../wiring/services';
import { ServicesProvider, useServices } from '../../wiring/ServicesProvider';
import { SessionProvider, useSession } from './SessionProvider';
import { useSignedOutRedirect } from './useSignedOutRedirect';

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const SESSION: Session = {
  token: 'token',
  renewToken: 'renew',
  sessionId: 'session',
  userId: 'user',
  expiresAt: '2099-01-01T00:00:00.000Z',
};

const CALLBACK = 'http://localhost:47815/callback?token=abc';

let services: Services;
let fetchMock: jest.Mock;
let receiver: LoginReceiver;
let saved: Map<string, string>;

// Real-mode services with a fake network, fake storage and a fake login receiver and browser.
const makeServices = (storedSession: Session | null = null): Services => {
  let stored = storedSession;
  saved = new Map([['sm.query-cache', 'old data']]);
  fetchMock = jest.fn(async () => {
    throw new Error('Tests have no network');
  });
  receiver = {
    callbackUrl: 'http://localhost:47815/callback',
    nextCallback: () => new Promise<string>(() => {}),
    received: () => null,
    stop: jest.fn(async () => {}),
  };
  const base = createServices('real', {
    fetch: fetchMock,
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
      load: async () => stored,
      save: async (next) => {
        stored = next;
      },
      clear: async () => {
        stored = null;
      },
    },
    biometric: { isAvailable: async () => false, authenticate: async () => false },
  });

  return {
    ...base,
    receiver: { start: jest.fn(async () => receiver) },
    browser: { open: jest.fn(async () => 'cancelled' as const), close: jest.fn(async () => {}) },
  };
};

let queryClient = createQueryClient();

beforeEach(() => {
  services = makeServices();
  queryClient = createQueryClient();
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
                <ToastProvider>{children}</ToastProvider>
              </WorkspaceProvider>
            </SafeAreaProvider>
          </QueryClientProvider>
        </AppearanceProvider>
      </SessionProvider>
    </ServicesProvider>
  );
}

// Shows which mode the app is in.
function HomeStub() {
  const { mode } = useServices();

  return <Text variant="body">{`Home in ${mode} mode`}</Text>;
}

function WelcomeWithMode() {
  const { mode } = useServices();

  return (
    <>
      <Welcome />

      <Text variant="caption">{`Welcome in ${mode} mode`}</Text>
    </>
  );
}

// Shows the session status.
function StatusProbe() {
  const { status } = useSession();

  return <Text variant="body">{`Status ${status}`}</Text>;
}

// Account's Face ID row and sheets go through the app's one lock
function AccountWithLock() {
  return (
    <LockProvider>
      <Account />
    </LockProvider>
  );
}

// The root layout's sign-out guard, around the routes
function Root() {
  useSignedOutRedirect();

  return <Slot />;
}

const routes = {
  _layout: Root,
  index: Index,
  welcome: WelcomeWithMode,
  '(tabs)/_layout': TabsLayout,
  '(tabs)/home': HomeStub,
  '(tabs)/account': AccountWithLock,
};

const SOMETHING_WRONG = 'Something went wrong. Try again.';

// The router uses fake timers, so let pending promises finish inside act.
const settle = () =>
  act(async () => {
    await jest.advanceTimersByTimeAsync(50);
  });

// Quick taps on Welcome's logo, one right after the other
async function tapLogo(user: ReturnType<typeof userEvent.setup>, times: number) {
  for (let tap = 0; tap < times; tap += 1) {
    await user.press(screen.getByTestId('logo-mark'));
  }
}

test('Welcome shows the login button and demo link when online', async () => {
  await renderRouter(routes, { initialUrl: '/welcome', wrapper: Providers });
  await settle();

  expect(screen.getByText('Scaleway Manager')).toBeOnTheScreen();
  expect(screen.getByText('Check on your Scaleway cloud from your phone.')).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Log in with Scaleway' })).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Try the demo' })).toBeOnTheScreen();
});

test("Welcome's purple has the dot grid behind it", async () => {
  await renderRouter(routes, { initialUrl: '/welcome', wrapper: Providers });
  await settle();

  expect(screen.getByTestId('header-dots', { includeHiddenElements: true })).toBeOnTheScreen();
});

test('Welcome keeps the login button but turns it off when offline, and says why', async () => {
  onlineManager.setOnline(false);
  await renderRouter(routes, { initialUrl: '/welcome', wrapper: Providers });
  await settle();

  expect(screen.getByRole('button', { name: 'Log in with Scaleway' })).toBeDisabled();
  expect(screen.getByText("You're offline. Connect to the internet to log in.")).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Try the demo' })).toBeEnabled();
});

test("cancelling Scaleway's page returns to Welcome without an error", async () => {
  await renderRouter(routes, { initialUrl: '/welcome', wrapper: Providers });
  await settle();
  await act(async () => {
    fireEvent.press(screen.getByRole('button', { name: 'Log in with Scaleway' }));
  });
  await settle();

  expect(screen).toHavePathname('/welcome');
  expect(screen.queryByText("Login didn't work. Please try again.")).not.toBeOnTheScreen();
  expect(receiver.stop).toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Log in with Scaleway' })).toBeEnabled();
});

test('shows the login error when the login fails', async () => {
  (services.receiver.start as jest.Mock).mockRejectedValue(new Error('NO_PORT'));
  await renderRouter(routes, { initialUrl: '/welcome', wrapper: Providers });
  await settle();
  await act(async () => {
    fireEvent.press(screen.getByRole('button', { name: 'Log in with Scaleway' }));
  });
  await settle();

  expect(screen.getByText("Login didn't work. Please try again.")).toBeOnTheScreen();
  expect(screen.getByText("Login didn't work. Please try again.").props.accessibilityLiveRegion).toBe('polite');
  expect(screen).toHavePathname('/welcome');
});

test('an old login error is gone once the user is signed in', async () => {
  (services.receiver.start as jest.Mock).mockRejectedValue(new Error('NO_PORT'));
  await renderRouter(routes, { initialUrl: '/welcome', wrapper: Providers });
  await settle();
  await act(async () => {
    fireEvent.press(screen.getByRole('button', { name: 'Log in with Scaleway' }));
  });
  await settle();

  expect(screen.getByText("Login didn't work. Please try again.")).toBeOnTheScreen();

  // Signed in through the demo, then back on Welcome: the old error doesn't show again
  await act(async () => {
    fireEvent.press(screen.getByRole('button', { name: 'Try the demo' }));
  });
  await settle();
  await act(async () => {
    fireEvent.press(screen.getByRole('tab', { name: 'Account' }));
  });
  await settle();
  await act(async () => {
    fireEvent.press(screen.getByRole('button', { name: 'Exit demo' }));
  });
  await settle();

  expect(screen).toHavePathname('/welcome');
  expect(screen.queryByText("Login didn't work. Please try again.")).not.toBeOnTheScreen();
});

test('successful login stores the session and opens Home', async () => {
  receiver.nextCallback = async () => CALLBACK;
  const startFromCallback = jest.spyOn(services.keeper, 'startFromCallback').mockImplementation(async () => {
    await services.keeper.start(SESSION);

    return SESSION;
  });
  await renderRouter(routes, { initialUrl: '/welcome', wrapper: Providers });
  await settle();
  await act(async () => {
    fireEvent.press(screen.getByRole('button', { name: 'Log in with Scaleway' }));
  });
  await settle();

  expect(startFromCallback).toHaveBeenCalledWith(CALLBACK);
  expect(screen).toHavePathname('/home');
});

test('a second tap while logging in does nothing', async () => {
  await renderRouter(routes, { initialUrl: '/welcome', wrapper: Providers });
  await settle();
  // The browser stays open until we say so.
  let finish: (value: 'cancelled') => void = () => {};
  (services.browser.open as jest.Mock).mockReturnValue(
    new Promise((resolve) => {
      finish = resolve;
    }),
  );
  const press = () => fireEvent.press(screen.getByRole('button', { name: 'Log in with Scaleway' }));

  // Both taps land before the screen re-renders, so only the hook's own guard can stop the second.
  await act(async () => {
    press();
    press();
  });
  await settle();

  expect(screen.getByRole('button', { name: 'Try the demo' })).toBeDisabled();

  await act(async () => {
    finish('cancelled');
  });
  await settle();

  expect(services.receiver.start).toHaveBeenCalledTimes(1);
});

test('Try the demo switches to demo mode and opens Home', async () => {
  await renderRouter(routes, { initialUrl: '/welcome', wrapper: Providers });
  await settle();
  await act(async () => {
    fireEvent.press(screen.getByRole('button', { name: 'Try the demo' }));
  });
  await settle();

  expect(screen).toHavePathname('/home');
  expect(screen.getByText('Home in demo mode')).toBeOnTheScreen();
});

test('a failing Try the demo stays on Welcome and says something went wrong', async () => {
  jest.spyOn(services.preferences, 'update').mockRejectedValue(new Error('disk full'));
  await renderRouter(routes, { initialUrl: '/welcome', wrapper: Providers });
  await settle();
  await act(async () => {
    fireEvent.press(screen.getByRole('button', { name: 'Try the demo' }));
  });
  await settle();

  expect(screen).toHavePathname('/welcome');
  expect(screen.getByText(SOMETHING_WRONG)).toBeOnTheScreen();
  expect(screen.getByText(SOMETHING_WRONG).props.accessibilityLiveRegion).toBe('polite');
});

// Home draws the project picker, which hides while the lock covers the app
function HomeWithLock() {
  return (
    <LockProvider>
      <Home />
    </LockProvider>
  );
}

test('opening offline with a stored session goes to Home, whose request waits for the network', async () => {
  services = makeServices(SESSION);
  onlineManager.setOnline(false);
  await renderRouter({ ...routes, '(tabs)/home': HomeWithLock }, { initialUrl: '/', wrapper: Providers });
  await settle();

  expect(screen).toHavePathname('/home');
  expect(queryClient.getQueryState(['account', 'me'])?.fetchStatus).toBe('paused');
  expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(0);
  expect(fetchMock).not.toHaveBeenCalled();
});

test('opening with no stored session goes to Welcome', async () => {
  await renderRouter(routes, { initialUrl: '/', wrapper: Providers });
  await settle();

  expect(screen).toHavePathname('/welcome');
});

// The root layout wipes the data on every sign-out: see root-layout.test.tsx.
test('Log out clears the session and returns to Welcome', async () => {
  services = makeServices(SESSION);
  const signOut = jest.spyOn(services.keeper, 'signOut');
  await renderRouter(routes, { initialUrl: '/account', wrapper: Providers });
  await settle();
  await act(async () => {
    fireEvent.press(screen.getByRole('button', { name: 'Log out' }));
  });
  await settle();

  expect(signOut).toHaveBeenCalled();
  expect(await services.keeper.current()).toBeNull();
  expect(screen).toHavePathname('/welcome');
});

test('Exit demo returns to Welcome in real mode', async () => {
  services = createServices('demo', { kv: makeServices().kv });
  await renderRouter(routes, { initialUrl: '/account', wrapper: Providers });
  await settle();

  expect(screen.queryByRole('button', { name: 'Log out' })).not.toBeOnTheScreen();

  await act(async () => {
    fireEvent.press(screen.getByRole('button', { name: 'Exit demo' }));
  });
  await settle();

  expect(screen).toHavePathname('/welcome');
  expect(screen.getByText('Welcome in real mode')).toBeOnTheScreen();
  expect(saved.get('sm.query-cache')).toBeUndefined();
});

test('a second tap on Log out does nothing', async () => {
  services = makeServices(SESSION);
  const signOut = jest.spyOn(services.keeper, 'signOut');
  await renderRouter(routes, { initialUrl: '/account', wrapper: Providers });
  await settle();
  const row = screen.getByRole('button', { name: 'Log out' });
  await act(async () => {
    fireEvent.press(row);
    fireEvent.press(row);
  });
  await settle();

  expect(signOut).toHaveBeenCalledTimes(1);
});

test('a failing Log out keeps the user on Account and says something went wrong', async () => {
  services = makeServices(SESSION);
  jest.spyOn(services.keeper, 'signOut').mockRejectedValue(new Error('nope'));
  await renderRouter(routes, { initialUrl: '/account', wrapper: Providers });
  await settle();

  expect(screen.queryByText(SOMETHING_WRONG)).not.toBeOnTheScreen();

  await act(async () => {
    fireEvent.press(screen.getByRole('button', { name: 'Log out' }));
  });
  await settle();

  expect(screen).toHavePathname('/account');
  expect(screen.getByText(SOMETHING_WRONG)).toBeOnTheScreen();
  expect(screen.getByText(SOMETHING_WRONG).props.accessibilityLiveRegion).toBe('polite');
});

test('a late saved-session read does not undo a session change', async () => {
  let late: (session: Session | null) => void = () => {};
  let notify: (session: Session | null) => void = () => {};
  jest.spyOn(services.keeper, 'current').mockReturnValue(
    new Promise((resolve) => {
      late = resolve;
    }),
  );
  jest.spyOn(services.keeper, 'subscribe').mockImplementation((listener) => {
    notify = listener;

    return () => {};
  });
  await renderRouter({ index: StatusProbe }, { initialUrl: '/', wrapper: Providers });
  await settle();
  await act(async () => {
    notify(SESSION);
  });
  await act(async () => {
    late(null);
  });
  await settle();

  expect(screen.getByText('Status signed-in')).toBeOnTheScreen();
});

describe("the logo's hidden triple tap", () => {
  test('every build shows both buttons: Log in, then Try the demo, last in the column', async () => {
    await renderRouter(routes, { initialUrl: '/welcome', wrapper: Providers });
    await settle();

    expect(screen.getAllByRole('button')).toHaveLength(2);

    const demo = screen.getByRole('button', { name: 'Try the demo' });
    const children = demo.parent?.children ?? [];

    expect(children[children.length - 1]).toBe(demo);
  });

  test('three quick taps on the logo start the demo', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    await renderRouter(routes, { initialUrl: '/welcome', wrapper: Providers });
    await settle();
    await act(async () => {
      await tapLogo(user, 3);
    });
    await settle();

    expect(screen).toHavePathname('/home');
    expect(screen.getByText('Home in demo mode')).toBeOnTheScreen();
  });

  test('two taps, slow taps or a long press on the logo do nothing', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    await renderRouter(routes, { initialUrl: '/welcome', wrapper: Providers });
    await settle();
    await act(async () => {
      await tapLogo(user, 2);
      jest.advanceTimersByTime(1000);
      await tapLogo(user, 1);
      jest.advanceTimersByTime(1000);
      await tapLogo(user, 1);
      jest.advanceTimersByTime(1000);
      await user.longPress(screen.getByTestId('logo-mark'), { duration: 3000 });
    });
    await settle();

    expect(screen).toHavePathname('/welcome');
    expect(screen.getByText('Welcome in real mode')).toBeOnTheScreen();
  });

  test('a failing demo start from the logo shows the same failure line', async () => {
    jest.spyOn(services.preferences, 'update').mockRejectedValue(new Error('disk full'));
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    await renderRouter(routes, { initialUrl: '/welcome', wrapper: Providers });
    await settle();
    await act(async () => {
      await tapLogo(user, 3);
    });
    await settle();

    expect(screen).toHavePathname('/welcome');
    expect(screen.getByText(SOMETHING_WRONG)).toBeOnTheScreen();
  });

  test('the logo is not exposed to screen readers', async () => {
    await renderRouter(routes, { initialUrl: '/welcome', wrapper: Providers });
    await settle();

    expect(screen.getByTestId('logo-mark').props.accessible).toBe(false);
    expect(screen.getByTestId('logo-mark').props.importantForAccessibility).toBe('no');
    expect(screen.queryByLabelText('Scaleway Manager')).toBeNull();
  });
});

describe('the demo button and the triple tap together', () => {
  test('the logo triple tap also starts the demo, and the logo stays hidden from screen readers', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    await renderRouter(routes, { initialUrl: '/welcome', wrapper: Providers });
    await settle();

    expect(screen.getByTestId('logo-mark').props.accessible).toBe(false);
    expect(screen.getAllByRole('button')).toHaveLength(2);

    await act(async () => {
      await tapLogo(user, 3);
    });
    await settle();

    expect(screen.getByText('Home in demo mode')).toBeOnTheScreen();
  });
});

describe('the splash hand-over', () => {
  const reportLogo = jest.fn();

  // Welcome as SplashGate shows it while the splash is up
  const underSplash = (handOver: Pick<SplashHandOver, 'entrance' | 'logoHidden'>) =>
    function WelcomeUnderSplash() {
      return (
        <SplashHandOverContext.Provider value={{ ...handOver, reportLogo, reportHeaderHeight: jest.fn() }}>
          <Welcome />
        </SplashHandOverContext.Provider>
      );
    };

  const entrances = () => screen.getAllByTestId('splash-entrance');

  beforeEach(() => {
    mockLogoPlace();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    reportLogo.mockClear();
  });

  test('under the splash, Welcome hides its logo and its content, and says where its logo is', async () => {
    await renderRouter(
      { ...routes, welcome: underSplash({ entrance: 'hidden', logoHidden: true }) },
      { initialUrl: '/welcome', wrapper: Providers },
    );
    await settle();

    expect(screen.getByTestId('splash-logo-slot')).toHaveStyle({ opacity: 0 });
    expect(entrances()).toHaveLength(3);

    for (const entrance of entrances()) {
      expect(entrance).toHaveAnimatedStyle({ opacity: 0 });
    }

    await layOutLogoSlot();

    expect(reportLogo).toHaveBeenCalledWith('welcome', LOGO_PLACE);
  });

  test('as the splash leaves, the title, the text and the buttons come in one after another', async () => {
    await renderRouter(
      { ...routes, welcome: underSplash({ entrance: 'enter', logoHidden: true }) },
      { initialUrl: '/welcome', wrapper: Providers },
    );
    const [title, text, buttons] = entrances();

    expect(title).toHaveTextContent('Scaleway Manager');
    expect(text).toHaveTextContent('Check on your Scaleway cloud from your phone.');
    expect(buttons).toHaveTextContent(/^Log in with Scaleway/);

    await act(async () => {
      await jest.advanceTimersByTimeAsync(300);
    });

    // The title has started, the buttons not yet
    expect(title).not.toHaveAnimatedStyle({ opacity: 0 });
    expect(buttons).toHaveAnimatedStyle({ opacity: 0 });

    await act(async () => {
      await jest.advanceTimersByTimeAsync(1000);
    });

    for (const entrance of entrances()) {
      expect(entrance).toHaveAnimatedStyle({ opacity: 1, transform: [{ translateY: 0 }] });
    }

    // Its own logo waits for the splash's to land and go
    expect(screen.getByTestId('splash-logo-slot')).toHaveStyle({ opacity: 0 });
  });

  test('without a splash (after Log out, for example), Welcome shows everything at once', async () => {
    await renderRouter(routes, { initialUrl: '/welcome', wrapper: Providers });
    await settle();

    expect(screen.getByTestId('splash-logo-slot')).toHaveStyle({ opacity: 1 });

    for (const entrance of entrances()) {
      expect(entrance).toHaveAnimatedStyle({ opacity: 1, transform: [{ translateY: 0 }] });
    }
  });
});
