import { monthKeyOf } from '@scaleway-manager/core';
import { Button, homeHeaderLayout, sizes, Text } from '@scaleway-manager/ui';
import { act, fireEvent, screen } from '@testing-library/react-native';
import { createElement as mockElement } from 'react';
import { Dimensions } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { renderWithApp } from '../../test-utils/renderWithApp';
import * as gate from './SplashGate';
import { SPLASH_MAX_MS, SPLASH_MIN_MS, SPLASH_MIN_REDUCED_MS, SplashGate } from './SplashGate';
import { useHomeHandOver, useSplashHandOver } from './SplashHandOver';

const mockHideAsync = jest.fn();
const onFinished = jest.fn();
let mockStatus: 'loading' | 'signed-out' | 'signed-in' = 'signed-in';
let mockLock = { locked: false, decided: true };
// Lets a test change the lock while the app is up (Face ID unlocking mid-way)
const mockLockListeners = new Set<() => void>();

jest.mock('react-native-reanimated', () => ({
  __esModule: true,
  ...jest.requireActual('react-native-reanimated'),
  useReducedMotion: jest.fn(() => false),
}));
jest.mock('expo-splash-screen', () => ({ hideAsync: () => mockHideAsync(), preventAutoHideAsync: jest.fn() }));
jest.mock('../session/SessionProvider', () => ({
  SessionProvider: ({ children }: { children: unknown }) => children,
  useSession: () => ({ status: mockStatus, session: null }),
}));
jest.mock('../lock/LockProvider', () => ({
  useLockState: () =>
    jest.requireActual('react').useSyncExternalStore(
      (listener: () => void) => {
        mockLockListeners.add(listener);

        return () => mockLockListeners.delete(listener);
      },
      () => mockLock,
    ),
}));
jest.mock('@scaleway-manager/ui', () => {
  return {
    ...jest.requireActual('@scaleway-manager/ui'),
    // Shows the props it gets; a press finishes it
    AnimatedSplash: ({ onFinished: finish, ...props }: { onFinished: () => void }) =>
      mockElement('Text', { testID: 'splash', onPress: finish }, JSON.stringify(props)),
  };
});

type SplashProps = {
  phase: string;
  target: string;
  headerHeight: number;
  logoTarget?: { x: number; y: number; width: number; height: number };
};

const read = () => JSON.parse(String(screen.getByTestId('splash').props.children)) as SplashProps;

// Home's header on the test phone (status bar 47) at Jest's text size: where the purple lands
const HEADER = homeHeaderLayout(47, Dimensions.get('window').fontScale).height;

// Where Welcome's and the lock screen's logos sit on a 390 x 844 phone
const WELCOME_LOGO = { x: 20, y: 91, width: sizes.logoHero, height: 84.7 };
const LOCK_LOGO = { x: 20, y: 91.5, width: sizes.logoHero, height: 84.7 };

// A screen taking part in the hand-over: it shows what the splash tells it, and reports its logo on demand.
function Screen() {
  const welcome = useSplashHandOver('welcome');
  const lock = useSplashHandOver('lock');
  const home = useHomeHandOver();

  return (
    <>
      <Text variant="body">{`content ${welcome.entrance}, logo ${welcome.logoHidden ? 'hidden' : 'shown'}`}</Text>

      <Button label="Welcome laid out" size="md" onPress={() => welcome.onLogoPlace(WELCOME_LOGO)} />

      <Button label="Lock laid out" size="md" onPress={() => lock.onLogoPlace(LOCK_LOGO)} />

      <Button label="Home's header laid out" size="md" onPress={() => home.reportHeaderHeight(420)} />
    </>
  );
}

const mount = async () => {
  const result = await renderWithApp(
    <SplashGate onFinished={onFinished}>
      <Screen />
    </SplashGate>,
  );

  return result;
};

type Mounted = Awaited<ReturnType<typeof mount>>;

const settleAccount = async ({ queryClient }: Mounted) => {
  await act(async () => {
    queryClient.setQueryData(['account', 'me'], { id: 'u-1', email: 'me@example.com', organizationId: 'org' });
  });
};

// This month's spending and the workspace have loaded (or failed): Home has what its header shows
const settleHome = async (mounted: Mounted) => {
  const { queryClient, services } = mounted;
  const month = monthKeyOf(services.clock.now());

  await settleAccount(mounted);
  await act(async () => {
    queryClient.setQueryData(['workspace', 'org', 'org'], { id: 'org', name: 'Acme' });
    queryClient.setQueryData(['workspace', 'projects', 'org'], []);
    queryClient.setQueryData(['spending', 'org', month], {
      month,
      total: { minor: 8460, currency: 'EUR' },
      byProduct: [],
      byProject: [],
      discount: { minor: 0, currency: 'EUR' },
    });
  });
};

const advance = async (ms: number) => {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
};

// The screen reports where its logo is (as a real screen does once laid out)
const layOut = async (which: 'Welcome' | 'Lock') => {
  await act(async () => {
    fireEvent.press(screen.getByRole('button', { name: `${which} laid out`, includeHiddenElements: true }));
  });
};

const setLock = async (next: typeof mockLock) => {
  await act(async () => {
    mockLock = next;
    mockLockListeners.forEach((listener) => listener());
  });
};

const finishSplash = async () => {
  await act(async () => {
    screen.getByTestId('splash').props.onPress();
  });
};

const shown = (text: string) => screen.getByText(text, { includeHiddenElements: true });

beforeEach(() => {
  jest.useFakeTimers();
  mockLockListeners.clear();
  mockHideAsync.mockClear();
  onFinished.mockClear();
  mockStatus = 'signed-in';
  mockLock = { locked: false, decided: true };
});

afterEach(() => {
  jest.mocked(useReducedMotion).mockReturnValue(false);
  jest.useRealTimers();
});

test('holds the finished name until 1350 ms, even when the app is ready sooner', async () => {
  const mounted = await mount();

  await advance(100);
  await settleHome(mounted);
  await advance(SPLASH_MIN_MS - 101);
  expect(SPLASH_MIN_MS).toBe(1350);
  expect(read().phase).toBe('waiting');
  await advance(1);
  expect(read().phase).toBe('leaving');
});

test('leaves after 2.5 s even if data never arrives', async () => {
  await mount();

  await advance(SPLASH_MAX_MS - 1);
  expect(read().phase).toBe('waiting');
  await advance(1);
  expect(read().phase).toBe('leaving');
});

test('with Reduce Motion it may leave at 800 ms', async () => {
  jest.mocked(useReducedMotion).mockReturnValue(true);
  const mounted = await mount();

  await settleHome(mounted);
  await advance(SPLASH_MIN_REDUCED_MS - 1);
  expect(SPLASH_MIN_REDUCED_MS).toBe(800);
  expect(read().phase).toBe('waiting');
  await advance(1);
  expect(read().phase).toBe('leaving');
});

test('lands on the Home header when signed in', async () => {
  await mount();

  expect(read()).toMatchObject({ target: 'header' });
  expect(read().logoTarget).toBeUndefined();
});

test("the purple lands exactly on Home's header, as tall as homeHeaderLayout makes it for this phone", async () => {
  const { fontScale } = Dimensions.get('window');
  await mount();

  expect(read().headerHeight).toBe(homeHeaderLayout(47, fontScale).height);
  // Not the old fixed 290: it follows the status bar and the text size, like the header
  expect(read().headerHeight).not.toBe(290);
  expect(homeHeaderLayout(47, fontScale + 1).height).toBeGreaterThan(read().headerHeight);
});

test("lands on the header's real height once Home has laid it out (a long name wrapped, or it made room offline)", async () => {
  await mount();

  expect(read().headerHeight).toBe(HEADER);

  await act(async () => {
    fireEvent.press(screen.getByRole('button', { name: "Home's header laid out", includeHiddenElements: true }));
  });

  expect(read().headerHeight).toBe(420);
});

test("waits for this month's spending and the workspace, not just the account", async () => {
  const mounted = await mount();

  await settleAccount(mounted);
  await advance(SPLASH_MIN_MS);
  expect(read().phase).toBe('waiting');

  await settleHome(mounted);
  // The cache tells its watchers on the next tick
  await advance(1);
  expect(read().phase).toBe('leaving');
});

test("doesn't wait for the spending when the account can't be loaded: Home says so itself", async () => {
  const { queryClient } = await mount();

  await act(async () => {
    const account = queryClient.getQueryCache().find({ queryKey: ['account', 'me'] });
    account?.setState({ status: 'error', error: new Error('Down') });
  });
  await advance(SPLASH_MIN_MS);
  expect(read().phase).toBe('leaving');
});

test("signed out, it waits for Welcome's logo, then glides to it", async () => {
  mockStatus = 'signed-out';
  await mount();

  await advance(SPLASH_MIN_MS);
  expect(read().phase).toBe('waiting');

  await layOut('Welcome');
  expect(read()).toEqual({ phase: 'leaving', target: 'screen', headerHeight: HEADER, logoTarget: WELCOME_LOGO });
});

test("holds until 1350 ms even when Welcome's logo is known sooner", async () => {
  mockStatus = 'signed-out';
  await mount();

  await layOut('Welcome');
  await advance(SPLASH_MIN_MS - 1);
  expect(read().phase).toBe('waiting');
  await advance(1);
  expect(read().phase).toBe('leaving');
});

test("when locked, it glides to the lock screen's logo", async () => {
  mockLock = { locked: true, decided: true };
  await mount();

  await layOut('Welcome');
  await layOut('Lock');
  await advance(SPLASH_MIN_MS);
  expect(read()).toEqual({ phase: 'leaving', target: 'screen', headerHeight: HEADER, logoTarget: LOCK_LOGO });
});

test('lands on the lock cover while the lock is still deciding', async () => {
  mockLock = { locked: false, decided: false };
  await mount();

  expect(read()).toMatchObject({ target: 'screen' });
});

test("without the screen's logo, it leaves at 2.5 s, the logo fades out and the screen's own logo shows", async () => {
  mockStatus = 'signed-out';
  await mount();

  await advance(SPLASH_MAX_MS);
  expect(read()).toEqual({ phase: 'leaving', target: 'screen', headerHeight: HEADER });
  // Nothing glides into it, so it stays under the purple as it fades
  expect(shown('content enter, logo shown')).toBeTruthy();

  // A place that comes too late changes nothing
  await layOut('Welcome');
  expect(shown('content enter, logo shown')).toBeTruthy();
});

test('once the hand-over has started it never goes back, even when Face ID unlocks mid-way', async () => {
  mockLock = { locked: true, decided: true };
  await mount();

  await layOut('Lock');
  await advance(SPLASH_MIN_MS);
  expect(read()).toEqual({ phase: 'leaving', target: 'screen', headerHeight: HEADER, logoTarget: LOCK_LOGO });

  // Unlocked: the lock screen is gone and Home's account isn't loaded yet
  await setLock({ locked: false, decided: true });

  expect(read().phase).toBe('leaving');
  expect(read().logoTarget).toBeUndefined();
  expect(shown('content enter, logo hidden')).toBeTruthy();
});

test('waits for the lock decision before leaving', async () => {
  mockStatus = 'signed-out';
  mockLock = { locked: false, decided: false };
  await mount();

  await layOut('Lock');
  await advance(SPLASH_MAX_MS - 1);
  expect(read().phase).toBe('waiting');
});

test('has no loading dots any more', async () => {
  await mount();

  await advance(SPLASH_MAX_MS);
  expect(read()).not.toHaveProperty('showLoadingDots');
  expect(gate).not.toHaveProperty('SPLASH_DOTS_AFTER_MS');
});

test("screens hide their logo and content under the splash, bring the content in as it leaves, and show the logo once it's gone", async () => {
  mockStatus = 'signed-out';
  await mount();

  expect(shown('content hidden, logo hidden')).toBeTruthy();

  await layOut('Welcome');
  await advance(SPLASH_MIN_MS);
  expect(shown('content enter, logo hidden')).toBeTruthy();

  await finishSplash();
  expect(shown('content shown, logo shown')).toBeTruthy();
});

test('with Reduce Motion, screens show normally under the splash, which just fades', async () => {
  jest.mocked(useReducedMotion).mockReturnValue(true);
  mockStatus = 'signed-out';
  await mount();

  expect(shown('content shown, logo shown')).toBeTruthy();

  // No logo to wait for: nothing glides
  await advance(SPLASH_MIN_REDUCED_MS);
  expect(read()).toEqual({ phase: 'leaving', target: 'screen', headerHeight: HEADER });
});

test('without a splash, screens show normally', async () => {
  await renderWithApp(<Screen />);

  expect(screen.getByText('content shown, logo shown')).toBeOnTheScreen();
});

test('hides the native splash once and removes the overlay when finished', async () => {
  await mount();

  expect(mockHideAsync).toHaveBeenCalledTimes(1);

  await finishSplash();
  expect(screen.queryByTestId('splash')).toBeNull();
  expect(screen.getByText('content shown, logo shown')).toBeTruthy();
});

test('tells the root layout once it is done', async () => {
  await mount();

  expect(onFinished).not.toHaveBeenCalled();

  await finishSplash();

  expect(onFinished).toHaveBeenCalledTimes(1);
});

test('screen readers cannot reach the app until the splash is done', async () => {
  await mount();

  expect(screen.getByTestId('screen-reader-shield', { includeHiddenElements: true }).props.accessibilityElementsHidden).toBe(true);

  await finishSplash();
  expect(screen.getByTestId('screen-reader-shield', { includeHiddenElements: true }).props.accessibilityElementsHidden).toBe(false);
});
