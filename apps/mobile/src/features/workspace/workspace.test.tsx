import { AppError, DEFAULT_PREFERENCES, LOGIN_RETURN_URL } from '@scaleway-manager/core';
import type { LoginReceiver, Project, Session } from '@scaleway-manager/core';
import { Text, ThemeProvider } from '@scaleway-manager/ui';
import { onlineManager, QueryClientProvider, skipToken, useQuery } from '@tanstack/react-query';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import { Slot } from 'expo-router';
import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import TabsLayout from '../../../app/(tabs)/_layout';
import Welcome from '../../../app/welcome';
import { ToastProvider } from '../feedback/ToastProvider';
import { LockProvider } from '../lock/LockProvider';
import { SessionProvider } from '../session/SessionProvider';
import { useSignedOutRedirect } from '../session/useSignedOutRedirect';
import { renderWithApp } from '../../test-utils/renderWithApp';
import { createQueryClient } from '../../wiring/queryClient';
import { createServices } from '../../wiring/services';
import type { Services } from '../../wiring/services';
import { ServicesProvider } from '../../wiring/ServicesProvider';
import { ProjectPickerSheet } from './ProjectPickerSheet';
import { useWorkspace } from './useWorkspace';
import { WorkspaceProvider } from './WorkspaceProvider';

const SESSION: Session = {
  token: 'token',
  renewToken: 'renew',
  sessionId: 'session',
  userId: 'user',
  expiresAt: '2099-01-01T00:00:00.000Z',
};

const ORGANIZATION_NAMES: Record<string, string> = { 'org-a': 'Acme', 'org-b': 'Globex' };

const PROJECTS: Project[] = [
  { id: 'p-staging', name: 'Staging', organizationId: 'org-a' },
  { id: 'p-default', name: 'default', organizationId: 'org-a' },
  { id: 'p-prod', name: 'Production', organizationId: 'org-a' },
  { id: 'b-default', name: 'default', organizationId: 'org-b' },
  { id: 'b-web', name: 'Web', organizationId: 'org-b' },
];

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const SOMETHING_WRONG = 'Something went wrong. Try again.';

const LOGIN_ERROR = "Login didn't work. Please try again.";

// lucide's chevron-right: the mark of a row that opens something
const CHEVRON = 'm9 18 6-6-6-6';


// The phone's key-value storage; it outlives a restart.
const makeStorage = (projectIdByOrg?: Record<string, string>) => {
  const saved = new Map<string, string>();
  if (projectIdByOrg !== undefined) {
    saved.set('sm.preferences', JSON.stringify({ ...DEFAULT_PREFERENCES, projectIdByOrg }));
  }

  return {
    saved,
    kv: {
      getItem: async (key: string) => saved.get(key) ?? null,
      setItem: async (key: string, value: string) => {
        saved.set(key, value);
      },
      removeItem: async (key: string) => {
        saved.delete(key);
      },
    },
  };
};

type Storage = ReturnType<typeof makeStorage>;

// The project saved for each organization, as written on the phone.
const savedChoice = (storage: Storage) =>
  (JSON.parse(storage.saved.get('sm.preferences') ?? '{}') as { projectIdByOrg?: Record<string, string> })
    .projectIdByOrg;

let receiver: LoginReceiver;

type Setup = { storage?: Storage; organizationId?: string; demo?: boolean };

// Signed in (real mode, no network) to an organization with a few projects; the login opens a fake browser.
const makeServices = ({ storage = makeStorage(), organizationId = 'org-a', demo = false }: Setup = {}): Services => {
  receiver = {
    callbackUrl: 'http://localhost:47815/callback',
    nextCallback: () => new Promise<string>(() => {}),
    received: () => null,
    stop: jest.fn(async () => {}),
  };

  if (demo) {
    return createServices('demo', { kv: storage.kv });
  }

  let stored: Session | null = SESSION;
  const base = createServices('real', {
    fetch: async () => {
      throw new Error('Tests have no network');
    },
    kv: storage.kv,
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
    account: { getCurrentUser: async () => ({ id: 'user', email: 'me@example.com', organizationId }) },
    workspace: {
      getOrganization: async (id) => ({ id, name: ORGANIZATION_NAMES[id] ?? 'Unknown' }),
      listProjects: async (id) => PROJECTS.filter((project) => project.organizationId === id),
    },
    receiver: { start: jest.fn(async () => receiver) },
    browser: { open: jest.fn(async () => 'cancelled' as const), close: jest.fn(async () => {}) },
  };
};

// What a screen shows of the workspace: the chip's words.
function ProjectBased() {
  const { status, organization, project } = useWorkspace();

  return (
    <Text variant="body">
      {status === 'ready' && organization !== null && project !== null ? `${organization.name} · ${project.name}` : status}
    </Text>
  );
}

// A project-based query (alerts, resources, pins in later tasks): its key holds the chosen project.
function ProjectQuery() {
  const projectId = useWorkspace().project?.id;
  useQuery({
    queryKey: ['project-based', projectId],
    queryFn: projectId === undefined ? skipToken : async () => `loaded ${projectId}`,
  });

  return null;
}

function Picker({ onClose = () => {} }: { onClose?: () => void }) {
  return (
    <LockProvider>
      <ProjectPickerSheet visible onClose={onClose} />
    </LockProvider>
  );
}

const press = async (name: string) => {
  await act(async () => {
    fireEvent.press(screen.getByRole('button', { name }));
  });
};

beforeEach(() => {
  onlineManager.setOnline(true);
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

test('picks the default project on first launch and saves it', async () => {
  const storage = makeStorage();
  await renderWithApp(<ProjectBased />, { services: makeServices({ storage }) });

  expect(await screen.findByText('Acme · default')).toBeOnTheScreen();
  await waitFor(() => expect(savedChoice(storage)).toEqual({ 'org-a': 'p-default' }));
});

test('the workspace says error when the projects cannot be loaded', async () => {
  const services = makeServices();
  services.workspace = {
    ...services.workspace,
    listProjects: async () => {
      throw new AppError('server', 'Down', 503);
    },
  };
  await renderWithApp(<ProjectBased />, { services });

  expect(await screen.findByText('error')).toBeOnTheScreen();
});

test('screens that pick the same project save it once', async () => {
  const storage = makeStorage();
  const services = makeServices({ storage });
  const update = jest.spyOn(services.preferences, 'update');
  await renderWithApp(
    <>
      <ProjectBased />

      <ProjectBased />

      <ProjectBased />
    </>,
    { services },
  );

  expect(await screen.findAllByText('Acme · default')).toHaveLength(3);
  await waitFor(() => expect(savedChoice(storage)).toEqual({ 'org-a': 'p-default' }));
  // Every queued save has had time to run
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 50));
  });

  expect(update).toHaveBeenCalledTimes(1);
});

test('keeps the saved project across restarts', async () => {
  const storage = makeStorage();
  const first = await renderWithApp(
    <>
      <ProjectBased />

      <Picker />
    </>,
    { services: makeServices({ storage }) },
  );
  await screen.findByText('Acme · default');
  await press('Production');
  expect(await screen.findByText('Acme · Production')).toBeOnTheScreen();
  await first.unmount();

  // A restart: new services and an empty cache, the same phone storage
  await renderWithApp(
    <>
      <ProjectBased />

      <Picker />
    </>,
    { services: makeServices({ storage }) },
  );

  expect(await screen.findByText('Acme · Production')).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Production' })).toBeSelected();
  expect(savedChoice(storage)).toEqual({ 'org-a': 'p-prod' });
});

test('falls back silently when the saved project is gone', async () => {
  const storage = makeStorage({ 'org-a': 'p-deleted' });
  await renderWithApp(
    <>
      <ProjectBased />

      <Picker />
    </>,
    { services: makeServices({ storage }) },
  );

  expect(await screen.findByText('Acme · default')).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'default' })).toBeSelected();
  await waitFor(() => expect(savedChoice(storage)).toEqual({ 'org-a': 'p-default' }));
  expect(screen.queryByText(SOMETHING_WRONG)).not.toBeOnTheScreen();
});

test('choosing a project in the sheet switches every project-based query', async () => {
  const storage = makeStorage();
  const onClose = jest.fn();
  const { queryClient } = await renderWithApp(
    <>
      <ProjectBased />

      <ProjectQuery />

      <Picker onClose={onClose} />
    </>,
    { services: makeServices({ storage }) },
  );
  await screen.findByText('Acme · default');

  // Organization first, then its projects, the picked one marked
  expect(screen.getByText('Organization and project')).toBeOnTheScreen();
  expect(screen.getByText('Acme')).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'default' })).toBeSelected();
  expect(screen.getByRole('button', { name: 'Production' })).not.toBeSelected();

  await press('Production');

  expect(await screen.findByText('Acme · Production')).toBeOnTheScreen();
  expect(onClose).toHaveBeenCalledTimes(1);
  expect(savedChoice(storage)).toEqual({ 'org-a': 'p-prod' });
  await waitFor(() => expect(queryClient.getQueryData(['project-based', 'p-prod'])).toBe('loaded p-prod'));
});

test("switching project in organization B keeps organization A's choice", async () => {
  const storage = makeStorage({ 'org-a': 'p-prod' });
  await renderWithApp(
    <>
      <ProjectBased />

      <Picker />
    </>,
    { services: makeServices({ storage, organizationId: 'org-b' }) },
  );
  await screen.findByText('Globex · default');

  await press('Web');

  expect(await screen.findByText('Globex · Web')).toBeOnTheScreen();
  expect(savedChoice(storage)).toEqual({ 'org-a': 'p-prod', 'org-b': 'b-web' });
});

test('a project that cannot be saved keeps the sheet open and says something went wrong', async () => {
  const storage = makeStorage({ 'org-a': 'p-default' });
  const services = makeServices({ storage });
  const onClose = jest.fn();
  await renderWithApp(
    <>
      <ProjectBased />

      <Picker onClose={onClose} />
    </>,
    { services },
  );
  await screen.findByText('Acme · default');
  jest.spyOn(services.preferences, 'update').mockRejectedValue(new Error('disk full'));

  await press('Production');

  expect(await screen.findByText(SOMETHING_WRONG)).toBeOnTheScreen();
  expect(onClose).not.toHaveBeenCalled();
  expect(screen.getByText('Acme · default')).toBeOnTheScreen();
  expect(savedChoice(storage)).toEqual({ 'org-a': 'p-default' });
});

test("switch organization opens Scaleway's page without its saved sign-in, and stays signed in meanwhile", async () => {
  const services = makeServices();
  const signOut = jest.spyOn(services.keeper, 'signOut');
  await renderWithApp(<Picker />, { services });
  await screen.findByText('Acme');

  await press('Switch organization');

  // No question: a cancel on Scaleway's page changes nothing
  expect(screen.queryByText('Log in again?')).not.toBeOnTheScreen();
  await waitFor(() => expect(services.browser.open).toHaveBeenCalled());
  expect(services.browser.open).toHaveBeenCalledWith(
    `https://account.scaleway.com/authenticate?redirectToUrl=${encodeURIComponent(receiver.callbackUrl)}`,
    LOGIN_RETURN_URL,
    // Without the saved sign-in, so Scaleway lists the account's organizations
    { fresh: true },
  );
  expect(signOut).not.toHaveBeenCalled();
  expect(await services.keeper.current()).not.toBeNull();
});


test('a cancelled switch keeps the picker, the organization and the session', async () => {
  const services = makeServices();
  const onClose = jest.fn();
  await renderWithApp(<Picker onClose={onClose} />, { services });
  await screen.findByText('Acme');

  // The fake browser closes without a callback: the user cancelled on Scaleway's page
  await press('Switch organization');
  await waitFor(() => expect(services.browser.open).toHaveBeenCalled());

  expect(screen.getByRole('button', { name: 'Production' })).toBeOnTheScreen();
  expect(screen.queryByText(SOMETHING_WRONG)).not.toBeOnTheScreen();
  expect(onClose).not.toHaveBeenCalled();
  expect(await services.keeper.current()).not.toBeNull();
});


test('a failed switch says something went wrong under the row, and keeps the organization', async () => {
  const services = makeServices();
  receiver.nextCallback = () => Promise.reject(new Error('LISTENER_LOST'));
  (services.browser.open as jest.Mock).mockReturnValue(new Promise(() => {}));
  await renderWithApp(<Picker />, { services });
  await screen.findByText('Acme');

  await press('Switch organization');

  expect(await screen.findByText(SOMETHING_WRONG)).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Switch organization' })).toBeOnTheScreen();
  expect(await services.keeper.current()).not.toBeNull();
});


test('switch organization is turned off while offline, and says why', async () => {
  await renderWithApp(<Picker />, { services: makeServices() });
  await screen.findByText('Acme');

  await act(async () => {
    onlineManager.setOnline(false);
  });

  expect(screen.getByRole('button', { name: "Switch organization, You're offline" })).toBeDisabled();
  // Choosing a project only changes what the phone shows: it still works
  expect(screen.getByRole('button', { name: 'Production' })).toBeEnabled();
});

test('the Switch organization row shows that it opens something', async () => {
  await renderWithApp(<Picker />, { services: makeServices() });
  const row = await screen.findByRole('button', { name: 'Switch organization' });

  expect(JSON.stringify(row.toJSON())).toContain(CHEVRON);
});

test("switch organization stays when the organization's name can't be loaded", async () => {
  const services = makeServices();
  services.workspace = {
    ...services.workspace,
    getOrganization: async () => {
      throw new AppError('forbidden', 'No access', 403);
    },
  };
  await renderWithApp(<Picker />, { services });

  expect(await screen.findByRole('button', { name: 'Switch organization' })).toBeEnabled();
  expect(screen.getByRole('button', { name: 'default' })).toBeSelected();
});

test('the sheet shows a loading shape until the workspace loads, never an empty body', async () => {
  const services = makeServices();
  services.account = { getCurrentUser: () => new Promise(() => {}) };
  await renderWithApp(<Picker />, { services });
  await act(async () => {});

  // The real layout, in row shapes drawn by ui (Section loading): the organization's name, then the project rows
  expect(screen.getByText('Organization and project')).toBeOnTheScreen();
  expect(screen.getAllByTestId('row-placeholder')).toHaveLength(4);
  expect(screen.getAllByTestId('skeleton')).toHaveLength(8);
  // Switch organization doesn't wait for the name
  expect(screen.getByRole('button', { name: 'Switch organization' })).toBeOnTheScreen();
});

test("the sheet offers Try again when the projects can't be loaded", async () => {
  const services = makeServices();
  let down = true;
  services.workspace = {
    ...services.workspace,
    listProjects: async (id) => {
      if (down) {
        throw new AppError('server', 'Down', 503);
      }

      return PROJECTS.filter((project) => project.organizationId === id);
    },
  };
  await renderWithApp(<Picker />, { services });

  expect(await screen.findByText("Couldn't load your projects")).toBeOnTheScreen();
  expect(screen.queryAllByTestId('skeleton')).toHaveLength(0);

  down = false;
  await press('Try again');

  expect(await screen.findByRole('button', { name: 'default' })).toBeSelected();
  expect(screen.queryByText("Couldn't load your projects")).not.toBeOnTheScreen();
});

test("Try again is turned off while offline, and says why", async () => {
  const services = makeServices();
  services.workspace = {
    ...services.workspace,
    listProjects: async () => {
      throw new AppError('server', 'Down', 503);
    },
  };
  await renderWithApp(<Picker />, { services });
  await screen.findByText("Couldn't load your projects");

  await act(async () => {
    onlineManager.setOnline(false);
  });

  expect(screen.getByRole('button', { name: 'Try again' })).toBeDisabled();
  // One note under Try again, one on the Switch organization row
  expect(screen.getAllByText("You're offline")).toHaveLength(2);
});

test('switch organization is hidden in demo mode', async () => {
  await renderWithApp(<Picker />, { services: makeServices({ demo: true }) });

  expect(await screen.findByText('Acme')).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Production' })).toBeSelected();
  expect(screen.getByRole('button', { name: 'Staging' })).toBeOnTheScreen();
  expect(screen.queryByText('Switch organization')).not.toBeOnTheScreen();
});

describe('inside the app', () => {
  let services: Services;
  let queryClient = createQueryClient();
  // Called when the Account tab is thrown away
  let accountClosed = jest.fn();

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

  // Stands in for Account, which opens the picker.
  function AccountWithPicker() {
    useEffect(() => accountClosed, []);

    return (
      <>
        <Text variant="body">Account</Text>

        <ProjectPickerSheet visible onClose={() => {}} />
      </>
    );
  }

  function HomeStub() {
    return <Text variant="body">Home</Text>;
  }

  function TabStub() {
    return <Text variant="body">Another tab</Text>;
  }

  // The root layout's sign-out guard, around the routes
  function Root() {
    useSignedOutRedirect();

    return <Slot />;
  }

  const routes = {
    _layout: Root,
    welcome: Welcome,
    '(tabs)/_layout': TabsLayout,
    '(tabs)/home': HomeStub,
    '(tabs)/resources': TabStub,
    '(tabs)/billing': TabStub,
    '(tabs)/account': AccountWithPicker,
  };

  // The router uses fake timers, so let pending promises finish inside act.
  const settle = () =>
    act(async () => {
      await jest.advanceTimersByTimeAsync(50);
    });

  const setUp = () => {
    accountClosed = jest.fn();
    services = makeServices();
    queryClient = createQueryClient();
    queryClient.setDefaultOptions({ queries: { retry: false } });
  };

  const switchOrganization = async () => {
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Switch organization' }));
    });
    await settle();
  };

  test('switch organization stays signed in while Scaleway is open, then lands on Home in the new one, with fresh tabs', async () => {
    // Also: the sheet's queries, made while it renders, never update the offline pill in the middle of it
    const error = jest.spyOn(console, 'error');
    setUp();
    let deliver: (url: string) => void = () => {};
    receiver.nextCallback = () =>
      new Promise<string>((resolve) => {
        deliver = resolve;
      });
    // Scaleway's page stays open until the callback arrives
    (services.browser.open as jest.Mock).mockReturnValue(new Promise(() => {}));
    // Another organization: Scaleway gives a new session for it
    const other: Session = { ...SESSION, token: 'token-b', sessionId: 'session-b' };
    const startFromCallback = jest.spyOn(services.keeper, 'startFromCallback').mockImplementation(async () => {
      await services.keeper.start(other);

      return other;
    });
    await renderRouter(routes, { initialUrl: '/account', wrapper: Providers });
    await settle();

    await switchOrganization();

    // Scaleway's page is open, without its saved sign-in; the current organization is still there behind it
    expect(services.browser.open).toHaveBeenCalledWith(expect.any(String), LOGIN_RETURN_URL, { fresh: true });
    expect(screen).toHavePathname('/account');
    expect(await services.keeper.current()).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Switch organization' })).toBeBusy();

    await act(async () => {
      deliver('http://localhost:47815/callback?token=abc');
    });
    await settle();

    expect(startFromCallback).toHaveBeenCalledWith('http://localhost:47815/callback?token=abc');
    expect(await services.keeper.current()).toEqual(other);
    expect(screen).toHavePathname('/home');
    expect(screen.getByText('Home')).toBeOnTheScreen();
    // The tabs built for the old organization are gone, so none keeps showing its data
    expect(accountClosed).toHaveBeenCalledTimes(1);
    expect(error).not.toHaveBeenCalled();
  });

  test('a failed switch says something went wrong under the row, and stays in the organization', async () => {
    setUp();
    let fail: (error: Error) => void = () => {};
    receiver.nextCallback = () =>
      new Promise<string>((_resolve, reject) => {
        fail = reject;
      });
    (services.browser.open as jest.Mock).mockReturnValue(new Promise(() => {}));
    await renderRouter(routes, { initialUrl: '/account', wrapper: Providers });
    await settle();

    await switchOrganization();
    await act(async () => {
      fail(new Error('LISTENER_LOST'));
    });
    await settle();

    expect(screen).toHavePathname('/account');
    expect(screen.getByText(SOMETHING_WRONG)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Switch organization' })).not.toBeBusy();
    expect(await services.keeper.current()).not.toBeNull();
    // Welcome's login line stays for Welcome's own logins
    expect(screen.queryByText(LOGIN_ERROR)).not.toBeOnTheScreen();
  });

  test('a cancelled switch changes nothing', async () => {
    setUp();
    await renderRouter(routes, { initialUrl: '/account', wrapper: Providers });
    await settle();

    await switchOrganization();

    expect(services.browser.open).toHaveBeenCalledTimes(1);
    expect(screen).toHavePathname('/account');
    expect(screen.queryByText(SOMETHING_WRONG)).not.toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Switch organization' })).toBeEnabled();
    expect(await services.keeper.current()).not.toBeNull();
  });
});
