import { AppError } from '@scaleway-manager/core';
import type { InstanceServer, ServiceIncident } from '@scaleway-manager/core';
import { Button, lightColors, Text } from '@scaleway-manager/ui';
import type { SplashEntranceState } from '@scaleway-manager/ui';
import { onlineManager } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import * as WebBrowser from 'expo-web-browser';
import { getAnimatedStyle as getStyle } from 'react-native-reanimated';
import type { getAnimatedStyle as NativeGetAnimatedStyle } from 'react-native-reanimated/lib/typescript/jestUtils/index.native';

import Home from '../../../app/(tabs)/home';
import { renderWithApp } from '../../test-utils/renderWithApp';
import { createServices } from '../../wiring/services';
import type { Services } from '../../wiring/services';
import { LockProvider } from '../lock/LockProvider';
import { usePins } from '../resources/usePins';
import { SplashHandOverContext } from '../splash/SplashHandOver';

jest.mock('expo-web-browser', () => ({ openBrowserAsync: jest.fn(async () => ({ type: 'opened' })) }));

// TypeScript sees Reanimated's web stub of getAnimatedStyle; Jest runs the native one
const getAnimatedStyle = getStyle as unknown as typeof NativeGetAnimatedStyle;

// 18 November 2026
const NOW = new Date(Date.UTC(2026, 10, 18));

// The demo (no network), on a fixed day, with its own empty phone storage
const fullDemo = (): Services => {
  const saved = new Map<string, string>();

  return createServices('demo', {
    clock: { now: () => NOW },
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

// Every product answers like this
const failEvery = (services: Services, error: AppError) => {
  for (const port of productLists(services)) {
    jest.spyOn(port, 'list').mockRejectedValue(error);
  }
};

// The demo, with Instances as the only product that has anything (the others answer empty)
const demo = (): Services => {
  const services = fullDemo();

  for (const port of productLists(services).slice(1)) {
    jest.spyOn(port, 'list').mockResolvedValue([]);
  }

  return services;
};

// The demo's data with the real app's rules (the demo itself ignores the network)
const realRules = (): Services => ({ ...demo(), mode: 'real' });

function HomeScreen({ entrance }: { entrance: SplashEntranceState }) {
  return (
    <SplashHandOverContext.Provider
      value={{ entrance, logoHidden: false, reportLogo: () => {}, reportHeaderHeight: () => {} }}
    >
      <LockProvider>
        <Home />
      </LockProvider>
    </SplashHandOverContext.Provider>
  );
}

const open = async (services: Services = demo(), online?: boolean, entrance: SplashEntranceState = 'shown') =>
  renderWithApp(<HomeScreen entrance={entrance} />, { services, online });

const press = async (name: string) => {
  await act(async () => {
    fireEvent.press(screen.getByRole('button', { name }));
  });
};

// What screen readers hear for each Live resources card, in the carousel's order
const liveCards = () =>
  within(screen.getByTestId('carousel'))
    .queryAllByRole('button')
    .map((card) => card.props.accessibilityLabel as string);

const WEB = 'web-prod-1, Instance · Ubuntu, fr-par-1 · 203.0.113.34, Running';
const API = 'api-prod-2, Instance · Debian, nl-ams-1 · 203.0.113.21, Running';
const WORKER = 'worker-1, Instance · Alpine, pl-waw-1 · DEV1-M, Standby';

const ALERT = 'Alert, High CPU on db-main, CPU has been above 90% for 10 minutes.';
const INCIDENT = 'Slower block storage in fr-par-1';

// An incident on Scaleway's APIs: shared, so it matters whatever the project uses
const API_OUTAGE: ServiceIncident = {
  id: 'apis',
  name: 'API errors',
  status: 'monitoring',
  impact: 'critical',
  components: ['APIs'],
  latestUpdate: null,
  updatedAt: NOW.toISOString(),
  url: 'https://status.scaleway.com/incidents/apis',
};

// An incident on Kubernetes in fr-par-1: it matters only to a project that runs Kubernetes there
const KUBERNETES_SLOW: ServiceIncident = {
  id: 'k8s',
  name: 'Kubernetes control planes slow',
  status: 'identified',
  impact: 'major',
  components: ['Kubernetes Kapsule', 'fr-par-1'],
  latestUpdate: null,
  updatedAt: NOW.toISOString(),
  url: 'https://status.scaleway.com/incidents/k8s',
};

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
  jest.mocked(WebBrowser.openBrowserAsync).mockClear();
  onlineManager.setOnline(true);
});

test('Production shows the firing alert', async () => {
  await open();

  expect(await screen.findByLabelText(ALERT)).toBeOnTheScreen();
  expect(screen.getByText('High CPU on db-main')).toBeOnTheScreen();
  expect(screen.getByText('CPU has been above 90% for 10 minutes.')).toBeOnTheScreen();
});

test('an alert without a summary says its region', async () => {
  const services = demo();
  jest
    .spyOn(services.alerts, 'listFiring')
    .mockResolvedValue([{ id: 'a', name: 'Disk almost full', region: 'nl-ams', summary: null }]);
  await open(services);

  expect(await screen.findByLabelText('Alert, Disk almost full, nl-ams')).toBeOnTheScreen();
});

test('Staging hides the alerts section', async () => {
  const services = demo();
  const listFiring = jest.spyOn(services.alerts, 'listFiring');
  await services.preferences.update({ projectIdByOrg: { 'demo-org': 'demo-staging' } });
  await open(services);

  await screen.findByRole('button', { name: 'Acme · Staging' });
  await waitFor(() => expect(liveCards()).toHaveLength(1));

  // Asked, and nothing is firing there
  expect(listFiring).toHaveBeenCalledWith('demo-staging');
  expect(screen.queryByTestId('alert-row')).not.toBeOnTheScreen();
});

test('status shows the incident affecting fr-par-1', async () => {
  await open();

  expect(await screen.findByText(INCIDENT)).toBeOnTheScreen();
  expect(screen.getByText('We are looking into slower disk operations.')).toBeOnTheScreen();
  // How serious it is in words first, then its state and what it touches
  expect(screen.getByText('Minor issue · Investigating · Instances, fr-par-1')).toBeOnTheScreen();
  expect(screen.queryByText('All Scaleway services running normally')).not.toBeOnTheScreen();
  // A minor issue: the orange dot
  expect(
    within(screen.getByRole('button', { name: new RegExp(`^${INCIDENT}`) })).getByTestId('health-dot', {
      includeHiddenElements: true,
    }),
  ).toHaveStyle({ backgroundColor: lightColors.warning });

  await press(
    `${INCIDENT}, We are looking into slower disk operations., Minor issue · Investigating · Instances, fr-par-1`,
  );

  expect(WebBrowser.openBrowserAsync).toHaveBeenCalledWith('https://status.scaleway.com');
  expect(screen.queryByText('Something went wrong. Try again.')).not.toBeOnTheScreen();
});

test("an incident whose page can't open says so quietly, never silently", async () => {
  jest.mocked(WebBrowser.openBrowserAsync).mockRejectedValueOnce(new Error('No browser'));
  await open();
  const card = await screen.findByRole('button', { name: new RegExp(`^${INCIDENT}`) });

  // It leaves the app: screen readers are told before the tap
  expect(card.props.accessibilityHint).toBe('Opens in your browser');

  await act(async () => {
    fireEvent.press(card);
  });

  expect(screen.getByText('Something went wrong. Try again.')).toBeOnTheScreen();

  // A new tap that works clears it
  await act(async () => {
    fireEvent.press(card);
  });

  expect(screen.queryByText('Something went wrong. Try again.')).not.toBeOnTheScreen();
});

test('status shows the all-good line when nothing affects you', async () => {
  const services = demo();
  // The project runs no Kubernetes
  jest.spyOn(services.status, 'listOpenIncidents').mockResolvedValue([KUBERNETES_SLOW]);
  await open(services);

  expect(await screen.findByText('All Scaleway services running normally')).toBeOnTheScreen();
  expect(screen.queryByText('Kubernetes control planes slow')).not.toBeOnTheScreen();
});

test('a major incident is red and says so; one with no update has no message', async () => {
  const services = demo();
  // A shared service: shown to everyone
  jest.spyOn(services.status, 'listOpenIncidents').mockResolvedValue([API_OUTAGE]);
  await open(services);

  const card = await screen.findByRole('button', { name: 'API errors, Major outage · Monitoring · APIs' });

  expect(within(card).getByTestId('health-dot', { includeHiddenElements: true })).toHaveStyle({
    backgroundColor: lightColors.alertText,
  });
});

test('the status page out of reach shows nothing about it', async () => {
  const services = demo();
  jest.spyOn(services.status, 'listOpenIncidents').mockRejectedValue(new AppError('offline', 'No answer'));
  await open(services);

  await screen.findByText('€84.60');
  await waitFor(() => expect(liveCards()).toHaveLength(3));

  expect(screen.queryByText('All Scaleway services running normally')).not.toBeOnTheScreen();
  expect(screen.queryByText(INCIDENT)).not.toBeOnTheScreen();
  // Not even a placeholder: it isn't coming
  expect(screen.queryAllByTestId('skeleton')).toHaveLength(0);
});

test('live resources put problems first, then running ones by name', async () => {
  await open(fullDemo());

  expect(await screen.findByRole('header', { name: 'Live resources' })).toBeOnTheScreen();
  await waitFor(() => expect(liveCards()).toHaveLength(6));

  expect(liveCards().map((label) => label.split(',')[0])).toEqual([
    'resize-images',
    'lb-web',
    'api-prod-2',
    'db-main',
    'em-storage-1',
    'frontend',
  ]);
});

test('live resources list running instances with the stopped one last', async () => {
  await open();

  expect(await screen.findByRole('header', { name: 'Live resources' })).toBeOnTheScreen();
  await waitFor(() => expect(liveCards()).toEqual([API, WEB, WORKER]));
});

test('a pinned stopped instance comes first', async () => {
  const services = demo();
  await services.pins.toggle('demo-prod', 'instances:pl-waw-1:demo-worker-1');
  await open(services);

  await waitFor(() => expect(liveCards()).toEqual([`${WORKER}, Pinned`, API, WEB]));
});

test('Live resources wait for the saved pins, so the cards never jump', async () => {
  const services = demo();
  let readPins: (keys: string[]) => void = () => {};
  jest.spyOn(services.pins, 'list').mockReturnValue(
    new Promise<string[]>((resolve) => {
      readPins = resolve;
    }),
  );
  const { queryClient } = await open(services);
  await waitFor(() =>
    expect(queryClient.getQueryState(['resources', 'instances', 'demo-prod'])?.status).toBe('success'),
  );

  // The resources are in, the pins aren't yet: still the card shapes
  expect(liveCards()).toEqual([]);
  expect(
    within(screen.getByTestId('carousel')).getAllByTestId('resource-card-placeholder', { includeHiddenElements: true }),
  ).toHaveLength(3);

  await act(async () => {
    readPins(['instances:pl-waw-1:demo-worker-1']);
  });

  await waitFor(() => expect(liveCards()).toEqual([`${WORKER}, Pinned`, API, WEB]));
});

test('Cockpit permission missing leaves the rest of Home intact', async () => {
  const services = demo();
  jest.spyOn(services.alerts, 'listFiring').mockRejectedValue(new AppError('forbidden', 'No Cockpit', 403));
  await open(services);

  expect(await screen.findByText(INCIDENT)).toBeOnTheScreen();
  await waitFor(() => expect(liveCards()).toEqual([API, WEB, WORKER]));

  expect(screen.getByText('€84.60')).toBeOnTheScreen();
  expect(screen.getByText('November by product')).toBeOnTheScreen();
  expect(screen.queryByTestId('alert-row')).not.toBeOnTheScreen();
});

test('losing Cockpit access hides the alerts at the next refresh', async () => {
  const services = demo();
  const { queryClient } = await open(services);
  await screen.findByLabelText(ALERT);

  jest.spyOn(services.alerts, 'listFiring').mockRejectedValue(new AppError('forbidden', 'No Cockpit', 403));
  await act(async () => {
    await queryClient.refetchQueries({ queryKey: ['alerts'] });
  });

  await waitFor(() => expect(screen.queryByTestId('alert-row')).not.toBeOnTheScreen());
});

test('offline, the alerts last seen stay', async () => {
  const services = demo();
  const { queryClient } = await open(services);
  await screen.findByLabelText(ALERT);

  jest.spyOn(services.alerts, 'listFiring').mockRejectedValue(new AppError('offline', 'No network'));
  jest.useFakeTimers();
  await act(async () => {
    await queryClient.refetchQueries({ queryKey: ['alerts'] });
    // The cache tells the screen on the next timer tick
    await jest.advanceTimersByTimeAsync(1);
  });

  expect(queryClient.getQueryState(['alerts', 'demo-prod'])?.status).toBe('error');
  expect(screen.getByLabelText(ALERT)).toBeOnTheScreen();
});

test('switching project changes alerts, resources and pins', async () => {
  const services = demo();
  const getMonth = jest.spyOn(services.spending, 'getMonth');
  const { queryClient } = await open(services);
  await screen.findByLabelText(ALERT);
  await waitFor(() => expect(liveCards()).toHaveLength(3));

  await press('Acme · Production');
  await press('Staging');

  await waitFor(() => expect(liveCards()).toEqual(['staging-1, Instance · Ubuntu, fr-par-2 · 203.0.113.7, Running']));
  expect(screen.queryByTestId('alert-row')).not.toBeOnTheScreen();

  const keys = queryClient
    .getQueryCache()
    .findAll()
    .map((query) => query.queryKey);

  expect(keys).toEqual(
    expect.arrayContaining([
      ['alerts', 'demo-staging'],
      ['resources', 'instances', 'demo-staging'],
      ['pins', 'demo-staging'],
    ]),
  );
  // The spending is the organization's: its keys don't name a project, and nothing is asked again
  const spendingKeys = keys.filter((key) => key[0] === 'spending');

  expect(spendingKeys).toContainEqual(['spending', 'demo-org', '2026-11']);
  expect(spendingKeys.flat()).not.toEqual(expect.arrayContaining(['demo-prod']));
  expect(spendingKeys.flat()).not.toEqual(expect.arrayContaining(['demo-staging']));
  expect(getMonth).toHaveBeenCalledTimes(6);
});

test('a project with nothing running says so', async () => {
  const services = demo();
  jest.spyOn(services.instances, 'list').mockResolvedValue([]);
  await open(services);

  expect(await screen.findByText('Nothing running yet')).toBeOnTheScreen();
  expect(screen.getByText('Resources in this project will show up here.')).toBeOnTheScreen();
  expect(screen.queryByTestId('carousel')).not.toBeOnTheScreen();
});

test('when every product fails, Live resources says so and offers Try again', async () => {
  const services = demo();
  failEvery(services, new AppError('server', 'Down', 503));
  const list = jest.spyOn(services.instances, 'list');
  const { queryClient } = await open(services);

  expect(await screen.findByText("Couldn't load your resources")).toBeOnTheScreen();
  expect(screen.queryByText('Nothing running yet')).not.toBeOnTheScreen();
  // The status page answered, but what the project uses is unknown: no "all good" it can't be sure of
  await waitFor(() => expect(queryClient.getQueryState(['status'])?.status).toBe('success'));
  expect(screen.queryByText('All Scaleway services running normally')).not.toBeOnTheScreen();

  list.mockRestore();
  await press('Try again');

  await waitFor(() => expect(liveCards()).toEqual([API, WEB, WORKER]));
  expect(screen.queryByText("Couldn't load your resources")).not.toBeOnTheScreen();
  // What's known is enough to match Scaleway status
  expect(await screen.findByText(INCIDENT)).toBeOnTheScreen();
});

test('when every product fails, an incident on a shared service still shows', async () => {
  const services = demo();
  failEvery(services, new AppError('server', 'Down', 503));
  jest.spyOn(services.status, 'listOpenIncidents').mockResolvedValue([API_OUTAGE, KUBERNETES_SLOW]);
  await open(services);

  expect(await screen.findByText("Couldn't load your resources")).toBeOnTheScreen();
  // It explains why the resources can't be loaded
  expect(await screen.findByRole('button', { name: 'API errors, Major outage · Monitoring · APIs' })).toBeOnTheScreen();
  expect(screen.queryByText('Kubernetes control planes slow')).not.toBeOnTheScreen();
  expect(screen.queryByText('All Scaleway services running normally')).not.toBeOnTheScreen();
});

test('a product that fails for another reason than permission: no all-good line, only what matched', async () => {
  const services = demo();
  // Failing, maybe because of that very incident
  jest.spyOn(services.kubernetes, 'list').mockRejectedValue(new AppError('server', 'Down', 503));
  jest.spyOn(services.status, 'listOpenIncidents').mockResolvedValue([KUBERNETES_SLOW]);
  const { queryClient } = await open(services);
  await screen.findByText('€84.60');
  await waitFor(() => expect(liveCards()).toEqual([API, WEB, WORKER]));
  await waitFor(() => expect(queryClient.getQueryState(['status'])?.status).toBe('success'));

  expect(screen.queryByText('All Scaleway services running normally')).not.toBeOnTheScreen();
  expect(screen.queryByText('Kubernetes control planes slow')).not.toBeOnTheScreen();
  // Nothing more is coming: no placeholder either
  expect(screen.queryAllByTestId('skeleton')).toHaveLength(0);
});

test('a product the project may not see (403) is simply not in use: the all-good line shows', async () => {
  const services = demo();
  jest.spyOn(services.kubernetes, 'list').mockRejectedValue(new AppError('forbidden', 'No Kubernetes', 403));
  jest.spyOn(services.status, 'listOpenIncidents').mockResolvedValue([KUBERNETES_SLOW]);
  await open(services);

  expect(await screen.findByText('All Scaleway services running normally')).toBeOnTheScreen();
  await waitFor(() => expect(liveCards()).toEqual([API, WEB, WORKER]));
});

test('no permission on any product: a calm message, nothing to retry, and the status still says how Scaleway is', async () => {
  const services = demo();
  failEvery(services, new AppError('forbidden', 'No Instances', 403));
  await open(services);

  expect(await screen.findByText("Resources aren't available")).toBeOnTheScreen();
  expect(screen.getByText("You don't have access to resources in this project.")).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeOnTheScreen();
  expect(screen.queryByText("Couldn't load your resources")).not.toBeOnTheScreen();
  expect(screen.queryByText('Nothing running yet')).not.toBeOnTheScreen();
  expect(await screen.findByText('All Scaleway services running normally')).toBeOnTheScreen();
});

test('Try again for resources is turned off while offline, and says why', async () => {
  const services = realRules();
  failEvery(services, new AppError('server', 'Down', 503));
  await open(services);
  await screen.findByText("Couldn't load your resources");

  await act(async () => {
    onlineManager.setOnline(false);
  });

  expect(screen.getByRole('button', { name: 'Try again' })).toBeDisabled();
  expect(screen.getByText("You're offline")).toBeOnTheScreen();
});

test('a product that fails is left out; the others still show', async () => {
  const services = demo();
  jest.spyOn(services.kubernetes, 'list').mockRejectedValue(new AppError('server', 'Down', 503));
  // Answers, with nothing
  jest.spyOn(services.databases, 'list').mockResolvedValue([]);
  await open(services);

  await waitFor(() => expect(liveCards()).toEqual([API, WEB, WORKER]));
  expect(screen.queryByText("Couldn't load your resources")).not.toBeOnTheScreen();
  // What's known is enough to match Scaleway status
  expect(await screen.findByText(INCIDENT)).toBeOnTheScreen();
});

// The workspace as the phone saved it, so the project is known offline
const saveWorkspace = async (services: Services, queryClient: QueryClient) => {
  const user = await services.account.getCurrentUser();

  queryClient.setQueryData(['account', 'me'], user);
  queryClient.setQueryData(['workspace', 'org', 'demo-org'], await services.workspace.getOrganization('demo-org'));
  queryClient.setQueryData(['workspace', 'projects', 'demo-org'], await services.workspace.listProjects('demo-org'));
};

test('offline, Live resources shows the saved resources, pins first, without asking Scaleway', async () => {
  const services = realRules();
  const saved = await services.instances.list('demo-prod');
  await services.pins.toggle('demo-prod', 'instances:pl-waw-1:demo-worker-1');
  const list = jest.spyOn(services.instances, 'list');
  const { queryClient } = await open(services, false);

  await act(async () => {
    await saveWorkspace(services, queryClient);
    queryClient.setQueryData(['resources', 'instances', 'demo-prod'], saved);
  });

  // The pins are on the phone: they don't wait for the network
  await waitFor(() => expect(liveCards()).toEqual([`${WORKER}, Pinned`, API, WEB]));
  expect(list).not.toHaveBeenCalled();
});

test('the demo ignores the network: started offline with nothing saved, Home shows its data', async () => {
  await open(demo(), false);

  expect(await screen.findByText('€84.60')).toBeOnTheScreen();
  expect(await screen.findByText(INCIDENT)).toBeOnTheScreen();
  await waitFor(() => expect(liveCards()).toEqual([API, WEB, WORKER]));
  expect(screen.queryByText("You're offline")).not.toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeOnTheScreen();
});

test("offline, Home says You're offline once, even when the spending and the resources both failed", async () => {
  const services = realRules();
  jest.spyOn(services.spending, 'getMonth').mockRejectedValue(new AppError('server', 'Down', 503));
  failEvery(services, new AppError('server', 'Down', 503));
  await open(services);

  expect(await screen.findByText("Couldn't load your resources")).toBeOnTheScreen();

  await act(async () => {
    onlineManager.setOnline(false);
  });

  // Both Try again are off; the header's note says why for the whole screen
  const retries = screen.getAllByRole('button', { name: 'Try again' });

  expect(retries).toHaveLength(2);
  for (const retry of retries) {
    expect(retry).toBeDisabled();
  }
  expect(screen.getAllByText("You're offline")).toHaveLength(1);
});

test('offline with no saved resources, Live resources says so and the status says nothing', async () => {
  const services = realRules();
  const { queryClient } = await open(services, false);

  await act(async () => {
    await saveWorkspace(services, queryClient);
  });

  expect(await screen.findByText("Couldn't load your resources")).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Try again' })).toBeDisabled();
  expect(screen.getByText("You're offline")).toBeOnTheScreen();
  expect(screen.queryByText('Nothing running yet')).not.toBeOnTheScreen();
  expect(screen.queryByText('All Scaleway services running normally')).not.toBeOnTheScreen();
  expect(screen.queryByTestId('alert-row')).not.toBeOnTheScreen();
});

test('while loading, Live resources shows card shapes and status a line', async () => {
  const services = demo();
  jest.spyOn(services.instances, 'list').mockReturnValue(new Promise<InstanceServer[]>(() => {}));
  await open(services);
  await screen.findByText('€84.60');

  expect(screen.getByRole('header', { name: 'Live resources' })).toBeOnTheScreen();

  // 3 cards in the real card's shape, drawn by ui (ResourceCard loading)
  expect(
    within(screen.getByTestId('carousel')).getAllByTestId('resource-card-placeholder', { includeHiddenElements: true }),
  ).toHaveLength(3);
  // Everything else has loaded: the one other placeholder is the status line's
  expect(screen.getAllByTestId('skeleton')).toHaveLength(1);
  // The status waits for the resources: it can't know yet what affects you
  expect(screen.queryByText('All Scaleway services running normally')).not.toBeOnTheScreen();
  expect(screen.queryByText(INCIDENT)).not.toBeOnTheScreen();
});

test("when the projects can't be loaded, nothing project-based shows below; the chip says why", async () => {
  const services = demo();
  jest.spyOn(services.workspace, 'listProjects').mockRejectedValue(new AppError('server', 'Down', 503));
  const listFiring = jest.spyOn(services.alerts, 'listFiring');
  await open(services);
  await screen.findByRole('button', { name: "Couldn't load projects" });

  expect(screen.queryByText('Live resources')).not.toBeOnTheScreen();
  expect(screen.queryByText('All Scaleway services running normally')).not.toBeOnTheScreen();
  expect(screen.queryByText(INCIDENT)).not.toBeOnTheScreen();
  expect(listFiring).not.toHaveBeenCalled();
});

test('under the splash, the alerts and the status wait to rise in; Live resources stay direct children', async () => {
  await open(demo(), undefined, 'hidden');
  await screen.findByLabelText(ALERT);
  await screen.findByText(INCIDENT);
  const entranceOf = (node: ReturnType<typeof screen.getByText>) => {
    let current = node.parent;
    while (current !== null && current.props.testID !== 'splash-entrance') {
      current = current.parent;
    }

    return current;
  };
  const alert = entranceOf(screen.getByText('High CPU on db-main'));
  const status = entranceOf(screen.getByText(INCIDENT));

  expect(alert).not.toBeNull();
  expect(status).not.toBeNull();
  expect(getAnimatedStyle(alert ?? screen.getByText('High CPU on db-main')).opacity).toBe(0);
  expect(getAnimatedStyle(status ?? screen.getByText(INCIDENT)).opacity).toBe(0);
  // Live resources stay direct children of the column (touches in the margin), so they aren't wrapped
  expect(entranceOf(screen.getByTestId('carousel'))).toBeNull();
});

// A screen with the pins of the chosen project (once read), and a button that pins worker-1
function PinsProbe() {
  const { pinned, isLoading, toggle } = usePins();

  return (
    <>
      <Text variant="body">
        {isLoading ? 'Reading pins' : pinned.length === 0 ? 'No pins' : `Pinned: ${pinned.join(', ')}`}
      </Text>

      <Button label="Pin worker-1" size="md" onPress={() => toggle('instances:pl-waw-1:demo-worker-1')} />
    </>
  );
}

test('usePins toggles a pin of the chosen project and saves it', async () => {
  const services = demo();
  await renderWithApp(<PinsProbe />, { services });
  await screen.findByText('No pins');

  await press('Pin worker-1');

  expect(await screen.findByText('Pinned: instances:pl-waw-1:demo-worker-1')).toBeOnTheScreen();
  expect(await services.pins.list('demo-prod')).toEqual(['instances:pl-waw-1:demo-worker-1']);
});
