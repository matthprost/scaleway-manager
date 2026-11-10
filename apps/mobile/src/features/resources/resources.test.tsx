import { AppError, instanceStatus } from '@scaleway-manager/core';
import type { InstanceServer, InstanceState } from '@scaleway-manager/core';
import { ActionGrid, Button, lightColors, Screen, Stack, Text, ThemeProvider } from '@scaleway-manager/ui';
import { onlineManager, QueryClientProvider } from '@tanstack/react-query';
import { Slot } from 'expo-router';
import { act, fireEvent, renderRouter, screen, within } from 'expo-router/testing-library';
import type { ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import TabsLayout from '../../../app/(tabs)/_layout';
import Resources from '../../../app/(tabs)/resources';
import * as ResourcesLayout from '../../../app/(tabs)/resources/_layout';
import ProductResources from '../../../app/(tabs)/resources/[product]';
import ResourceDetail from '../../../app/(tabs)/resources/[product]/[locality]/[id]';
import { renderWithApp } from '../../test-utils/renderWithApp';
import { createQueryClient } from '../../wiring/queryClient';
import { createServices } from '../../wiring/services';
import type { Services } from '../../wiring/services';
import { ServicesProvider } from '../../wiring/ServicesProvider';
import { ActionFailed } from '../errors/ActionFailed';
import { ToastProvider } from '../feedback/ToastProvider';
import { LockProvider } from '../lock/LockProvider';
import { SessionProvider } from '../session/SessionProvider';
import { useSignedOutRedirect } from '../session/useSignedOutRedirect';
import { useWorkspace } from '../workspace/useWorkspace';
import { WorkspaceProvider } from '../workspace/WorkspaceProvider';
import { DetailScreen } from './DetailScreen';
import { LiveResourcesSection } from './LiveResourcesSection';
import { useResourceAction } from './useResourceAction';
import { useResourceSummaries } from './useResourceSummaries';

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

// The demo (signed in, no network), with its own empty phone storage. Its clock is the (fake) system clock, so its
// actions move on as the test moves time.
const demo = (): Services => {
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

// The demo's data with the real app's rules: the demo itself ignores the network, so offline tests use these
const realRules = (): Services => ({ ...demo(), mode: 'real' });

// Every product's list, whatever its items
const productLists = (services: Services): { list: (projectId: string) => Promise<unknown[]> }[] => [
  services.instances,
  services.elasticMetal,
  services.kubernetes,
  services.databases,
  services.serverless,
  services.jobs,
  services.loadBalancers,
];

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
  onlineManager.setOnline(true);
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

// The root layout's sign-out guard, around the routes
function Root() {
  useSignedOutRedirect();

  return <Slot />;
}

// Home's Live resources alone: the full Home animates every frame, which makes fake time slow
function LiveResourcesOnly() {
  return (
    <Screen>
      <Stack>
        <LiveResourcesSection />
      </Stack>
    </Screen>
  );
}

// Home with only a way to switch project (the picker's choice)
function ProjectSwitch() {
  const { setProject } = useWorkspace();

  return <Button label="Switch to Staging" size="md" onPress={() => void setProject('demo-staging')} />;
}

function Stub() {
  return <Text variant="body">Another tab</Text>;
}

function WelcomeStub() {
  return <Text variant="body">Welcome</Text>;
}

const routes = {
  _layout: Root,
  welcome: WelcomeStub,
  '(tabs)/_layout': TabsLayout,
  '(tabs)/home': LiveResourcesOnly,
  '(tabs)/resources/_layout': ResourcesLayout,
  '(tabs)/resources/index': Resources,
  '(tabs)/resources/[product]/index': ProductResources,
  '(tabs)/resources/[product]/[locality]/[id]': ResourceDetail,
  '(tabs)/billing': Stub,
  '(tabs)/account': Stub,
};

// The router uses fake timers: let the queries finish inside act
const settle = () =>
  act(async () => {
    await jest.advanceTimersByTimeAsync(50);
  });

const wait = (ms: number) =>
  act(async () => {
    await jest.advanceTimersByTimeAsync(ms);
  });

const openAt = async (initialUrl: string) => {
  await renderRouter(routes, { initialUrl, wrapper: Providers });
  await settle();
};

const press = async (name: string | RegExp) => {
  await act(async () => {
    fireEvent.press(screen.getByRole('button', { name }));
  });
  await settle();
};

// What screen readers hear for each row that opens something, in order (the tab bar's are tabs, not buttons)
const rows = () =>
  screen
    .queryAllByRole('button')
    .map((row) => row.props.accessibilityLabel as string)
    .filter((label) => label !== 'Back');

// The demo's Staging project, which only has staging-1
const staging = async () => {
  await services.preferences.update({ projectIdByOrg: { 'demo-org': 'demo-staging' } });
};

// The screen's pull to refresh (none: undefined)
const refreshControl = () => screen.getByTestId('screen-scroll').props.refreshControl;

const pullDown = async () => {
  await act(async () => {
    refreshControl().props.onRefresh();
  });
  await settle();
};

const goOffline = async () => {
  await act(async () => {
    onlineManager.setOnline(false);
  });
};

const goOnline = async () => {
  await act(async () => {
    onlineManager.setOnline(true);
  });
  await settle();
};

describe('the Resources tab', () => {
  test('Resources lists only products in use with their counts', async () => {
    await openAt('/resources');

    expect(screen.getByRole('header', { name: 'Resources' })).toBeOnTheScreen();
    expect(rows()).toEqual([
      'Instances, 2 OK · 1 stopped, 3 resources',
      'Elastic Metal, 1 OK, 1 resource',
      'Kubernetes, 1 OK, 1 resource',
      'Databases, 1 OK, 1 resource',
      'Serverless containers, 1 OK, 1 resource',
      'Serverless functions, 1 failing, 1 resource',
      'Jobs, 1 OK, 1 resource',
      'Load balancers, 1 needs attention, 1 resource',
    ]);
  });

  test('Resources follows the selected project', async () => {
    await staging();
    await openAt('/resources');

    expect(rows()).toEqual(['Instances, 1 OK, 1 resource']);
  });

  test("a product's dot shows its worst health, next to its words", async () => {
    await openAt('/resources');

    const functions = screen.getByRole('button', { name: 'Serverless functions, 1 failing, 1 resource' });

    // The dot is hidden from screen readers: the words say the same
    expect(within(functions).getByTestId('health-dot', { includeHiddenElements: true })).toHaveStyle({
      backgroundColor: lightColors.alertText,
    });
    expect(within(functions).getByText('1 failing')).toBeOnTheScreen();
  });

  test('product with no access is hidden', async () => {
    jest.spyOn(services.kubernetes, 'list').mockRejectedValue(new AppError('forbidden', 'Forbidden', 403));
    await openAt('/resources');

    expect(rows()).not.toContain('Kubernetes, 1 OK, 1 resource');
    expect(rows()).toHaveLength(7);
    expect(screen.queryByText("Couldn't load your resources")).not.toBeOnTheScreen();
    expect(screen.queryByText("Resources aren't available")).not.toBeOnTheScreen();
  });

  test('a product that fails while others load says so, with Try again', async () => {
    const instances = jest.spyOn(services.instances, 'list').mockRejectedValue(new AppError('server', 'Down', 500));
    await openAt('/resources');

    // The others are there; the one that failed says so instead of vanishing
    expect(screen.getByRole('button', { name: 'Kubernetes, 1 OK, 1 resource' })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: /^Instances,/ })).not.toBeOnTheScreen();
    expect(screen.getByText("Couldn't load your Instances")).toBeOnTheScreen();

    instances.mockRestore();
    await press('Try again');

    expect(screen.queryByText("Couldn't load your Instances")).not.toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Instances, 2 OK · 1 stopped, 3 resources' })).toBeOnTheScreen();
  });

  test('several products that fail are named together', async () => {
    jest.spyOn(services.kubernetes, 'list').mockRejectedValue(new AppError('server', 'Down', 500));
    jest.spyOn(services.jobs, 'list').mockRejectedValue(new AppError('unknown', 'Oops'));
    // Refused (403): not in use, so not a failure
    jest.spyOn(services.databases, 'list').mockRejectedValue(new AppError('forbidden', 'Forbidden', 403));
    await openAt('/resources');

    expect(screen.getByText("Couldn't load your Kubernetes and Jobs")).toBeOnTheScreen();
  });

  test('offline, a product that never loaded says so, and its Try again waits for the network', async () => {
    services = realRules();
    jest.spyOn(services.jobs, 'list').mockRejectedValue(new AppError('offline', 'Network request failed'));
    await openAt('/resources');
    await goOffline();

    expect(screen.getByText("Couldn't load your Jobs")).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeDisabled();
    expect(screen.getByText("You're offline")).toBeOnTheScreen();
  });

  test('Resources shows placeholder rows while the products load', async () => {
    for (const port of productLists(services)) {
      jest.spyOn(port, 'list').mockReturnValue(new Promise(() => {}));
    }
    await openAt('/resources');

    expect(screen.getAllByTestId('row-placeholder')).toHaveLength(3);
  });

  test('Resources says when nothing could be loaded, and tries again', async () => {
    const lists = productLists(services).map((port) =>
      jest.spyOn(port, 'list').mockRejectedValue(new AppError('server', 'Down', 500)),
    );
    await openAt('/resources');

    expect(screen.getByText("Couldn't load your resources")).toBeOnTheScreen();

    for (const list of lists) {
      list.mockResolvedValue([]);
    }
    await press('Try again');

    expect(screen.getByText('No resources in this project')).toBeOnTheScreen();
  });

  test('Resources says when no product is available to this user', async () => {
    for (const port of productLists(services)) {
      jest.spyOn(port, 'list').mockRejectedValue(new AppError('forbidden', 'Forbidden', 403));
    }
    await openAt('/resources');

    expect(screen.getByText("Resources aren't available")).toBeOnTheScreen();
    expect(screen.getByText("You don't have access to resources in this project.")).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeOnTheScreen();
  });

  test('one product refusing while the others are empty means nothing to show, not no access', async () => {
    for (const port of productLists(services)) {
      jest.spyOn(port, 'list').mockResolvedValue([]);
    }
    jest.spyOn(services.kubernetes, 'list').mockRejectedValue(new AppError('forbidden', 'Forbidden', 403));
    await openAt('/resources');

    expect(screen.getByText('No resources in this project')).toBeOnTheScreen();
    expect(screen.queryByText("Resources aren't available")).not.toBeOnTheScreen();
  });

  test('Resources says when the project has no resources', async () => {
    for (const port of productLists(services)) {
      jest.spyOn(port, 'list').mockResolvedValue([]);
    }
    await openAt('/resources');

    expect(screen.getByText('No resources in this project')).toBeOnTheScreen();
    expect(screen.getByText('Resources you create on Scaleway show up here.')).toBeOnTheScreen();
  });

  test('pulling Resources down asks every product again', async () => {
    const lists = productLists(services).map((port) => jest.spyOn(port, 'list'));
    await openAt('/resources');
    await pullDown();

    for (const list of lists) {
      expect(list).toHaveBeenCalledTimes(2);
    }
    expect(refreshControl().props.refreshing).toBe(false);
  });

  test('a refresh that fails keeps the products and says so, until one works', async () => {
    const instances = jest.spyOn(services.instances, 'list');
    await openAt('/resources');
    instances.mockRejectedValue(new AppError('server', 'Down', 500));
    await pullDown();

    // What was there stays; the quiet line says the refresh didn't work
    expect(screen.getByRole('button', { name: 'Instances, 2 OK · 1 stopped, 3 resources' })).toBeOnTheScreen();
    expect(screen.getByText('Something went wrong. Try again.')).toBeOnTheScreen();
    expect(screen.queryByText("Couldn't load your Instances")).not.toBeOnTheScreen();

    instances.mockRestore();
    await pullDown();

    expect(screen.queryByText('Something went wrong. Try again.')).not.toBeOnTheScreen();
  });

  test('offline, Resources has no pull to refresh (it would only wait)', async () => {
    services = realRules();
    await openAt('/resources');

    expect(refreshControl()).toBeDefined();

    await goOffline();

    expect(refreshControl()).toBeUndefined();
  });

  test("a product opens its resources' list", async () => {
    await openAt('/resources');
    await press('Instances, 2 OK · 1 stopped, 3 resources');

    expect(screen).toHavePathname('/resources/instances');
    expect(screen.getByRole('header', { name: 'Instances' })).toBeOnTheScreen();
  });
});

describe("a product's list", () => {
  test('pinned resources come first in a product list', async () => {
    await services.pins.toggle('demo-prod', 'instances:pl-waw-1:demo-worker-1');
    await openAt('/resources/instances');

    expect(rows()).toEqual([
      'worker-1, DEV1-M · pl-waw-1, Standby, Pinned',
      'api-prod-2, 203.0.113.21 · nl-ams-1, Running',
      'web-prod-1, 203.0.113.34 · fr-par-1, Running',
    ]);
  });

  test("pulling a product's list down asks it again", async () => {
    const list = jest.spyOn(services.instances, 'list');
    await openAt('/resources/instances');
    const asked = list.mock.calls.length;
    await pullDown();

    expect(list).toHaveBeenCalledTimes(asked + 1);
  });

  test('serverless containers and functions each list their own', async () => {
    await openAt('/resources/functions');

    expect(screen.getByRole('header', { name: 'Serverless functions' })).toBeOnTheScreen();
    expect(rows()).toEqual(['resize-images, python313 · fr-par, Error']);
  });

  test('a product list that fails says so, and tries again', async () => {
    const list = jest.spyOn(services.instances, 'list').mockRejectedValue(new AppError('server', 'Down', 500));
    await openAt('/resources/instances');

    expect(screen.getByText("Couldn't load your Instances")).toBeOnTheScreen();

    list.mockRestore();
    await press('Try again');

    expect(rows()).toHaveLength(3);
  });

  test('an empty product list names the product', async () => {
    jest.spyOn(services.instances, 'list').mockResolvedValue([]);
    await openAt('/resources/instances');

    expect(screen.getByText('No Instances in this project')).toBeOnTheScreen();
    expect(screen.getByText('Resources you create on Scaleway show up here.')).toBeOnTheScreen();
  });

  test('a refresh that fails keeps the list and says so, until one works', async () => {
    const list = jest.spyOn(services.instances, 'list');
    await openAt('/resources/instances');
    list.mockRejectedValue(new AppError('server', 'Down', 500));
    await pullDown();

    expect(rows()).toHaveLength(3);
    expect(screen.getByText('Something went wrong. Try again.')).toBeOnTheScreen();

    list.mockRestore();
    await pullDown();

    expect(screen.queryByText('Something went wrong. Try again.')).not.toBeOnTheScreen();
  });

  test('a long product list draws only the rows near the screen', async () => {
    const server = await demo().instances.get('fr-par-1', 'demo-web-prod-1');
    const many = Array.from({ length: 150 }, (_, index) => ({
      ...server,
      id: `server-${index}`,
      name: `server-${String(index).padStart(3, '0')}`,
    }));
    jest.spyOn(services.instances, 'list').mockResolvedValue(many);
    await openAt('/resources/instances');

    expect(screen.getByRole('button', { name: /^server-000,/ })).toBeOnTheScreen();
    expect(rows().length).toBeGreaterThan(0);
    expect(rows().length).toBeLessThan(many.length);
  });

  test('a resource opens its own screen, with its list under it', async () => {
    await openAt('/resources/instances');
    await press(/^web-prod-1,/);

    expect(screen).toHavePathname('/resources/instances/fr-par-1/demo-web-prod-1');
    expect(screen.getByRole('header', { name: 'web-prod-1' })).toBeOnTheScreen();

    await press('Back');

    expect(screen).toHavePathname('/resources/instances');
  });

  test.each([['/resources/nope'], ['/resources/nope/fr-par-1/demo-web-prod-1']])(
    'an unknown product in a link shows a calm message (%s)',
    async (url) => {
      await openAt(url);

      expect(screen.getByText('This resource no longer exists')).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'Go back' })).toBeOnTheScreen();
    },
  );
});

describe("a resource's screen", () => {
  test.each([
    ['instances', 'fr-par-1', 'demo-web-prod-1', 'web-prod-1'],
    ['elastic-metal', 'fr-par-2', 'demo-em-storage-1', 'em-storage-1'],
    ['kubernetes', 'fr-par', 'demo-k8s-main', 'k8s-main'],
    ['databases', 'fr-par', 'demo-db-main', 'db-main'],
    ['containers', 'fr-par', 'demo-frontend', 'frontend'],
    ['functions', 'fr-par', 'demo-resize-images', 'resize-images'],
    ['jobs', 'fr-par', 'demo-nightly-report', 'nightly-report'],
    ['load-balancers', 'fr-par-1', 'demo-lb-web', 'lb-web'],
  ])('a %s resource opens on its own screen', async (product, locality, id, name) => {
    await openAt(`/resources/${product}/${locality}/${id}`);

    expect(screen.getByRole('header', { name })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Pin to Home' })).toBeOnTheScreen();
  });

  test('a Live resources card opens its detail, inside the Resources tab', async () => {
    await openAt('/home');
    await press('api-prod-2, Instance · Debian, nl-ams-1 · 203.0.113.21, Running');

    expect(screen).toHavePathname('/resources/instances/nl-ams-1/demo-api-prod-2');
    expect(screen.getByRole('header', { name: 'api-prod-2' })).toBeOnTheScreen();

    // Back goes to the Resources tab's first screen
    await press('Back');

    expect(screen).toHavePathname('/resources');
  });

  test('the star pins the resource to Home, and unpins it', async () => {
    // The star's look: filled while pinned, an outline otherwise
    const star = (name: string) => JSON.stringify(screen.getByRole('button', { name }).toJSON());

    await openAt('/resources/instances/fr-par-1/demo-web-prod-1');

    expect(star('Pin to Home')).toContain('"fill":"none"');

    await press('Pin to Home');

    expect(screen.getByRole('button', { name: 'Unpin from Home' })).toBeSelected();
    expect(star('Unpin from Home')).toContain(`"fill":"${lightColors.brand}"`);
    expect(screen.getByLabelText(/, Pinned$/)).toBeOnTheScreen();
    expect(await services.pins.list('demo-prod')).toEqual(['instances:fr-par-1:demo-web-prod-1']);

    await press('Unpin from Home');

    expect(screen.getByRole('button', { name: 'Pin to Home' })).not.toBeSelected();
    expect(star('Pin to Home')).toContain('"fill":"none"');
    expect(await services.pins.list('demo-prod')).toEqual([]);
  });

  test('a deleted resource shows a calm message and is unpinned', async () => {
    await services.pins.toggle('demo-prod', 'instances:fr-par-1:demo-web-prod-1');
    await openAt('/resources/instances');
    // Deleted on the console meanwhile
    jest.spyOn(services.instances, 'get').mockRejectedValue(new AppError('not_found', 'Not found', 404));
    await press(/^web-prod-1,/);

    expect(screen.getByRole('header', { name: 'web-prod-1' })).toBeOnTheScreen();
    expect(screen.getByText('This resource no longer exists')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: /Pin to Home|Unpin from Home/ })).not.toBeOnTheScreen();
    expect(await services.pins.list('demo-prod')).toEqual([]);

    await press('Go back');

    expect(screen).toHavePathname('/resources/instances');
  });

  test('a resource that fails to load says so, and tries again', async () => {
    // Nothing on the phone either: its list failed too
    jest.spyOn(services.instances, 'list').mockRejectedValue(new AppError('server', 'Down', 500));
    const get = jest.spyOn(services.instances, 'get').mockRejectedValue(new AppError('server', 'Down', 500));
    await openAt('/resources/instances/fr-par-1/demo-web-prod-1');

    expect(screen.getByText("Couldn't load this resource")).toBeOnTheScreen();

    get.mockRestore();
    await press('Try again');

    expect(screen.getByRole('header', { name: 'web-prod-1' })).toBeOnTheScreen();
  });

  test('a refresh that fails keeps the resource on screen and says so, until one works', async () => {
    const get = jest.spyOn(services.instances, 'get');
    await openAt('/resources/instances/fr-par-1/demo-web-prod-1');
    get.mockRejectedValue(new AppError('server', 'Down', 500));
    await pullDown();

    expect(screen.getByLabelText('PRO2-S · fr-par-1, Running')).toBeOnTheScreen();
    expect(screen.getByText('Something went wrong. Try again.')).toBeOnTheScreen();

    get.mockRestore();
    await pullDown();

    expect(screen.queryByText('Something went wrong. Try again.')).not.toBeOnTheScreen();
  });

  test("switching project closes a resource open in the Resources tab, back to the tab's first screen", async () => {
    await renderRouter(
      { ...routes, '(tabs)/home': ProjectSwitch },
      { initialUrl: '/resources/instances/fr-par-1/demo-web-prod-1', wrapper: Providers },
    );
    await settle();

    expect(screen.getByRole('header', { name: 'web-prod-1' })).toBeOnTheScreen();

    // The project is switched from Home, while the resource stays open in the Resources tab
    await act(async () => {
      fireEvent.press(screen.getByRole('tab', { name: 'Home' }));
    });
    await settle();
    await press('Switch to Staging');
    await act(async () => {
      fireEvent.press(screen.getByRole('tab', { name: 'Resources' }));
    });
    await settle();

    expect(screen).toHavePathname('/resources');
    expect(screen.queryByRole('header', { name: 'web-prod-1' })).not.toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Instances, 1 OK, 1 resource' })).toBeOnTheScreen();
  });

  test('signing out on a resource detail goes back to Welcome', async () => {
    await openAt('/resources/instances/fr-par-1/demo-web-prod-1');

    expect(screen.getByRole('header', { name: 'web-prod-1' })).toBeOnTheScreen();

    await act(async () => {
      await services.keeper.signOut();
    });
    await settle();

    expect(screen).toHavePathname('/welcome');
  });
});

// The shared action flow, as a product's screen uses it: Power on asks nothing, Reboot asks first
const REBOOT = {
  title: 'Reboot web-prod-1?',
  message: 'The server restarts. Anything running on it stops for a moment.',
  confirmLabel: 'Reboot',
};

type Perform = () => Promise<void>;

type Key = 'poweron' | 'reboot' | 'backup';

// Power on asks nothing; Reboot asks first; Back up changes nothing to watch, so it doesn't poll
const SPECS = {
  poweron: { toast: 'Power on requested' },
  reboot: { confirm: REBOOT, toast: 'Reboot requested' },
  backup: { toast: 'Backup started', poll: false },
};

function Actions({ perform }: { perform: Perform }) {
  const action = useResourceAction<Key>();
  const ask = (key: Key) => action.run({ key, ...SPECS[key], perform });

  return (
    <Stack>
      <ActionGrid
        actions={[
          { key: 'poweron', label: 'Power on', icon: 'power' },
          { key: 'reboot', label: 'Reboot', icon: 'restart' },
          { key: 'backup', label: 'Back up', icon: 'backup' },
        ]}
        onPress={ask}
        busyKey={action.running}
        disabledReason={action.disabledReason}
      />

      {action.failure === null ? null : <ActionFailed message={action.failure.message} />}

      {/* A tap the grid didn't stop (it went offline as the finger landed) */}
      <Button label="Tap Power on anyway" size="md" onPress={() => ask('poweron')} />

      <Button label="Tap Reboot anyway" size="md" onPress={() => ask('reboot')} />

      {action.sheet}
    </Stack>
  );
}

// The detail's status as its list shows it (Home and the product's list read the same query)
function ListStatus() {
  const { summaries } = useResourceSummaries();
  const web = summaries.find((summary) => summary.id === 'demo-web-prod-1');

  return <Text variant="body">{`In the list: ${web?.statusLabel ?? '…'}`}</Text>;
}

const openActions = async (perform: Perform) => {
  const result = await renderWithApp(
    <LockProvider>
      <ListStatus />

      <DetailScreen product="instances" locality="fr-par-1" id="demo-web-prod-1">
        {({ summary }) => (
          <Stack>
            <Text variant="body">{`Status: ${summary.statusLabel}`}</Text>

            <Actions perform={perform} />
          </Stack>
        )}
      </DetailScreen>
    </LockProvider>,
    { services },
  );
  await settle();

  return result;
};

const confirmIn = async (name: string) => {
  await act(async () => {
    fireEvent.press(within(screen.getByTestId('sheet-content')).getByRole('button', { name }));
  });
  await settle();
};

describe('the shared action flow', () => {
  test('actions are disabled while one is running', async () => {
    let finish = () => {};
    const perform = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    await openActions(perform);

    // Two taps in the same frame: the second lands before the buttons redraw
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Power on' }));
      fireEvent.press(screen.getByRole('button', { name: 'Power on' }));
    });

    expect(perform).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Power on' })).toBeBusy();
    expect(screen.getByRole('button', { name: 'Reboot' })).toBeDisabled();

    // Another action while it runs sends nothing either
    await press('Tap Reboot anyway');

    expect(screen.queryByTestId('sheet-content')).not.toBeOnTheScreen();
    expect(perform).toHaveBeenCalledTimes(1);

    await act(async () => {
      finish();
    });
    await settle();

    expect(screen.getByText('Power on requested')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Reboot' })).toBeEnabled();
  });

  test('a confirmed action is sent once, however many times its button is pressed', async () => {
    const perform = jest.fn(() => new Promise<void>(() => {}));
    await openActions(perform);
    await press('Reboot');

    expect(screen.getByText(REBOOT.title)).toBeOnTheScreen();
    expect(perform).not.toHaveBeenCalled();

    await act(async () => {
      const confirm = within(screen.getByTestId('sheet-content')).getByRole('button', { name: 'Reboot' });
      fireEvent.press(confirm);
      fireEvent.press(confirm);
    });

    expect(perform).toHaveBeenCalledTimes(1);
  });

  test('cancelling the question sends nothing', async () => {
    const perform = jest.fn(async () => {});
    await openActions(perform);
    await press('Reboot');
    await confirmIn('Cancel');

    expect(perform).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Reboot' })).toBeEnabled();
  });

  test('actions refuse to run offline', async () => {
    services = realRules();
    const perform = jest.fn(async () => {});
    await openActions(perform);
    await goOffline();

    // The grid is off and says why
    expect(screen.getByRole('button', { name: 'Power on' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Reboot' })).toBeDisabled();
    expect(screen.getByText("You're offline")).toBeOnTheScreen();

    // A tap that gets through anyway asks nothing and sends nothing
    await press('Tap Power on anyway');
    await press('Tap Reboot anyway');

    expect(screen.queryByTestId('sheet-content')).not.toBeOnTheScreen();
    expect(perform).not.toHaveBeenCalled();
  });

  test('offline while the question is up, its verb is off and says why', async () => {
    services = realRules();
    const perform = jest.fn(async () => {});
    await openActions(perform);
    await press('Reboot');
    await goOffline();
    const sheet = within(screen.getByTestId('sheet-content'));

    expect(sheet.getByRole('button', { name: 'Reboot' })).toBeDisabled();
    expect(sheet.getByText("You're offline")).toBeOnTheScreen();

    await confirmIn('Cancel');

    expect(screen.queryByTestId('sheet-content')).not.toBeOnTheScreen();
    expect(perform).not.toHaveBeenCalled();
  });

  test('an action started offline is never sent later', async () => {
    services = realRules();
    const perform = jest.fn(async () => {});
    await openActions(perform);
    await press('Reboot');
    // The phone goes offline as the finger lands, before the sheet can turn its verb off
    await act(async () => {
      onlineManager.setOnline(false);
      fireEvent.press(within(screen.getByTestId('sheet-content')).getByRole('button', { name: 'Reboot' }));
    });
    await settle();

    expect(screen.queryByTestId('sheet-content')).not.toBeOnTheScreen();

    await press('Tap Power on anyway');
    await goOnline();
    await wait(60_000);

    expect(perform).not.toHaveBeenCalled();
  });

  test('a network failure says you are offline, and the action is never sent again', async () => {
    services = realRules();
    const perform = jest.fn(async () => {
      throw new AppError('offline', 'Network request failed');
    });
    await openActions(perform);
    await press('Power on');

    expect(screen.getByText("You're offline. Connect to the internet and try again.")).toBeOnTheScreen();

    await goOnline();
    await wait(60_000);

    expect(perform).toHaveBeenCalledTimes(1);
  });

  test('after a failed action, the resource is asked again (the request may have gone through)', async () => {
    const get = jest.spyOn(services.instances, 'get');
    // No answer in time: it counts as offline, yet Scaleway may have done it
    const perform = jest.fn(async () => {
      throw new AppError('offline', 'Request timed out');
    });
    await openActions(perform);
    const asked = get.mock.calls.length;
    await press('Power on');

    expect(screen.getByText("You're offline. Connect to the internet and try again.")).toBeOnTheScreen();
    expect(get).toHaveBeenCalledTimes(asked + 1);
    expect(perform).toHaveBeenCalledTimes(1);
  });

  test('in the demo, actions run offline too', async () => {
    const perform = jest.fn(async () => {});
    await openActions(perform);
    await goOffline();
    await press('Power on');

    expect(perform).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Power on requested')).toBeOnTheScreen();
  });

  test('a failed action shows the quiet failure line under the actions, never a toast', async () => {
    const perform = jest.fn<Promise<void>, []>(async () => {
      throw new AppError('server', 'Request failed with status 500', 500);
    });
    await openActions(perform);
    await press('Reboot');
    await confirmIn('Reboot');

    expect(screen.queryByTestId('sheet-content')).not.toBeOnTheScreen();
    expect(screen.getByText("Scaleway isn't responding right now. Try again in a moment.")).toBeOnTheScreen();
    expect(screen.queryByText('Reboot requested')).not.toBeOnTheScreen();
    expect(screen.queryByText(/status 500/)).not.toBeOnTheScreen();

    // The next try clears it
    perform.mockResolvedValue(undefined);
    await press('Reboot');
    await confirmIn('Reboot');

    expect(screen.queryByText("Scaleway isn't responding right now. Try again in a moment.")).not.toBeOnTheScreen();
    expect(screen.getByText('Reboot requested')).toBeOnTheScreen();
  });
});

// The demo's web-prod-1, in a given state
const webProd1 = async (state: InstanceState): Promise<InstanceServer> => {
  const server = await demo().instances.get('fr-par-1', 'demo-web-prod-1');

  return { ...server, state };
};

describe('polling the detail', () => {
  test('after an action, the detail follows the change every 3 s until it settles, then refreshes the list', async () => {
    const get = jest.spyOn(services.instances, 'get');
    await openActions(() => services.instances.act('fr-par-1', 'demo-web-prod-1', 'poweroff'));

    expect(screen.getByText('In the list: Running')).toBeOnTheScreen();

    await press('Reboot');
    await confirmIn('Reboot');

    expect(screen.getByText('Reboot requested')).toBeOnTheScreen();
    expect(screen.getByText('Status: Stopping…')).toBeOnTheScreen();

    await wait(3_000);

    expect(screen.getByText('Status: Stopping…')).toBeOnTheScreen();

    // The demo lands after 6 s: the detail and its list both show it
    await wait(3_000);

    expect(screen.getByText('Status: Stopped')).toBeOnTheScreen();
    expect(screen.getByText('In the list: Stopped')).toBeOnTheScreen();

    // Settled: no more asking
    const asked = get.mock.calls.length;
    await wait(30_000);

    expect(get).toHaveBeenCalledTimes(asked);
  });

  test("polling goes on while Scaleway still shows the old state right after the action", async () => {
    let state: InstanceState = 'running';
    const get = jest.spyOn(services.instances, 'get').mockImplementation(async () => webProd1(state));
    await openActions(async () => {});
    await press('Power on');

    // Scaleway still answers "running" for a moment
    await wait(3_000);
    await wait(3_000);

    expect(screen.getByText('Status: Running')).toBeOnTheScreen();

    state = 'stopping';
    await wait(3_000);

    expect(screen.getByText('Status: Stopping…')).toBeOnTheScreen();

    state = 'stopped';
    await wait(3_000);

    expect(screen.getByText('Status: Stopped')).toBeOnTheScreen();

    const asked = get.mock.calls.length;
    await wait(30_000);

    expect(get).toHaveBeenCalledTimes(asked);
  });

  test('a reboot that goes back to running stops polling once it is back', async () => {
    let state: InstanceState = 'running';
    const get = jest.spyOn(services.instances, 'get').mockImplementation(async () => webProd1(state));
    await openActions(async () => {
      state = 'starting';
    });
    await press('Reboot');
    await confirmIn('Reboot');

    expect(screen.getByText(`Status: ${instanceStatus('starting').label}`)).toBeOnTheScreen();

    state = 'running';
    await wait(3_000);

    expect(screen.getByText('Status: Running')).toBeOnTheScreen();

    const asked = get.mock.calls.length;
    await wait(30_000);

    expect(get).toHaveBeenCalledTimes(asked);
  });

  test('a busy resource is asked again every 3 s, for 2 minutes at most', async () => {
    const get = jest.spyOn(services.instances, 'get').mockImplementation(async () => webProd1('starting'));
    await openActions(async () => {});

    const first = get.mock.calls.length;
    await wait(9_000);

    expect(get).toHaveBeenCalledTimes(first + 3);

    await wait(2 * 60_000);
    const atTwoMinutes = get.mock.calls.length;
    await wait(5 * 60_000);

    expect(get).toHaveBeenCalledTimes(atTwoMinutes);
  });

  test("pulling a resource's screen down asks it again", async () => {
    const get = jest.spyOn(services.instances, 'get');
    await openActions(async () => {});
    const asked = get.mock.calls.length;
    await pullDown();

    expect(get).toHaveBeenCalledTimes(asked + 1);
  });

  test('an action that changes nothing to watch (a backup) refreshes once, without polling', async () => {
    const get = jest.spyOn(services.instances, 'get');
    const list = jest.spyOn(services.instances, 'list');
    await openActions(async () => {});
    const asked = get.mock.calls.length;
    const listed = list.mock.calls.length;
    await press('Back up');

    expect(screen.getByText('Backup started')).toBeOnTheScreen();
    expect(get).toHaveBeenCalledTimes(asked + 1);
    expect(list).toHaveBeenCalledTimes(listed + 1);

    await wait(2 * 60_000);

    expect(get).toHaveBeenCalledTimes(asked + 1);
    expect(list).toHaveBeenCalledTimes(listed + 1);
  });

  test('what the detail learns shows on Home and in the list too, without asking the list again', async () => {
    let state: InstanceState = 'starting';
    jest.spyOn(services.instances, 'get').mockImplementation(async () => webProd1(state));
    const list = jest.spyOn(services.instances, 'list');
    const { queryClient } = await openActions(async () => {});
    // Found busy (someone started it on the console): polled
    await wait(3_000);

    expect(screen.getByText('In the list: Starting…')).toBeOnTheScreen();

    const listed = list.mock.calls.length;
    const listAge = queryClient.getQueryState(['resources', 'instances', 'demo-prod'])?.dataUpdatedAt;
    state = 'running';
    await wait(3_000);

    expect(screen.getByText('Status: Running')).toBeOnTheScreen();
    expect(screen.getByText('In the list: Running')).toBeOnTheScreen();

    // Pulled down, the same
    state = 'stopped';
    await pullDown();

    expect(screen.getByText('Status: Stopped')).toBeOnTheScreen();
    expect(screen.getByText('In the list: Stopped')).toBeOnTheScreen();
    expect(list).toHaveBeenCalledTimes(listed);
    // The list keeps its own age: it still refreshes on its own schedule
    expect(queryClient.getQueryState(['resources', 'instances', 'demo-prod'])?.dataUpdatedAt).toBe(listAge);
  });

  test('a resource that is not busy is not polled', async () => {
    const get = jest.spyOn(services.instances, 'get');
    await openActions(async () => {});

    const first = get.mock.calls.length;
    await wait(60_000);

    expect(get).toHaveBeenCalledTimes(first);
  });
});
