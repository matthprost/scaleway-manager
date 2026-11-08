/// <reference types="node" />

import { DEFAULT_PREFERENCES } from '@scaleway-manager/core';
import type { Preferences, Session } from '@scaleway-manager/core';
import { motion, Text } from '@scaleway-manager/ui';
import { QueryClient } from '@tanstack/react-query';
import { persistQueryClientSave } from '@tanstack/react-query-persist-client';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { join } from 'path';
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import type { AppStateStatus } from 'react-native';

import TabsLayout from './app/(tabs)/_layout';
import * as RootLayout from './app/_layout';
import * as queryClientModule from './src/wiring/queryClient';
import { createServices } from './src/wiring/services';
import type { Services } from './src/wiring/services';

const mockStatusBar = jest.fn();
const mockScreenOptions = jest.fn();
let mockServices: Services;
let mockReduceMotion = false;

jest.mock('expo-splash-screen', () => ({ hideAsync: jest.fn(), preventAutoHideAsync: jest.fn() }));

jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { version: '3.0.0' } } }));

// Records the style the app asks for (the router uses the rest of the module).
jest.mock('expo-status-bar', () => ({
  ...jest.requireActual('expo-status-bar'),
  StatusBar: ({ style }: { style: string }) => {
    mockStatusBar(style);

    return null;
  },
}));

jest.mock('react-native-reanimated', () => ({
  __esModule: true,
  ...jest.requireActual('react-native-reanimated'),
  useReducedMotion: () => mockReduceMotion,
}));

// Records the navigator's options, then draws the real one.
jest.mock('expo-router', () => {
  const actual = jest.requireActual('expo-router');
  const { createElement } = jest.requireActual('react');
  const Stack = Object.assign((props: { screenOptions: unknown }) => {
    mockScreenOptions(props.screenOptions);

    return createElement(actual.Stack, props);
  }, actual.Stack);

  return { ...actual, Stack };
});

// The splash finishes when the test presses it.
jest.mock('@scaleway-manager/ui', () => {
  const { createElement } = jest.requireActual('react');

  return {
    ...jest.requireActual('@scaleway-manager/ui'),
    AnimatedSplash: ({ onFinished }: { onFinished: () => void }) =>
      createElement('Text', { testID: 'splash', onPress: onFinished }, 'Splash'),
  };
});

// The real root layout, with the test's services.
jest.mock('./src/wiring/ServicesProvider', () => {
  const actual = jest.requireActual('./src/wiring/ServicesProvider');
  const { createElement } = jest.requireActual('react');

  return {
    ...actual,
    ServicesProvider: ({ children }: { children: unknown }) =>
      createElement(actual.ServicesProvider, { initial: mockServices }, children),
  };
});

const SESSION: Session = {
  token: 'token',
  renewToken: 'renew',
  sessionId: 'session',
  userId: 'user',
  expiresAt: '2099-01-01T00:00:00.000Z',
};

const OLD_USER = { id: 'user', email: 'old@example.com', organizationId: 'org' };

// What the saved cache holds for that user's Home: the organization and its projects
const OLD_ORGANIZATION = { id: 'org', name: 'Old Org' };
const OLD_PROJECTS = [{ id: 'old-project', name: 'Old project', organizationId: 'org' }];

let saved: Map<string, string>;

type Setup = {
  session?: Session | null;
  lock?: Preferences['biometricLock'];
  appearance?: Preferences['appearance'];
  unlocks?: boolean;
  fetch?: typeof fetch;
};

// Real-mode services with fake storage, biometrics and network (by default the network never answers).
const makeServices = ({ session = null, lock = 'off', appearance = 'light', unlocks = true, fetch }: Setup = {}): Services => {
  let stored = session;
  let preferences: Preferences = { ...DEFAULT_PREFERENCES, biometricLock: lock, appearance };
  saved = new Map();
  const base = createServices('real', {
    fetch: fetch ?? (() => new Promise<Response>(() => {})),
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
    biometric: { isAvailable: async () => true, authenticate: async () => unlocks },
    connectivity: { isOnline: async () => true, subscribe: () => () => {} },
  });

  return {
    ...base,
    preferences: {
      read: async () => preferences,
      update: async (patch) => {
        preferences = { ...preferences, ...patch };

        return preferences;
      },
    },
  };
};

// A saved copy of the query cache, as an app of this `version` left it.
const saveCache = async (version: string) => {
  // No clean-up timer keeps Jest running.
  const queryClient = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } });
  queryClient.setQueryData(['account', 'me'], OLD_USER);
  queryClient.setQueryData(['workspace', 'org', 'org'], OLD_ORGANIZATION);
  queryClient.setQueryData(['workspace', 'projects', 'org'], OLD_PROJECTS);
  await persistQueryClientSave({
    queryClient,
    persister: queryClientModule.createQueryPersister(mockServices.kv),
    buster: version,
  });
};

// The router uses fake timers, so let pending promises finish inside act.
const settle = () =>
  act(async () => {
    await jest.advanceTimersByTimeAsync(50);
  });

const launch = async (initialUrl = '/') => {
  await renderRouter(join(__dirname, 'app'), { initialUrl });
  await settle();
};

const finishSplash = async () => {
  await act(async () => {
    screen.getByTestId('splash').props.onPress();
  });
  await settle();
};

const statusBarStyle = () => mockStatusBar.mock.lastCall?.[0];

// The platform tests run on, put back after a test that pretends to be another
const PLATFORM = Platform.OS;

beforeEach(() => {
  mockStatusBar.mockClear();
  mockScreenOptions.mockClear();
  mockReduceMotion = false;
});

afterEach(() => {
  Platform.OS = PLATFORM;
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('the status bar', () => {
  test('is light while the splash is up', async () => {
    mockServices = makeServices({ session: SESSION });
    await launch('/account');

    expect(statusBarStyle()).toBe('light');

    await finishSplash();

    expect(statusBarStyle()).toBe('dark');
  });

  test('is light while the lock cover is still deciding', async () => {
    mockServices = makeServices({ session: SESSION, lock: 'on' });
    mockServices.preferences.read = () => new Promise(() => {});
    await launch('/account');
    await finishSplash();

    expect(screen.getByTestId('overlay')).toBeOnTheScreen();
    expect(statusBarStyle()).toBe('light');
  });

  test('is light while the privacy cover is up (the app is away with the lock on)', async () => {
    const listeners = new Set<(state: AppStateStatus) => void>();
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
      listeners.add(listener);

      return { remove: () => listeners.delete(listener) };
    });
    mockServices = makeServices({ session: SESSION, lock: 'on' });
    await launch('/account');
    await finishSplash();

    expect(statusBarStyle()).toBe('dark');

    await act(async () => {
      listeners.forEach((listener) => listener('inactive'));
    });

    expect(statusBarStyle()).toBe('light');
  });

  test('is light while the app is locked', async () => {
    mockServices = makeServices({ session: SESSION, lock: 'on', unlocks: false });
    await launch('/account');
    await finishSplash();

    expect(screen.getByText('Scaleway Manager is locked')).toBeOnTheScreen();
    expect(statusBarStyle()).toBe('light');
  });

  test('is light on Welcome', async () => {
    mockServices = makeServices();
    await launch();
    await finishSplash();

    expect(screen).toHavePathname('/welcome');
    expect(statusBarStyle()).toBe('light');
  });

  test('is light on the Home tab and follows the theme on another tab (light mode)', async () => {
    mockServices = makeServices({ session: SESSION });
    await launch();
    await finishSplash();

    expect(screen).toHavePathname('/home');
    expect(statusBarStyle()).toBe('light');

    await act(async () => {
      fireEvent.press(screen.getByRole('tab', { name: 'Account' }));
    });
    await settle();

    expect(screen).toHavePathname('/account');
    expect(statusBarStyle()).toBe('dark');
  });

  test("on Home, follows the header while scrolling: light while it's under the status bar, the theme once it's gone", async () => {
    mockServices = makeServices({ session: SESSION });
    await launch();
    await finishSplash();
    const scrollTo = async (y: number) => {
      await act(async () => {
        fireEvent.scroll(screen.getByTestId('screen-scroll'), { nativeEvent: { contentOffset: { x: 0, y } } });
      });
    };

    await act(async () => {
      fireEvent(screen.getByTestId('header-gradient'), 'layout', {
        nativeEvent: { layout: { x: 0, y: 0, width: 390, height: 400 } },
      });
    });

    expect(statusBarStyle()).toBe('light');

    // Scrolled past the header: the light page is under the status bar
    await scrollTo(600);

    expect(statusBarStyle()).toBe('dark');

    await scrollTo(0);

    expect(statusBarStyle()).toBe('light');
  });

  test("on Billing, follows its own header while scrolling: light while it's under the status bar, the theme once it's gone", async () => {
    mockServices = makeServices({ session: SESSION });
    await launch('/billing');
    await finishSplash();
    const scrollTo = async (y: number) => {
      await act(async () => {
        fireEvent.scroll(screen.getByTestId('screen-scroll'), { nativeEvent: { contentOffset: { x: 0, y } } });
      });
    };

    expect(screen).toHavePathname('/billing');
    expect(statusBarStyle()).toBe('light');

    await act(async () => {
      fireEvent(screen.getByTestId('header-gradient'), 'layout', {
        nativeEvent: { layout: { x: 0, y: 0, width: 390, height: 400 } },
      });
    });
    await scrollTo(600);

    expect(statusBarStyle()).toBe('dark');

    await scrollTo(0);

    expect(statusBarStyle()).toBe('light');

    // Billing's report is its own: on Home, its header is still under the status bar
    await scrollTo(600);
    await act(async () => {
      fireEvent.press(screen.getByRole('tab', { name: 'Home' }));
    });
    await settle();

    expect(screen).toHavePathname('/home');
    expect(statusBarStyle()).toBe('light');
  });

  test.each([
    ['android', 'dark'],
    // The page sheet sits below a dark gap there, so light icons stay readable
    ['ios', 'light'],
  ] as const)('with a sheet up on Home (%s), the status bar is %s', async (platform, withSheet) => {
    const consoleError = jest.spyOn(console, 'error');
    Platform.OS = platform;
    mockServices = {
      ...makeServices({ session: SESSION }),
      account: { getCurrentUser: async () => OLD_USER },
      workspace: { getOrganization: async () => OLD_ORGANIZATION, listProjects: async () => OLD_PROJECTS },
    };
    await launch();
    await finishSplash();

    expect(statusBarStyle()).toBe('light');

    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Old Org · Old project' }));
    });

    expect(screen.getByText('Organization and project')).toBeOnTheScreen();
    expect(statusBarStyle()).toBe(withSheet);

    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Close' }));
    });

    expect(statusBarStyle()).toBe('light');
    // Home makes its month queries while it renders: the offline pill isn't told mid-render (a React error)
    expect(consoleError).not.toHaveBeenCalled();
  });

  test('on Android, a sheet the lock hides stops counting: light under the lock, the theme again once unlocked', async () => {
    const listeners = new Set<(state: AppStateStatus) => void>();
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
      listeners.add(listener);

      return { remove: () => listeners.delete(listener) };
    });
    let now = new Date('2026-11-18T10:00:00.000Z');
    let unlocks = true;
    const goTo = async (state: AppStateStatus) => {
      await act(async () => {
        listeners.forEach((listener) => listener(state));
      });
      await settle();
    };
    Platform.OS = 'android';
    mockServices = {
      ...makeServices({ session: SESSION, lock: 'on' }),
      clock: { now: () => now },
      biometric: { isAvailable: async () => true, authenticate: async () => unlocks },
      account: { getCurrentUser: async () => OLD_USER },
      workspace: { getOrganization: async () => OLD_ORGANIZATION, listProjects: async () => OLD_PROJECTS },
    };
    await launch();
    await finishSplash();
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Old Org · Old project' }));
    });

    expect(statusBarStyle()).toBe('dark');

    // Five minutes away, and Face ID fails: the lock covers the app and hides the sheet
    await goTo('background');
    now = new Date(now.getTime() + 5 * 60_000);
    unlocks = false;
    await goTo('active');

    expect(screen.getByText('Scaleway Manager is locked')).toBeOnTheScreen();
    expect(statusBarStyle()).toBe('light');

    // Unlocked: the sheet is back, over the light page
    unlocks = true;
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Unlock' }));
    });
    await settle();

    expect(screen.getByText('Organization and project', { includeHiddenElements: true })).toBeOnTheScreen();
    expect(statusBarStyle()).toBe('dark');
  });

  test('follows the theme on another tab (dark mode)', async () => {
    mockServices = makeServices({ session: SESSION, appearance: 'dark' });
    await launch('/account');
    await finishSplash();

    expect(statusBarStyle()).toBe('light');
  });
});

describe('signing out sends you back to Welcome from anywhere', () => {
  const signOut = async () => {
    await act(async () => {
      await mockServices.keeper.signOut();
    });
    await settle();
  };

  test('signing out on /account/activity goes back to Welcome', async () => {
    mockServices = makeServices({ session: SESSION });
    await launch('/account/activity');
    await finishSplash();

    expect(screen).toHavePathname('/account/activity');

    await signOut();

    expect(screen).toHavePathname('/welcome');
  });

  // Welcome, counting how many times it comes on screen
  let welcomeMounts = 0;

  function Welcome() {
    useEffect(() => {
      welcomeMounts += 1;
    }, []);

    return <Text variant="body">Welcome</Text>;
  }

  const Stub = () => <Text variant="body">A screen</Text>;

  beforeEach(() => {
    welcomeMounts = 0;
  });

  test('signing out on a screen pushed above the tabs goes back to Welcome, once', async () => {
    mockServices = makeServices({ session: SESSION });
    // The real root layout, and a screen of its own on its stack, like a resource's page will be: no tabs around it
    await renderRouter({ _layout: RootLayout, welcome: Welcome, details: Stub }, { initialUrl: '/details' });
    await settle();
    await finishSplash();

    expect(screen.getByText('A screen')).toBeOnTheScreen();

    await signOut();

    expect(screen).toHavePathname('/welcome');
    expect(welcomeMounts).toBe(1);
  });

  test('signing out on a tab goes back to Welcome once: one guard, no second trip', async () => {
    mockServices = makeServices({ session: SESSION });
    await renderRouter(
      {
        _layout: RootLayout,
        welcome: Welcome,
        '(tabs)/_layout': TabsLayout,
        '(tabs)/home': Stub,
        '(tabs)/resources': Stub,
        '(tabs)/billing': Stub,
        '(tabs)/account': Stub,
      },
      { initialUrl: '/billing' },
    );
    await settle();
    await finishSplash();
    await signOut();

    expect(screen).toHavePathname('/welcome');
    expect(welcomeMounts).toBe(1);
  });
});

test('the appearance picked on Account applies to the whole app at once, and is saved for the next launch', async () => {
  mockServices = makeServices({ session: SESSION, appearance: 'light' });
  await launch('/account');
  await finishSplash();

  expect(statusBarStyle()).toBe('dark');

  await act(async () => {
    fireEvent.press(screen.getByRole('button', { name: 'Appearance, Light' }));
  });
  await act(async () => {
    fireEvent.press(screen.getByRole('button', { name: 'Dark' }));
  });
  await settle();

  // Dark mode: light icons on the dark page
  expect(statusBarStyle()).toBe('light');
  expect((await mockServices.preferences.read()).appearance).toBe('dark');
});

test('the app draws one toast, inside the lock, so the lock screen covers it', async () => {
  mockServices = makeServices({ session: SESSION, lock: 'on', unlocks: false });
  await launch('/account');
  await finishSplash();

  expect(screen.getByText('Scaleway Manager is locked')).toBeOnTheScreen();
  // The lock hides the app (and the toast) from screen readers, so look at hidden elements too
  const toasts = screen.getAllByTestId('toast', { includeHiddenElements: true });
  let shield = toasts[0]?.parent ?? null;
  while (shield !== null && shield.props.testID !== 'screen-reader-shield') {
    shield = shield.parent;
  }

  expect(toasts).toHaveLength(1);
  // The nearest shield around it is the lock's, and it is up
  expect(shield?.props.accessibilityElementsHidden).toBe(true);
});

test('screen transitions use the default animation', async () => {
  mockServices = makeServices();
  await launch();

  expect(mockScreenOptions).toHaveBeenLastCalledWith(
    expect.objectContaining({ headerShown: false, animation: 'default', animationDuration: motion.duration.base }),
  );
});

test('with Reduce Motion, screen transitions are a plain fade', async () => {
  mockReduceMotion = true;
  mockServices = makeServices();
  await launch();

  expect(mockScreenOptions).toHaveBeenLastCalledWith(
    expect.objectContaining({ animation: 'fade', animationDuration: motion.duration.base }),
  );
});

test('launch reads the saved session once', async () => {
  mockServices = makeServices();
  const current = jest.spyOn(mockServices.keeper, 'current');
  await launch();
  await finishSplash();

  expect(screen).toHavePathname('/welcome');
  expect(current).toHaveBeenCalledTimes(1);
});

test('a refused renewal returns to Welcome and wipes saved data', async () => {
  // Scaleway refuses every call, the renewal too.
  mockServices = makeServices({
    session: SESSION,
    fetch: async () => ({ ok: false, status: 401, json: async () => ({ message: 'Expired' }) }) as Response,
  });
  await saveCache('3.0.0');
  const createQueryClient = jest.spyOn(queryClientModule, 'createQueryClient');
  await launch();
  await finishSplash();

  const queryClient = createQueryClient.mock.results[0]?.value as QueryClient;

  expect(screen).toHavePathname('/welcome');
  expect(await mockServices.keeper.current()).toBeNull();
  expect(queryClient.getQueryData(['account', 'me'])).toBeUndefined();
  expect(saved.get('sm.query-cache') ?? '').not.toContain('old@example.com');
});

test('Log out wipes cached and saved data and returns to Welcome', async () => {
  mockServices = makeServices({ session: SESSION });
  await mockServices.pins.toggle('p-1', 'instances:fr-par-1:a');
  const clearFiles = jest.spyOn(mockServices.files, 'clear').mockResolvedValue(undefined);
  await saveCache('3.0.0');
  const createQueryClient = jest.spyOn(queryClientModule, 'createQueryClient');
  await launch('/account');
  await finishSplash();
  await act(async () => {
    fireEvent.press(screen.getByRole('button', { name: 'Log out' }));
  });
  await settle();

  const queryClient = createQueryClient.mock.results[0]?.value as QueryClient;

  expect(screen).toHavePathname('/welcome');
  expect(queryClient.getQueryData(['account', 'me'])).toBeUndefined();
  expect(saved.get('sm.query-cache') ?? '').not.toContain('old@example.com');
  expect(await mockServices.pins.list('p-1')).toEqual([]);
  expect(clearFiles).toHaveBeenCalled();
});

test('switching organization (another login replaces the session) wipes the old organization\'s data', async () => {
  mockServices = makeServices({ session: SESSION });
  await mockServices.pins.toggle('p-1', 'instances:fr-par-1:a');
  const clearFiles = jest.spyOn(mockServices.files, 'clear').mockResolvedValue(undefined);
  await launch('/home');
  await finishSplash();

  await act(async () => {
    await mockServices.keeper.start({ ...SESSION, sessionId: 'jti-other', userId: 'user-in-other-org' });
  });
  await settle();

  expect(await mockServices.pins.list('p-1')).toEqual([]);
  expect(clearFiles).toHaveBeenCalled();
});

test('switching organization as the same user (a new session, same user id) wipes the old data too', async () => {
  mockServices = makeServices({ session: SESSION });
  await mockServices.pins.toggle('p-1', 'instances:fr-par-1:a');
  await launch('/home');
  await finishSplash();

  await act(async () => {
    await mockServices.keeper.start({ ...SESSION, sessionId: 'jti-other-org' });
  });
  await settle();

  expect(await mockServices.pins.list('p-1')).toEqual([]);
});

test('a renewed session for the same user keeps the data', async () => {
  mockServices = makeServices({ session: SESSION });
  await mockServices.pins.toggle('p-1', 'instances:fr-par-1:a');
  const clearFiles = jest.spyOn(mockServices.files, 'clear').mockResolvedValue(undefined);
  await launch('/home');
  await finishSplash();

  await act(async () => {
    await mockServices.keeper.start({ ...SESSION, token: 'renewed-token' });
  });
  await settle();

  expect(await mockServices.pins.list('p-1')).toEqual(['instances:fr-par-1:a']);
  expect(clearFiles).not.toHaveBeenCalled();
});

test('the saved cache of this app version is shown at launch', async () => {
  mockServices = makeServices({ session: SESSION });
  await saveCache(`3.0.0-${queryClientModule.CACHE_SHAPE}`);
  await launch();
  await finishSplash();

  expect(screen.getByRole('button', { name: 'Old Org · Old project' })).toBeOnTheScreen();
});

test('the saved cache of another app version is dropped at launch', async () => {
  mockServices = makeServices({ session: SESSION });
  await saveCache(`2.9.0-${queryClientModule.CACHE_SHAPE}`);
  await launch();
  await finishSplash();

  expect(screen.queryByRole('button', { name: 'Old Org · Old project' })).not.toBeOnTheScreen();
  expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(0);
});

test('the saved cache of an older data shape is dropped at launch, even in the same app version', async () => {
  mockServices = makeServices({ session: SESSION });
  await saveCache(`3.0.0-${queryClientModule.CACHE_SHAPE - 1}`);
  await launch();
  await finishSplash();

  // 3: a saved month of spending without byProject and discount is never read
  expect(queryClientModule.CACHE_SHAPE).toBeGreaterThanOrEqual(3);
  expect(screen.queryByRole('button', { name: 'Old Org · Old project' })).not.toBeOnTheScreen();
  expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(0);
});
