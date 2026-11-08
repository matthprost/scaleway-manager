import { DEFAULT_PREFERENCES } from '@scaleway-manager/core';
import type { BiometricPort, Preferences, Session } from '@scaleway-manager/core';
import { Button, sizes, Text } from '@scaleway-manager/ui';
import { act, fireEvent, screen } from '@testing-library/react-native';
import { AccessibilityInfo, AppState, Platform } from 'react-native';
import type { AppStateStatus } from 'react-native';
// Types for Reanimated's jest matchers (toHaveAnimatedStyle)
import type {} from 'react-native-reanimated/lib/typescript/jestUtils/index.native';

import Account from '../../../app/(tabs)/account/index';
import { createServices } from '../../wiring/services';
import type { Services } from '../../wiring/services';
import { useSwitchMode } from '../../wiring/ServicesProvider';
import { layOutLogoSlot, LOGO_PLACE, mockLogoPlace } from '../../test-utils/logoPlace';
import { renderWithApp } from '../../test-utils/renderWithApp';
import { SplashGate } from '../splash/SplashGate';
import { SplashHandOverContext } from '../splash/SplashHandOver';
import type { SplashHandOver } from '../splash/SplashHandOver';
import { LockGate } from './LockGate';
import { LockOverlay } from './LockOverlay';
import { LockProvider, useLockState } from './LockProvider';

const SESSION: Session = {
  token: 'token',
  renewToken: 'renew',
  sessionId: 'session',
  userId: 'user',
  expiresAt: '2099-01-01T00:00:00.000Z',
};

const START = new Date('2026-01-01T10:00:00.000Z');

let saved: Preferences;
let now: Date;
let biometric: jest.Mocked<BiometricPort>;
// Everyone listening to the app state (the lock, and what hides while the app is away)
const listeners = new Set<(state: AppStateStatus) => void>();
// What the phone was told about screenshots, in order (Android's FLAG_SECURE)
let screenPrivacy: string[];

type Options = { lock?: Preferences['biometricLock']; signedIn?: boolean; demo?: boolean; available?: boolean; unlocks?: boolean };

const makeServices = ({ lock = 'on', signedIn = true, demo = false, available = true, unlocks = true }: Options = {}): Services => {
  saved = { ...DEFAULT_PREFERENCES, biometricLock: lock };
  screenPrivacy = [];
  biometric = {
    isAvailable: jest.fn(async () => available),
    authenticate: jest.fn(async (_reason: string) => unlocks),
  };
  const base = createServices(demo ? 'demo' : 'real', {
    fetch: async () => {
      throw new Error('Tests have no network');
    },
    kv: { getItem: async () => null, setItem: async () => {}, removeItem: async () => {} },
    store: { load: async () => (signedIn ? SESSION : null), save: async () => {}, clear: async () => {} },
    biometric,
  });

  return {
    ...base,
    preferences: {
      read: async () => saved,
      update: async (patch) => {
        saved = { ...saved, ...patch };

        return saved;
      },
    },
    clock: { now: () => now },
    screenPrivacy: {
      protect: async () => {
        screenPrivacy.push('protect');
      },
      allow: async () => {
        screenPrivacy.push('allow');
      },
    },
  };
};

jest.mock('expo-splash-screen', () => ({ hideAsync: jest.fn(), preventAutoHideAsync: jest.fn() }));

const App = () => <Text variant="body">The app</Text>;

const Tree = () => (
  <LockProvider>
    <LockGate>
      <App />
    </LockGate>
  </LockProvider>
);

const mount = async (services: Services, ui = <Tree />) => {
  const result = await renderWithApp(ui, { services });
  await settle();

  return result;
};

const LOCKED = 'Scaleway Manager is locked';

const SOMETHING_WRONG = 'Something went wrong. Try again.';

const settle = () =>
  act(async () => {
    await jest.advanceTimersByTimeAsync(50);
  });

const tell = (state: AppStateStatus) => {
  listeners.forEach((listener) => listener(state));
};

const goTo = async (state: AppStateStatus) => {
  await act(async () => {
    tell(state);
  });
  await settle();
};

beforeEach(() => {
  jest.useFakeTimers();
  now = START;
  Platform.OS = 'ios';
  listeners.clear();
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, next) => {
    listeners.add(next);

    return { remove: () => listeners.delete(next) };
  });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

test('launch with lock on asks for Face ID before showing the app', async () => {
  await mount(makeServices({ unlocks: false }));

  expect(biometric.authenticate).toHaveBeenCalledTimes(1);
  expect(screen.getByText('Scaleway Manager is locked')).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Unlock' })).toBeOnTheScreen();
  // The dots are Welcome's only
  expect(screen.queryByTestId('header-dots', { includeHiddenElements: true })).toBeNull();
});

test('a good Face ID scan on launch lets you in', async () => {
  await mount(makeServices());

  expect(screen.queryByText('Scaleway Manager is locked')).not.toBeOnTheScreen();
});

test('the Unlock button asks again', async () => {
  const services = makeServices({ unlocks: false });
  await mount(services);
  biometric.authenticate.mockResolvedValue(true);
  await act(async () => {
    fireEvent.press(screen.getByRole('button', { name: 'Unlock' }));
  });
  await settle();

  expect(biometric.authenticate).toHaveBeenCalledTimes(2);
  expect(screen.queryByText('Scaleway Manager is locked')).not.toBeOnTheScreen();
});

test('launch with lock on but no biometrics turns the lock off', async () => {
  await mount(makeServices({ available: false }));

  expect(saved.biometricLock).toBe('off');
  expect(screen.queryByText('Scaleway Manager is locked')).not.toBeOnTheScreen();
  expect(biometric.authenticate).not.toHaveBeenCalled();
});

test('launch signed out never locks', async () => {
  await mount(makeServices({ signedIn: false, unlocks: false }));

  expect(screen.queryByText('Scaleway Manager is locked')).not.toBeOnTheScreen();
});

test("coming back after 4 minutes doesn't lock", async () => {
  await mount(makeServices({ unlocks: true }));
  await goTo('background');
  now = new Date(START.getTime() + 4 * 60_000);
  biometric.authenticate.mockResolvedValue(false);
  await goTo('active');

  expect(screen.queryByText('Scaleway Manager is locked')).not.toBeOnTheScreen();
});

test('coming back after 5 minutes locks', async () => {
  await mount(makeServices({ unlocks: true }));
  await goTo('background');
  now = new Date(START.getTime() + 5 * 60_000);
  biometric.authenticate.mockResolvedValue(false);
  await goTo('active');

  expect(screen.getByText('Scaleway Manager is locked')).toBeOnTheScreen();
});

test('the Face ID prompt is announced when it appears', async () => {
  const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
  await mount(makeServices({ lock: 'unasked' }));

  expect(announce).toHaveBeenCalledWith('Use Face ID to unlock?');
  expect(screen.getByText('Use Face ID to unlock?')).toBeOnTheScreen();
  expect(screen.getByTestId('overlay').props.accessibilityLiveRegion).toBe('polite');
});

test('first sign-in offers Face ID when available', async () => {
  await mount(makeServices({ lock: 'unasked' }));

  expect(screen.getByText('Use Face ID to unlock?')).toBeOnTheScreen();
  expect(screen.getByText('Keeps your cloud account safe if someone else picks up your phone.')).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Use it' })).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Not now' })).toBeOnTheScreen();
});

test('the prompt asks for a fingerprint on Android', async () => {
  Platform.OS = 'android';
  await mount(makeServices({ lock: 'unasked' }));

  expect(screen.getByText('Use your fingerprint to unlock?')).toBeOnTheScreen();
});

test('no prompt without biometrics', async () => {
  await mount(makeServices({ lock: 'unasked', available: false }));

  expect(screen.queryByText('Use Face ID to unlock?')).not.toBeOnTheScreen();
});

test('demo mode never locks', async () => {
  await mount(makeServices({ lock: 'on', demo: true, unlocks: false }));
  await goTo('background');
  now = new Date(START.getTime() + 60 * 60_000);
  await goTo('active');

  expect(screen.queryByText('Scaleway Manager is locked')).not.toBeOnTheScreen();
  expect(biometric.authenticate).not.toHaveBeenCalled();
});

test('demo mode never prompts', async () => {
  await mount(makeServices({ lock: 'unasked', demo: true }));

  expect(screen.queryByText('Use Face ID to unlock?')).not.toBeOnTheScreen();
});

test('saying Yes checks Face ID and turns the lock on', async () => {
  await mount(makeServices({ lock: 'unasked' }));
  await act(async () => {
    fireEvent.press(screen.getByRole('button', { name: 'Use it' }));
  });
  await settle();

  expect(biometric.authenticate).toHaveBeenCalledWith('Turn on Face ID unlock');
  expect(saved.biometricLock).toBe('on');
  expect(screen.queryByText('Use Face ID to unlock?')).not.toBeOnTheScreen();
});

test('a failed Face ID check on Yes keeps the lock unasked', async () => {
  await mount(makeServices({ lock: 'unasked', unlocks: false }));
  await act(async () => {
    fireEvent.press(screen.getByRole('button', { name: 'Use it' }));
  });
  await settle();

  expect(saved.biometricLock).toBe('unasked');
  expect(screen.queryByText('Use Face ID to unlock?')).not.toBeOnTheScreen();
});

test('saying Not now never asks again', async () => {
  const services = makeServices({ lock: 'unasked' });
  await mount(services);
  await act(async () => {
    fireEvent.press(screen.getByRole('button', { name: 'Not now' }));
  });
  await settle();

  expect(saved.biometricLock).toBe('off');
  expect(screen.queryByText('Use Face ID to unlock?')).not.toBeOnTheScreen();

  await mount(services);

  expect(screen.queryByText('Use Face ID to unlock?')).not.toBeOnTheScreen();
});

test('coming back after 5 minutes asks for Face ID right away', async () => {
  await mount(makeServices());
  await goTo('background');
  now = new Date(START.getTime() + 5 * 60_000);
  await goTo('active');

  expect(biometric.authenticate).toHaveBeenCalledTimes(2);
  expect(screen.queryByText(LOCKED)).not.toBeOnTheScreen();
});

test('coming back after 5 minutes covers the app before any check finishes', async () => {
  await mount(makeServices());
  await goTo('background');
  now = new Date(START.getTime() + 5 * 60_000);
  biometric.isAvailable.mockReturnValue(new Promise(() => {}));
  await act(async () => {
    tell('active');
  });

  expect(screen.getByText(LOCKED)).toBeOnTheScreen();
  expect(screen.queryByText('The app')).not.toBeOnTheScreen();
});

test('coming back before the lock setting is read still covers the app at once', async () => {
  const services = makeServices();
  await mount(services);
  // The read started on background never answers (the phone paused the app right away).
  services.preferences.read = () => new Promise(() => {});
  await goTo('background');
  now = new Date(START.getTime() + 5 * 60_000);
  await act(async () => {
    tell('active');
  });

  expect(screen.getByText(LOCKED)).toBeOnTheScreen();
  expect(screen.queryByText('The app')).not.toBeOnTheScreen();
});

test('coming back before the lock setting is read uncovers once it says the lock is off', async () => {
  const services = makeServices({ lock: 'off' });
  await mount(services);
  const read = services.preferences.read;
  let reads = 0;
  // The read started on background never answers; the next one does.
  services.preferences.read = () => {
    reads += 1;

    return reads === 1 ? new Promise(() => {}) : read();
  };
  await goTo('background');
  now = new Date(START.getTime() + 5 * 60_000);
  await goTo('active');

  expect(reads).toBe(2);
  expect(screen.queryByText(LOCKED)).not.toBeOnTheScreen();
  expect(screen.getByText('The app')).toBeOnTheScreen();
  expect(biometric.authenticate).not.toHaveBeenCalled();
});

test('unlocking after a resume lock, then another active event, stays unlocked', async () => {
  await mount(makeServices());
  await goTo('background');
  now = new Date(START.getTime() + 5 * 60_000);
  biometric.authenticate.mockResolvedValue(false);
  await goTo('active');

  expect(screen.getByText(LOCKED)).toBeOnTheScreen();

  biometric.authenticate.mockResolvedValue(true);
  await act(async () => {
    fireEvent.press(screen.getByRole('button', { name: 'Unlock' }));
  });
  await settle();
  // A stale timestamp would lock again here.
  biometric.authenticate.mockResolvedValue(false);
  await goTo('active');

  expect(screen.queryByText(LOCKED)).not.toBeOnTheScreen();
});

test('coming back signed out never locks', async () => {
  await mount(makeServices({ signedIn: false }));
  await goTo('background');
  now = new Date(START.getTime() + 10 * 60_000);
  await goTo('active');

  expect(screen.queryByText(LOCKED)).not.toBeOnTheScreen();
  expect(biometric.authenticate).not.toHaveBeenCalled();
});

test('biometrics removed while away turns the lock off', async () => {
  await mount(makeServices());
  await goTo('background');
  now = new Date(START.getTime() + 5 * 60_000);
  biometric.isAvailable.mockResolvedValue(false);
  await goTo('active');

  expect(saved.biometricLock).toBe('off');
  expect(screen.queryByText(LOCKED)).not.toBeOnTheScreen();
});

test('a clock that moved backwards locks', async () => {
  await mount(makeServices());
  await goTo('background');
  now = new Date(START.getTime() - 60_000);
  biometric.authenticate.mockResolvedValue(false);
  await goTo('active');

  expect(screen.getByText(LOCKED)).toBeOnTheScreen();
});

test('stops listening to the app state when it goes away', async () => {
  const { unmount } = await mount(makeServices());

  expect(listeners.size).toBeGreaterThan(0);

  await unmount();

  expect(listeners.size).toBe(0);
});

test('the app is never shown before the launch lock decision', async () => {
  const services = makeServices();
  const releases: (() => void)[] = [];
  const read = services.preferences.read;
  services.preferences.read = () =>
    new Promise((resolve) => {
      releases.push(() => resolve(read()));
    });
  await mount(services);

  // A plain purple cover: it must not look or sound like "locked".
  expect(screen.getByTestId('overlay')).toBeOnTheScreen();
  expect(screen.getByTestId('overlay').props.accessibilityLiveRegion).toBeUndefined();
  expect(screen.queryByText(LOCKED)).not.toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: 'Unlock' })).not.toBeOnTheScreen();
  expect(screen.queryByText('The app')).not.toBeOnTheScreen();

  await act(async () => {
    releases.forEach((release) => release());
  });
  await settle();

  expect(screen.queryByTestId('overlay')).not.toBeOnTheScreen();
  expect(screen.getByText('The app')).toBeOnTheScreen();
});

test('starting signed out never shows the lock text', async () => {
  const services = makeServices({ signedIn: false });
  services.preferences.read = () => new Promise(() => {});
  await mount(services);

  expect(screen.queryByText(LOCKED)).not.toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: 'Unlock' })).not.toBeOnTheScreen();
  expect(screen.getByText('The app')).toBeOnTheScreen();
});

test('a lock that is off is decided without waiting for the biometrics check', async () => {
  const services = makeServices({ lock: 'off' });
  biometric.isAvailable.mockReturnValue(new Promise(() => {}));
  const Probe = () => <Text variant="body">{`decided ${useLockState().decided}`}</Text>;
  await mount(services, <LockProvider><Probe /></LockProvider>);

  expect(screen.getByText('decided true')).toBeOnTheScreen();
});

test("exiting demo doesn't flash the lock screen", async () => {
  const services = makeServices({ lock: 'on', demo: true });
  const Exit = () => {
    const switchMode = useSwitchMode();

    return <Button label="Leave" size="md" onPress={() => void switchMode('real')} />;
  };
  await mount(
    services,
    <LockProvider>
      <LockGate>
        <Exit />
      </LockGate>
    </LockProvider>,
  );
  await act(async () => {
    fireEvent.press(screen.getByRole('button', { name: 'Leave' }));
  });

  expect(screen.queryByText(LOCKED)).not.toBeOnTheScreen();

  await settle();

  expect(screen.queryByText(LOCKED)).not.toBeOnTheScreen();
  expect(biometric.authenticate).not.toHaveBeenCalled();
});

test('Face ID is asked only once at launch even with the splash and the lock gate mounted', async () => {
  await mount(
    makeServices({ unlocks: false }),
    <LockProvider>
      <SplashGate onFinished={() => {}}>
        <LockGate>
          <App />
        </LockGate>
      </SplashGate>
    </LockProvider>,
  );

  expect(biometric.authenticate).toHaveBeenCalledTimes(1);
});

test('the app is hidden from screen readers while the enable prompt is up', async () => {
  await mount(makeServices({ lock: 'unasked' }));

  expect(screen.getByText('Use Face ID to unlock?')).toBeOnTheScreen();
  expect(screen.getByTestId('screen-reader-shield', { includeHiddenElements: true }).props.importantForAccessibility).toBe(
    'no-hide-descendants',
  );
});

test('the prompt waits until the launch cover is gone', async () => {
  const services = makeServices({ lock: 'unasked' });
  const read = services.preferences.read;
  let reads = 0;
  let finishLaunch = () => {};
  // The launch check reads first: hold it, so the cover stays up while the prompt is ready.
  services.preferences.read = () => {
    reads += 1;

    if (reads > 1) {
      return read();
    }

    return new Promise((resolve) => {
      finishLaunch = () => resolve(read());
    });
  };
  await mount(services);

  expect(reads).toBe(2);
  expect(screen.getByTestId('overlay')).toBeOnTheScreen();
  expect(screen.queryByText('Use Face ID to unlock?')).not.toBeOnTheScreen();

  await act(async () => {
    finishLaunch();
  });
  await settle();

  expect(screen.getByText('Use Face ID to unlock?')).toBeOnTheScreen();
});

test('decided turns true once the launch lock is known', async () => {
  const services = makeServices({ signedIn: false });
  const Probe = () => <Text variant="body">{`decided ${useLockState().decided}`}</Text>;
  await mount(services, <LockProvider><Probe /></LockProvider>);

  expect(screen.getByText('decided true')).toBeOnTheScreen();
});

test('while locked, the app behind is hidden from screen readers', async () => {
  await mount(makeServices({ unlocks: false }));

  expect(screen.queryByText('The app')).not.toBeOnTheScreen();
  expect(screen.getByTestId('screen-reader-shield', { includeHiddenElements: true }).props.importantForAccessibility).toBe(
    'no-hide-descendants',
  );

  biometric.authenticate.mockResolvedValue(true);
  await act(async () => {
    fireEvent.press(screen.getByRole('button', { name: 'Unlock' }));
  });
  await settle();

  expect(screen.getByText('The app')).toBeOnTheScreen();
});

test('the prompt closes if you sign out while it is up', async () => {
  const { services } = await mount(makeServices({ lock: 'unasked' }));

  expect(screen.getByText('Use Face ID to unlock?')).toBeOnTheScreen();

  await act(async () => {
    await services.keeper.signOut();
  });
  await settle();

  expect(screen.queryByText('Use Face ID to unlock?')).not.toBeOnTheScreen();
});

test('a failing save on Not now closes the prompt without crashing', async () => {
  const services = makeServices({ lock: 'unasked' });
  jest.spyOn(services.preferences, 'update').mockRejectedValue(new Error('disk full'));
  await mount(services);
  await act(async () => {
    fireEvent.press(screen.getByRole('button', { name: 'Not now' }));
  });
  await settle();

  expect(screen.queryByText('Use Face ID to unlock?')).not.toBeOnTheScreen();
});

describe('Account toggle', () => {
  // Account's Face ID row and sheets go through the app's one lock
  const AccountWithLock = () => (
    <LockProvider>
      <Account />
    </LockProvider>
  );

  test('turning the Account toggle on asks for Face ID first', async () => {
    await mount(makeServices({ lock: 'off', unlocks: false }), <AccountWithLock />);
    await act(async () => {
      fireEvent(screen.getByRole('switch', { name: 'Unlock with Face ID' }), 'valueChange', true);
    });
    await settle();

    expect(biometric.authenticate).toHaveBeenCalledWith('Turn on Face ID unlock');
    expect(screen.getByRole('switch', { name: 'Unlock with Face ID' }).props.value).toBe(false);
    expect(saved.biometricLock).toBe('off');
    // A cancelled scan isn't a failure.
    expect(screen.queryByText(SOMETHING_WRONG)).not.toBeOnTheScreen();
  });

  test('a good scan turns the toggle on', async () => {
    await mount(makeServices({ lock: 'off' }), <AccountWithLock />);
    await act(async () => {
      fireEvent(screen.getByRole('switch', { name: 'Unlock with Face ID' }), 'valueChange', true);
    });
    await settle();

    expect(screen.getByRole('switch', { name: 'Unlock with Face ID' }).props.value).toBe(true);
    expect(saved.biometricLock).toBe('on');
  });

  test('turning it off just saves off', async () => {
    await mount(makeServices({ lock: 'on' }), <AccountWithLock />);

    expect(screen.getByRole('switch', { name: 'Unlock with Face ID' }).props.value).toBe(true);

    // The launch check unlocked the app; only that asked for Face ID
    biometric.authenticate.mockClear();
    await act(async () => {
      fireEvent(screen.getByRole('switch', { name: 'Unlock with Face ID' }), 'valueChange', false);
    });
    await settle();

    expect(biometric.authenticate).not.toHaveBeenCalled();
    expect(saved.biometricLock).toBe('off');
    expect(screen.getByRole('switch', { name: 'Unlock with Face ID' }).props.value).toBe(false);
  });

  test('the row says fingerprint on Android', async () => {
    Platform.OS = 'android';
    await mount(makeServices({ lock: 'off' }), <AccountWithLock />);

    expect(screen.getByLabelText('Unlock with fingerprint')).toBeOnTheScreen();
  });

  test('the row is hidden when the phone has no biometrics', async () => {
    await mount(makeServices({ lock: 'off', available: false }), <AccountWithLock />);

    expect(screen.queryByRole('switch')).not.toBeOnTheScreen();
  });

  test('the row is hidden in demo mode', async () => {
    await mount(makeServices({ lock: 'off', demo: true }), <AccountWithLock />);

    expect(screen.queryByRole('switch')).not.toBeOnTheScreen();
  });

  test('a failing scan error leaves the switch off', async () => {
    const services = makeServices({ lock: 'off' });
    biometric.authenticate.mockRejectedValue(new Error('sensor broke'));
    await mount(services, <AccountWithLock />);
    await act(async () => {
      fireEvent(screen.getByRole('switch', { name: 'Unlock with Face ID' }), 'valueChange', true);
    });
    await settle();

    expect(screen.getByRole('switch', { name: 'Unlock with Face ID' }).props.value).toBe(false);
    expect(saved.biometricLock).toBe('off');
  });

  test('a failing switch says something went wrong', async () => {
    const services = makeServices({ lock: 'on' });
    jest.spyOn(services.preferences, 'update').mockRejectedValue(new Error('disk full'));
    await mount(services, <AccountWithLock />);
    await act(async () => {
      fireEvent(screen.getByRole('switch', { name: 'Unlock with Face ID' }), 'valueChange', false);
    });
    await settle();

    expect(screen.getByRole('switch', { name: 'Unlock with Face ID' }).props.value).toBe(true);
    expect(screen.getByText(SOMETHING_WRONG)).toBeOnTheScreen();
    expect(screen.getByText(SOMETHING_WRONG).props.accessibilityLiveRegion).toBe('polite');
  });

  test('the row stays hidden when the biometrics check fails', async () => {
    const services = makeServices({ lock: 'off' });
    biometric.isAvailable.mockRejectedValue(new Error('no sensor info'));
    await mount(services, <AccountWithLock />);

    expect(screen.queryByRole('switch')).not.toBeOnTheScreen();
  });
});

describe('the privacy cover (what the app switcher shows)', () => {
  // The cover is hidden from screen readers, so look past that
  const cover = () => screen.queryByTestId('overlay', { includeHiddenElements: true });

  test('with the lock on, a purple cover with only the logo hides the app while it is inactive or in the background', async () => {
    await mount(makeServices());

    expect(cover()).not.toBeOnTheScreen();

    await goTo('inactive');

    expect(cover()).toBeOnTheScreen();
    expect(screen.getByTestId('logo-mark', { includeHiddenElements: true })).toBeOnTheScreen();
    // Centred and splash-sized, like the splash's first frame
    expect(screen.getByTestId('logo-mark', { includeHiddenElements: true }).props.width).toBe(sizes.logoSplash);
    expect(screen.getByTestId('logo-mark', { includeHiddenElements: true }).parent).toHaveStyle({
      alignItems: 'center',
      justifyContent: 'center',
    });
    // No words, nothing that says "locked": it isn't
    expect(screen.queryByText(LOCKED, { includeHiddenElements: true })).not.toBeOnTheScreen();
    // Only the logo: the dot grid is Welcome's
    expect(screen.queryByTestId('header-dots', { includeHiddenElements: true })).toBeNull();

    await goTo('background');

    expect(cover()).toBeOnTheScreen();

    // Back within 5 minutes: the app, as it was, with no Face ID
    now = new Date(START.getTime() + 60_000);
    await goTo('active');

    expect(cover()).not.toBeOnTheScreen();
    expect(screen.getByText('The app')).toBeOnTheScreen();
    expect(biometric.authenticate).toHaveBeenCalledTimes(1);
  });

  test('screen readers never reach the cover, and it says nothing', async () => {
    const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
    await mount(makeServices());
    announce.mockClear();
    await goTo('inactive');

    expect(screen.queryByTestId('logo-mark')).not.toBeOnTheScreen();
    expect(screen.getByTestId('overlay', { includeHiddenElements: true }).props.accessibilityLiveRegion).toBeUndefined();
    expect(announce).not.toHaveBeenCalled();
  });

  test('coming back after 5 minutes, the lock screen takes the cover\'s place', async () => {
    await mount(makeServices());
    await goTo('inactive');
    await goTo('background');
    now = new Date(START.getTime() + 5 * 60_000);
    biometric.authenticate.mockResolvedValue(false);
    await goTo('active');

    expect(screen.getByText(LOCKED)).toBeOnTheScreen();
    // One cover only: the lock screen's
    expect(screen.getAllByTestId('overlay', { includeHiddenElements: true })).toHaveLength(1);
  });

  test('while the lock screen is up, it stays the only cover (the Face ID prompt makes the app inactive)', async () => {
    await mount(makeServices({ unlocks: false }));

    expect(screen.getByText(LOCKED)).toBeOnTheScreen();

    await goTo('inactive');

    expect(screen.getAllByTestId('overlay', { includeHiddenElements: true })).toHaveLength(1);
    expect(screen.getByText(LOCKED)).toBeOnTheScreen();
  });

  test('after signing out, nothing is covered any more', async () => {
    const { services } = await mount(makeServices());
    await act(async () => {
      await services.keeper.signOut();
    });
    await settle();
    await goTo('inactive');

    expect(cover()).not.toBeOnTheScreen();
  });

  test('no cover while the lock is off, signed out, or in demo mode', async () => {
    for (const options of [{ lock: 'off' }, { signedIn: false }, { demo: true }] as const) {
      const { unmount } = await mount(makeServices(options));
      await goTo('inactive');
      await goTo('background');

      expect(cover()).not.toBeOnTheScreen();

      await unmount();
    }
  });

  test('turning the lock on in Account covers the app from the next time it leaves', async () => {
    await mount(
      makeServices({ lock: 'off' }),
      <LockProvider>
        <LockGate>
          <Account />
        </LockGate>
      </LockProvider>,
    );
    await goTo('inactive');

    expect(cover()).not.toBeOnTheScreen();

    await goTo('active');
    await act(async () => {
      fireEvent(screen.getByRole('switch', { name: 'Unlock with Face ID' }), 'valueChange', true);
    });
    await settle();
    await goTo('inactive');

    expect(cover()).toBeOnTheScreen();

    // And off again: no cover
    await goTo('active');
    await act(async () => {
      fireEvent(screen.getByRole('switch', { name: 'Unlock with Face ID' }), 'valueChange', false);
    });
    await settle();
    await goTo('inactive');

    expect(cover()).not.toBeOnTheScreen();
  });
});

describe('screenshots and the app switcher (Android keeps them blank while the lock is on)', () => {
  const AccountInLock = () => (
    <LockProvider>
      <LockGate>
        <Account />
      </LockGate>
    </LockProvider>
  );

  test('with the lock on, the screen is protected from launch', async () => {
    await mount(makeServices());

    expect(screenPrivacy).toContain('protect');
    expect(screenPrivacy.at(-1)).toBe('protect');
  });

  test('turning the lock off in Account lets screenshots back, and on again protects', async () => {
    await mount(makeServices({ lock: 'on' }), <AccountInLock />);

    expect(screenPrivacy.at(-1)).toBe('protect');

    await act(async () => {
      fireEvent(screen.getByRole('switch', { name: 'Unlock with Face ID' }), 'valueChange', false);
    });
    await settle();

    expect(screenPrivacy.at(-1)).toBe('allow');

    await act(async () => {
      fireEvent(screen.getByRole('switch', { name: 'Unlock with Face ID' }), 'valueChange', true);
    });
    await settle();

    expect(screenPrivacy.at(-1)).toBe('protect');
  });

  test('with the lock off, nothing is protected', async () => {
    await mount(makeServices({ lock: 'off' }));

    expect(screenPrivacy).not.toContain('protect');
  });

  test('signing out lets screenshots back', async () => {
    const { services } = await mount(makeServices());

    expect(screenPrivacy.at(-1)).toBe('protect');

    await act(async () => {
      await services.keeper.signOut();
    });
    await settle();

    expect(screenPrivacy.at(-1)).toBe('allow');
  });

  test("a phone that can't keep the screen private still opens the app, quietly", async () => {
    const unhandled = jest.fn();
    process.on('unhandledRejection', unhandled);
    const services = makeServices();
    const refuse = async () => {
      throw new Error('FLAG_SECURE refused');
    };
    services.screenPrivacy = { protect: refuse, allow: refuse };

    await mount(services);
    // Node reports a rejection nobody caught once the current work is done (a real tick: the timers are fake)
    await act(async () => {
      await new Promise((resolve) => jest.requireActual<typeof import('timers')>('timers').setImmediate(resolve));
    });

    expect(screen.getByText('The app')).toBeOnTheScreen();
    expect(unhandled).not.toHaveBeenCalled();
    process.off('unhandledRejection', unhandled);
  });

  test('demo mode never protects (store screenshots)', async () => {
    await mount(makeServices({ lock: 'on', demo: true }));
    await goTo('background');
    await goTo('active');

    expect(screenPrivacy).not.toContain('protect');
  });
});

describe('the splash hand-over', () => {
  const reportLogo = jest.fn();

  // The lock screen as SplashGate shows it while the splash is up
  const underSplash = (handOver: Pick<SplashHandOver, 'entrance' | 'logoHidden'>, deciding = false) => (
    <SplashHandOverContext.Provider value={{ ...handOver, reportLogo, reportHeaderHeight: jest.fn() }}>
      <LockOverlay visible deciding={deciding} onUnlock={jest.fn()} />
    </SplashHandOverContext.Provider>
  );

  const entrances = () => screen.getAllByTestId('splash-entrance');

  beforeEach(() => {
    mockLogoPlace();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    reportLogo.mockClear();
  });

  test('under the splash, the lock screen hides its logo, title and button, and says where its logo is', async () => {
    await renderWithApp(underSplash({ entrance: 'hidden', logoHidden: true }));

    expect(screen.getByTestId('splash-logo-slot')).toHaveStyle({ opacity: 0 });
    expect(entrances()).toHaveLength(2);

    for (const entrance of entrances()) {
      expect(entrance).toHaveAnimatedStyle({ opacity: 0 });
    }

    await layOutLogoSlot();

    expect(reportLogo).toHaveBeenCalledWith('lock', LOGO_PLACE);
  });

  test('the deciding cover says where its logo is too', async () => {
    await renderWithApp(underSplash({ entrance: 'hidden', logoHidden: true }, true));
    await layOutLogoSlot();

    expect(reportLogo).toHaveBeenCalledWith('lock', LOGO_PLACE);
  });

  test('as the splash leaves, the title then the Unlock button come in', async () => {
    await renderWithApp(underSplash({ entrance: 'enter', logoHidden: true }));
    const [title, button] = entrances();

    expect(title).toHaveTextContent(LOCKED);
    expect(button).toHaveTextContent('Unlock');

    await act(async () => {
      await jest.advanceTimersByTimeAsync(300);
    });

    expect(title).not.toHaveAnimatedStyle({ opacity: 0 });
    expect(button).toHaveAnimatedStyle({ opacity: 0 });

    await act(async () => {
      await jest.advanceTimersByTimeAsync(1000);
    });

    for (const entrance of entrances()) {
      expect(entrance).toHaveAnimatedStyle({ opacity: 1, transform: [{ translateY: 0 }] });
    }
  });

  test('without a splash (locking after 5 minutes away), the lock screen shows at once', async () => {
    await renderWithApp(<LockOverlay visible onUnlock={jest.fn()} />);

    expect(screen.getByTestId('splash-logo-slot')).toHaveStyle({ opacity: 1 });

    for (const entrance of entrances()) {
      expect(entrance).toHaveAnimatedStyle({ opacity: 1, transform: [{ translateY: 0 }] });
    }
  });
});
