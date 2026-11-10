import { AppError } from '@scaleway-manager/core';
import type { Organization, Project, Session, User } from '@scaleway-manager/core';
import { darkColors, lightColors, Text } from '@scaleway-manager/ui';
import { onlineManager, QueryClientProvider } from '@tanstack/react-query';
import { Slot } from 'expo-router';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import * as WebBrowser from 'expo-web-browser';
import type { ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import TabsLayout from '../../../app/(tabs)/_layout';
import * as AccountLayout from '../../../app/(tabs)/account/_layout';
import About from '../../../app/(tabs)/account/about';
import Activity from '../../../app/(tabs)/account/activity';
import ApiKeys from '../../../app/(tabs)/account/api-keys';
import Account from '../../../app/(tabs)/account/index';
import SshKeys from '../../../app/(tabs)/account/ssh-keys';
import { createQueryClient } from '../../wiring/queryClient';
import { createServices } from '../../wiring/services';
import type { Services } from '../../wiring/services';
import { ServicesProvider } from '../../wiring/ServicesProvider';
import { AppearanceProvider } from '../appearance/AppearanceProvider';
import { ToastProvider } from '../feedback/ToastProvider';
import { LockProvider } from '../lock/LockProvider';
import { SessionProvider } from '../session/SessionProvider';
import { useSignedOutRedirect } from '../session/useSignedOutRedirect';
import { WorkspaceProvider } from '../workspace/WorkspaceProvider';

jest.mock('expo-web-browser', () => ({ openBrowserAsync: jest.fn(async () => ({ type: 'opened' })) }));

jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { version: '3.0.0' } } }));

const REPOSITORY = 'https://github.com/matthprost/scaleway-manager';

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const SESSION: Session = {
  token: 'token',
  renewToken: 'renew',
  sessionId: 'session',
  userId: 'session-user',
  expiresAt: '2099-01-01T00:00:00.000Z',
};

const USER: User = { id: 'user', email: 'me@example.com', organizationId: 'org' };
const ORGANIZATION: Organization = { id: 'org', name: 'Northwind' };
const PROJECTS: Project[] = [{ id: 'default', name: 'default', organizationId: 'org' }];

// 23:30 on 18 November, on the phone's own clock: the demo's events then fall on three days
const LATE_EVENING = new Date(2026, 10, 18, 23, 30);

let services: Services;
let queryClient = createQueryClient();

// Real mode, signed in, with a fake account and no network.
const realServices = (): Services => {
  let stored: Session | null = SESSION;
  const saved = new Map<string, string>();

  return {
    ...createServices('real', {
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
        load: async () => stored,
        save: async (next) => {
          stored = next;
        },
        clear: async () => {
          stored = null;
        },
      },
      biometric: { isAvailable: async () => false, authenticate: async () => false },
    }),
    account: { getCurrentUser: async () => USER },
    workspace: { getOrganization: async () => ORGANIZATION, listProjects: async () => PROJECTS },
    // Scaleway's page opens, and the user closes it
    receiver: {
      start: jest.fn(async () => ({
        callbackUrl: 'http://localhost:47815/callback',
        nextCallback: () => new Promise<string>(() => {}),
        received: () => null,
        stop: jest.fn(async () => {}),
      })),
    },
    browser: { open: jest.fn(async () => 'cancelled' as const), close: jest.fn(async () => {}) },
  };
};

// The demo's data with the real app's rules: the demo itself ignores the network, so offline tests use these
const realRules = (): Services => ({
  ...createServices('demo'),
  mode: 'real',
  biometric: { isAvailable: async () => false, authenticate: async () => false },
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

const stub = (words: string) =>
  function Stub() {
    return <Text variant="body">{words}</Text>;
  };

// The root layout's sign-out guard, around the routes
function Root() {
  useSignedOutRedirect();

  return <Slot />;
}

const routes = {
  _layout: Root,
  welcome: stub('Welcome'),
  '(tabs)/_layout': TabsLayout,
  '(tabs)/home': stub('Home'),
  '(tabs)/resources': stub('Resources'),
  '(tabs)/billing': stub('Billing'),
  '(tabs)/account/_layout': AccountLayout,
  '(tabs)/account/index': Account,
  '(tabs)/account/activity': Activity,
  '(tabs)/account/about': About,
  '(tabs)/account/ssh-keys': SshKeys,
  '(tabs)/account/api-keys': ApiKeys,
};

// The router uses fake timers: let the queries finish inside act
const settle = () =>
  act(async () => {
    await jest.advanceTimersByTimeAsync(50);
  });

const open = async (url = '/account') => {
  const router = await renderRouter(routes, { initialUrl: url, wrapper: Providers });
  await settle();

  return router;
};

const press = async (name: string) => {
  await act(async () => {
    fireEvent.press(screen.getByRole('button', { name }));
  });
  await settle();
};

const page = () => screen.getByTestId('screen-scroll');

// Where each text first shows in the screen, in reading order (-1: not there)
const positions = (texts: string[]) => {
  const shown = screen.getAllByText(/./).map((node) => [node.props.children].flat().join(''));

  return texts.map((text) => shown.indexOf(text));
};

beforeEach(() => {
  services = createServices('demo');
  queryClient = createQueryClient();
  // Failures show at once, and no clean-up timer keeps Jest running
  queryClient.setDefaultOptions({ queries: { retry: false, gcTime: Infinity } });
  onlineManager.setOnline(true);
  jest.mocked(WebBrowser.openBrowserAsync).mockClear();
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('Account', () => {
  test('Account shows email, organization and project', async () => {
    await open();

    expect(screen.getByRole('header', { name: 'Account' })).toBeOnTheScreen();
    expect(screen.getByText('demo@example.com')).toBeOnTheScreen();
    expect(screen.getByText('Acme')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Project, Production' })).toBeOnTheScreen();
    // Top to bottom, as the screen lists them
    const order = positions(['WORKSPACE', 'ACCESS', 'SECURITY AND DISPLAY', 'ABOUT', 'Exit demo', 'Version 3.0.0']);

    expect(order.every((at) => at >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  test('the Project row opens the project picker', async () => {
    await open();
    await press('Project, Production');

    expect(screen.getByText('Organization and project')).toBeOnTheScreen();
  });

  test('Appearance switches to dark immediately and is remembered', async () => {
    await open();

    expect(page()).toHaveStyle({ backgroundColor: lightColors.background });

    await press('Appearance, Light');

    expect(screen.getByRole('button', { name: 'Follow phone' })).not.toBeSelected();
    expect(screen.getByRole('button', { name: 'Light' })).toBeSelected();

    await press('Dark');

    // At once, the whole app; the sheet is done
    expect(page()).toHaveStyle({ backgroundColor: darkColors.background });
    expect(screen.getByRole('button', { name: 'Appearance, Dark' })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Follow phone' })).not.toBeOnTheScreen();
    expect((await services.preferences.read()).appearance).toBe('dark');

    await press('Appearance, Dark');
    await press('Follow phone');

    expect((await services.preferences.read()).appearance).toBe('system');
    expect(screen.getByRole('button', { name: 'Appearance, Follow phone' })).toBeOnTheScreen();
  });

  test("an appearance that can't be saved keeps the sheet open, the look unchanged, and says so", async () => {
    jest.spyOn(services.preferences, 'update').mockRejectedValue(new Error('disk full'));
    await open();
    await press('Appearance, Light');
    await press('Dark');

    expect(page()).toHaveStyle({ backgroundColor: lightColors.background });
    expect(screen.getByRole('button', { name: 'Light' })).toBeSelected();
    expect(screen.getByText('Something went wrong. Try again.')).toBeOnTheScreen();
  });

  test('GitHub row opens the repository', async () => {
    await open();
    await press('Source code on GitHub');

    expect(WebBrowser.openBrowserAsync).toHaveBeenCalledWith(REPOSITORY);
  });

  test("the GitHub row says it opens outside the app, and says so when the browser can't open", async () => {
    jest.mocked(WebBrowser.openBrowserAsync).mockRejectedValueOnce(new Error('No browser'));
    await open();

    expect(screen.getByRole('button', { name: 'Source code on GitHub' }).props.accessibilityHint).toBe(
      'Opens in your browser',
    );
    expect(screen.queryByText('Something went wrong. Try again.')).not.toBeOnTheScreen();

    await press('Source code on GitHub');

    expect(screen.getByText('Something went wrong. Try again.')).toBeOnTheScreen();
  });

  test('the Access and About rows open their screens, and Back returns', async () => {
    const router = await open();

    await press('Activity');

    expect(router.getPathname()).toBe('/account/activity');
    expect(screen.getByRole('header', { name: 'Activity' })).toBeOnTheScreen();

    await press('Back');

    expect(router.getPathname()).toBe('/account');

    await press('About Scaleway Manager');

    expect(router.getPathname()).toBe('/account/about');

    await press('Back');
    await press('SSH keys');

    expect(router.getPathname()).toBe('/account/ssh-keys');

    await press('Back');
    await press('API keys');

    expect(router.getPathname()).toBe('/account/api-keys');
  });

  test('Switch organization row is hidden in demo mode', async () => {
    await open();

    expect(screen.getByText('Acme')).toBeOnTheScreen();
    expect(screen.queryByText('Switch organization')).not.toBeOnTheScreen();
  });

  test("Switch organization opens Scaleway's page at once, without its saved sign-in, and stays signed in", async () => {
    services = realServices();
    const signOut = jest.spyOn(services.keeper, 'signOut');
    const router = await open();

    expect(screen.getByText('me@example.com')).toBeOnTheScreen();
    expect(screen.getByText('Northwind')).toBeOnTheScreen();

    await press('Switch organization');

    // No question: a cancel on Scaleway's page changes nothing
    expect(screen.queryByText('Log in again?')).not.toBeOnTheScreen();
    expect(services.browser.open).toHaveBeenCalledWith(expect.any(String), expect.any(String), { fresh: true });
    expect(signOut).not.toHaveBeenCalled();
    expect(router.getPathname()).toBe('/account');
  });


  test('Switch organization is turned off while offline, and says why', async () => {
    services = realServices();
    await open();
    await act(async () => {
      onlineManager.setOnline(false);
    });

    expect(screen.getByRole('button', { name: "Switch organization, You're offline" })).toBeDisabled();
  });

  test('the version of the app is under everything', async () => {
    await open();

    expect(screen.getByText('Version 3.0.0')).toBeOnTheScreen();
  });
});

describe('About', () => {
  test('About shows the privacy answer', async () => {
    await open('/account/about');

    expect(screen.getByRole('header', { name: 'About' })).toBeOnTheScreen();
    expect(screen.getByText('What happens to my data?')).toBeOnTheScreen();
    expect(
      screen.getByText(
        "The app only talks to Scaleway. It collects no analytics and no crash reports, and it never sees your password: you log in on Scaleway's own page.",
      ),
    ).toBeOnTheScreen();
  });

  test('About answers every question, and Open GitHub opens the repository', async () => {
    await open('/account/about');

    const order = positions([
      'Is this an official Scaleway app?',
      "No. Scaleway Manager is an independent, open-source app that uses Scaleway's public API.",
      'What happens to my data?',
      'Is it free?',
      'Yes. Free, with no ads.',
      'How do I report a problem?',
      'Open an issue on GitHub.',
      'Who made it?',
      'Matthias Prost, with help from the open-source community.',
    ]);

    expect(order.every((at) => at >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);

    await press('Open GitHub');

    expect(WebBrowser.openBrowserAsync).toHaveBeenCalledWith(REPOSITORY);
    expect(screen.queryByText('Something went wrong. Try again.')).not.toBeOnTheScreen();
  });

  test("Open GitHub says so when the browser can't open", async () => {
    jest.mocked(WebBrowser.openBrowserAsync).mockRejectedValueOnce(new Error('No browser'));
    await open('/account/about');
    await press('Open GitHub');

    expect(screen.getByText('Something went wrong. Try again.')).toBeOnTheScreen();
  });
});

describe('Activity', () => {
  test('Activity groups events by day and names you as You', async () => {
    services = createServices('demo', { clock: { now: () => LATE_EVENING } });
    await open('/account/activity');

    // Days, newest first, each followed by its events
    const order = positions([
      'TODAY',
      'Logged in',
      'Stop server',
      'YESTERDAY',
      'Update database',
      'Delete snapshot',
      '16 NOVEMBER',
      'Upgrade cluster',
      'Create bucket',
    ]);

    expect(order.every((at) => at >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    // Title, who and which product, then the time
    expect(screen.getByLabelText('Logged in, You, 22:30')).toBeOnTheScreen();
    expect(screen.getByLabelText('Stop server, You · Instances, 20:30')).toBeOnTheScreen();
    expect(screen.getByLabelText('Create SSH key, Someone else · IAM, 18:30')).toBeOnTheScreen();
    expect(screen.getByLabelText('Reboot node, Scaleway · Kubernetes, 11:30')).toBeOnTheScreen();
    // 00:30 belongs to the day it starts (Yesterday), not to the evening before
    expect(screen.getByLabelText('Delete snapshot, Someone else · Instances · Failed, 00:30')).toBeOnTheScreen();
  });

  test('a failed event says Failed, in the danger tone', async () => {
    services = createServices('demo', { clock: { now: () => LATE_EVENING } });
    await open('/account/activity');

    expect(screen.getByLabelText('Login failed, Someone else · Failed, 15:30')).toBeOnTheScreen();
    expect(screen.getByText('Someone else · Instances · Failed')).toHaveStyle({ color: lightColors.alertText });
    expect(screen.getAllByText('You · Instances')[0]).toHaveStyle({ color: lightColors.textMuted });
  });

  test('Activity permission missing shows the calm message', async () => {
    jest
      .spyOn(services.activity, 'listRecent')
      .mockRejectedValue(new AppError('forbidden', 'Permission denied', 403));
    await open('/account/activity');

    expect(screen.getByText("Activity isn't available")).toBeOnTheScreen();
    expect(screen.getByText("You don't have access to the activity log in this organization.")).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeOnTheScreen();
  });

  test("Activity that can't load offers Try again, which loads it again", async () => {
    const listRecent = jest
      .spyOn(services.activity, 'listRecent')
      .mockRejectedValueOnce(new AppError('server', 'Down', 503));
    await open('/account/activity');

    expect(screen.getByText("Couldn't load your activity")).toBeOnTheScreen();

    await press('Try again');

    expect(listRecent).toHaveBeenCalledTimes(2);
    expect(screen.getByText('TODAY')).toBeOnTheScreen();
  });

  test('Try again is turned off while offline, and says why', async () => {
    services = realRules();
    jest.spyOn(services.activity, 'listRecent').mockRejectedValue(new AppError('server', 'Down', 503));
    await open('/account/activity');
    await act(async () => {
      onlineManager.setOnline(false);
    });

    expect(screen.getByRole('button', { name: 'Try again' })).toBeDisabled();
    expect(screen.getByText("You're offline")).toBeOnTheScreen();
  });

  test('no events says so', async () => {
    jest.spyOn(services.activity, 'listRecent').mockResolvedValue([]);
    await open('/account/activity');

    expect(screen.getByText('No recent activity')).toBeOnTheScreen();
  });

  test('pulling Activity down asks Scaleway again', async () => {
    const listRecent = jest.spyOn(services.activity, 'listRecent');
    await open('/account/activity');

    expect(listRecent).toHaveBeenCalledTimes(1);

    await act(async () => {
      screen.getByTestId('screen-scroll').props.refreshControl.props.onRefresh();
    });
    await settle();

    expect(listRecent).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId('screen-scroll').props.refreshControl.props.refreshing).toBe(false);
  });

  test('offline, Activity offers no pull to refresh (it would spin until the phone is back)', async () => {
    services = realRules();
    await open('/account/activity');

    expect(screen.getByTestId('screen-scroll').props.refreshControl).toBeDefined();

    await act(async () => {
      onlineManager.setOnline(false);
    });

    expect(screen.getByTestId('screen-scroll').props.refreshControl).toBeUndefined();
    // The saved events stay
    expect(screen.getByText('TODAY')).toBeOnTheScreen();
  });

  test('a pull to refresh that fails says so above the events, and the events stay', async () => {
    const listRecent = jest.spyOn(services.activity, 'listRecent');
    await open('/account/activity');
    listRecent.mockRejectedValueOnce(new AppError('server', 'Down', 503));

    await act(async () => {
      screen.getByTestId('screen-scroll').props.refreshControl.props.onRefresh();
    });
    await settle();

    const order = positions(['Something went wrong. Try again.', 'TODAY']);

    expect(order.every((at) => at >= 0)).toBe(true);
    expect(order[0]).toBeLessThan(order[1] ?? 0);
    expect(screen.getByTestId('screen-scroll').props.refreshControl.props.refreshing).toBe(false);

    // The next pull that works clears it
    await act(async () => {
      screen.getByTestId('screen-scroll').props.refreshControl.props.onRefresh();
    });
    await settle();

    expect(screen.queryByText('Something went wrong. Try again.')).not.toBeOnTheScreen();
  });

  test("a failed pull's line goes away once the activity reloads by itself", async () => {
    const listRecent = jest.spyOn(services.activity, 'listRecent');
    await open('/account/activity');
    listRecent.mockRejectedValueOnce(new AppError('server', 'Down', 503));

    await act(async () => {
      page().props.refreshControl.props.onRefresh();
    });
    await settle();

    expect(screen.getByText('Something went wrong. Try again.')).toBeOnTheScreen();

    // The network drops and comes back: TanStack reloads the activity on its own, no pull
    await act(async () => {
      onlineManager.setOnline(false);
    });
    await act(async () => {
      onlineManager.setOnline(true);
    });
    await settle();

    expect(listRecent).toHaveBeenCalledTimes(3);
    expect(screen.queryByText('Something went wrong. Try again.')).not.toBeOnTheScreen();
    expect(screen.getByText('TODAY')).toBeOnTheScreen();
  });

  test('while it loads, Activity shows rows of placeholders', async () => {
    jest.spyOn(services.activity, 'listRecent').mockReturnValue(new Promise(() => {}));
    await open('/account/activity');

    expect(screen.getAllByTestId('skeleton')).toHaveLength(6);
  });
});
