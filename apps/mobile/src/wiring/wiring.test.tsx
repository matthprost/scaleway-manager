import AsyncStorage from '@react-native-async-storage/async-storage';
import { createMemorySessionStore, DEMO_SESSION, DEMO_USER, demoScreenPrivacy } from '@scaleway-manager/adapters/demo';
import { createKeyValueStore, createPreferences } from '@scaleway-manager/adapters/device';
import { AppError, monthKeyOf } from '@scaleway-manager/core';
import type { AppErrorKind } from '@scaleway-manager/core';
import { focusManager, onlineManager, QueryObserver } from '@tanstack/react-query';
import { persistQueryClientSave } from '@tanstack/react-query-persist-client';
import { act, render, waitFor } from '@testing-library/react-native';
import { AppState } from 'react-native';
import type { AppStateStatus } from 'react-native';

import { renderWithApp } from '../test-utils/renderWithApp';
import {
  bindFocusManager,
  bindOnlineManager,
  clearAppData,
  createQueryClient,
  createQueryPersister,
} from './queryClient';
import { createServices } from './services';
import type { Services } from './services';
import { ServicesProvider, useServices, useSwitchMode } from './ServicesProvider';

// TanStack's onlineManager and the AsyncStorage mock are shared by every test in this file:
// each starts online, with nothing bound and nothing saved.
beforeEach(async () => {
  onlineManager.setEventListener(() => undefined);
  onlineManager.setOnline(true);
  await AsyncStorage.clear();
});

test('demo services never touch the network', async () => {
  const fetchFn = jest.fn(() => {
    throw new Error('network used');
  });
  const services = createServices('demo', { fetch: fetchFn });
  const { account, keeper } = services;

  const user = await account.getCurrentUser();
  await keeper.renew();

  expect(await keeper.current()).toEqual(DEMO_SESSION);
  expect(user).toEqual(DEMO_USER);

  const month = monthKeyOf(services.clock.now());
  const project = (await services.workspace.listProjects(DEMO_USER.organizationId))[0]?.id ?? 'demo-project';
  await services.workspace.getOrganization(DEMO_USER.organizationId);
  await services.spending.getMonth(DEMO_USER.organizationId, month);
  await services.invoices.list(DEMO_USER.organizationId);
  await services.instances.list(project);
  await services.elasticMetal.list(project);
  await services.kubernetes.list(project);
  await services.databases.list(project);
  await services.serverless.list(project);
  await services.jobs.list(project);
  await services.loadBalancers.list(project);
  await services.pins.toggle(project, 'instances');
  await services.alerts.listFiring(project);
  await services.status.listOpenIncidents();
  await services.activity.listRecent(DEMO_USER.organizationId);
  await services.sshKeys.list(project);
  await services.apiKeys.list(DEMO_USER.id);
  await services.clipboard.copy('text', { sensitive: false });
  await services.files.sharePdf('invoice.pdf', 'AA==');
  await services.files.clear();

  expect(fetchFn).not.toHaveBeenCalled();
});

test('real status calls status.scaleway.com without the session header', async () => {
  const fetchFn = jest.fn(
    async () => ({ ok: true, status: 200, json: async () => ({ incidents: [] }) }) as Response,
  );
  const store = createMemorySessionStore({
    token: 't-1',
    renewToken: 'r-1',
    sessionId: 's-1',
    userId: 'u-1',
    expiresAt: '2030-01-01T00:00:00.000Z',
  });
  const { status } = createServices('real', { fetch: fetchFn, store });

  await status.listOpenIncidents();

  const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
  const headers = Object.fromEntries(new Headers(init.headers).entries());
  expect(url).toContain('https://status.scaleway.com/');
  expect(headers).not.toHaveProperty('x-session-token');
  expect(headers).not.toHaveProperty('authorization');
});

test("demo never blanks the phone's screen (store screenshots come from it); real mode can", () => {
  expect(createServices('demo').screenPrivacy).toBe(demoScreenPrivacy);
  expect(createServices('real').screenPrivacy).not.toBe(demoScreenPrivacy);
});

test('the services use the injected clock', async () => {
  const clock = { now: () => new Date('2026-11-18T10:00:00Z') };
  const demo = createServices('demo', { clock });

  expect(createServices('real', { clock, fetch: jest.fn() }).clock).toBe(clock);
  expect((await demo.status.listOpenIncidents())[0]?.updatedAt).toBe('2026-11-18T08:00:00.000Z');
  expect((await demo.invoices.list('demo-org'))[0]?.id).toBe('demo-invoice-2026-10');
});

// createServices loaded fresh, as a store screenshots build (EXPO_PUBLIC_SCREENSHOTS=1) loads it
const screenshotBuildServices = (): typeof createServices => {
  let create = createServices;
  jest.isolateModules(() => {
    jest.doMock('./buildConfig', () => ({ screenshotBuild: true }));
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    create = (require('./services') as { createServices: typeof createServices }).createServices;
  });

  return create;
};

test('in a screenshots build the demo day is the 18th of this month, from 09:41 on, and the clock keeps running', async () => {
  // Before and after the 18th, in local time
  for (const today of [new Date(2026, 10, 7, 7, 55), new Date(2026, 10, 25, 22, 10)]) {
    let now = today;
    const demo = screenshotBuildServices()('demo', { clock: { now: () => now } });

    expect(demo.clock.now()).toEqual(new Date(2026, 10, 18, 9, 41));

    now = new Date(today.getTime() + 60_000);

    expect(demo.clock.now()).toEqual(new Date(2026, 10, 18, 9, 42));
    // The demo data follows it: the open incident was updated 2 hours before
    expect((await demo.status.listOpenIncidents())[0]?.updatedAt).toBe(new Date(2026, 10, 18, 7, 42).toISOString());
  }
});

test('a screenshots build leaves real mode on the real clock', () => {
  const clock = { now: () => new Date(2026, 10, 7, 7, 55) };

  expect(screenshotBuildServices()('real', { clock, fetch: jest.fn() }).clock).toBe(clock);
});

test('switching mode clears cached data', async () => {
  let switchMode: (mode: 'real' | 'demo') => Promise<void> = async () => {};
  let current: Services | null = null;

  function Probe() {
    switchMode = useSwitchMode();
    current = useServices();

    return null;
  }

  const { queryClient, services } = await renderWithApp(<Probe />);
  queryClient.setQueryData(['account', 'me'], { id: 'u-1' });
  await persistQueryClientSave({ queryClient, persister: createQueryPersister(services.kv) });
  expect(await services.kv.getItem('sm.query-cache')).toContain('u-1');
  await services.pins.toggle('p-1', 'instances');
  const clearFiles = jest.spyOn(services.files, 'clear').mockResolvedValue(undefined);

  await act(() => switchMode('demo'));

  expect(queryClient.getQueryCache().getAll().length).toBe(0);
  expect(await services.kv.getItem('sm.query-cache')).toBeNull();
  expect(await services.pins.list('p-1')).toEqual([]);
  expect(clearFiles).toHaveBeenCalled();
  expect(current).toMatchObject({ mode: 'demo' });
  expect(await services.preferences.read()).toMatchObject({ mode: 'demo' });
  // The demo ignores the network: its queries run offline too; back in real mode they wait for it again
  expect(queryClient.getDefaultOptions().queries?.networkMode).toBe('always');

  await act(() => switchMode('real'));

  expect(queryClient.getDefaultOptions().queries?.networkMode).toBe('online');
});

test('the saved mode picks the services at launch', async () => {
  await createPreferences(createKeyValueStore()).update({ mode: 'demo' });
  let mode: string | null = null;

  function Probe() {
    mode = useServices().mode;

    return null;
  }

  await render(
    <ServicesProvider>
      <Probe />
    </ServicesProvider>,
  );

  await waitFor(() => expect(mode).toBe('demo'));
});

// No wait between tries, and no clean-up timer left running after the test.
const noTimers = { retryDelay: 0, gcTime: Infinity };

test("the query client doesn't retry unauthorized errors", async () => {
  const queryFn = jest.fn(async () => {
    throw new AppError('unauthorized', 'Session refused');
  });

  await expect(createQueryClient().fetchQuery({ queryKey: ['me'], queryFn, ...noTimers })).rejects.toMatchObject({
    kind: 'unauthorized',
  });
  expect(queryFn).toHaveBeenCalledTimes(1);
});

test('the query client retries other errors twice, but not forbidden or not found', async () => {
  const queryClient = createQueryClient();
  const calls: Partial<Record<AppErrorKind, number>> = {};

  for (const kind of ['server', 'forbidden', 'not_found'] as const) {
    const queryFn = async () => {
      calls[kind] = (calls[kind] ?? 0) + 1;
      throw new AppError(kind, 'Failed');
    };

    await expect(queryClient.fetchQuery({ queryKey: [kind], queryFn, ...noTimers })).rejects.toBeInstanceOf(AppError);
  }

  expect(calls).toEqual({ server: 3, forbidden: 1, not_found: 1 });
});

test('clearing app data empties the cache and its saved copy', async () => {
  const kv = createKeyValueStore();
  const queryClient = createQueryClient();
  const persister = createQueryPersister(kv);
  await queryClient.fetchQuery({ queryKey: ['account', 'me'], queryFn: async () => ({ id: 'u-1' }), ...noTimers });
  await persistQueryClientSave({ queryClient, persister });
  expect(await kv.getItem('sm.query-cache')).toContain('u-1');

  await clearAppData(queryClient, persister, createServices('demo', { kv }));

  expect(queryClient.getQueryCache().getAll().length).toBe(0);
  expect(await kv.getItem('sm.query-cache')).toBeNull();
});

// Waits until every pending promise callback has run (setImmediate comes after them).
const settle = () => new Promise<void>((resolve) => setImmediate(() => resolve()));

test('the online manager follows the connectivity until unbound', async () => {
  const unsubscribe = jest.fn();
  let emit: (online: boolean) => void = () => {};
  expect(onlineManager.isOnline()).toBe(true);

  const unbind = bindOnlineManager({
    isOnline: async () => false,
    subscribe: (listener) => {
      emit = listener;

      return unsubscribe;
    },
  });
  await settle();
  expect(onlineManager.isOnline()).toBe(false);

  emit(true);
  expect(onlineManager.isOnline()).toBe(true);

  unbind();
  expect(unsubscribe).toHaveBeenCalled();
});

test("demo mode ignores the phone's connectivity: its services always say online", async () => {
  const offlinePhone = { isOnline: async () => false, subscribe: () => () => {} };

  expect(await createServices('demo', { connectivity: offlinePhone }).connectivity.isOnline()).toBe(true);
  expect(await createServices('real', { connectivity: offlinePhone, fetch: jest.fn() }).connectivity.isOnline()).toBe(
    false,
  );
});

test('in demo mode, queries run whatever the network says; in real mode they wait for it', async () => {
  onlineManager.setOnline(false);
  const queryFn = jest.fn(async () => 'data');

  await expect(createQueryClient('demo').fetchQuery({ queryKey: ['thing'], queryFn, ...noTimers })).resolves.toBe(
    'data',
  );

  const real = createQueryClient('real');
  void real.prefetchQuery({ queryKey: ['thing'], queryFn, ...noTimers });
  await settle();

  expect(real.getQueryState(['thing'])?.fetchStatus).toBe('paused');
  expect(queryFn).toHaveBeenCalledTimes(1);
  await real.cancelQueries();
});

test('a failed connectivity check counts as online', async () => {
  onlineManager.setOnline(false);

  const unbind = bindOnlineManager({
    isOnline: async () => {
      throw new Error('No connectivity module');
    },
    subscribe: () => () => {},
  });
  await settle();

  expect(onlineManager.isOnline()).toBe(true);
  unbind();
});

test('clearing app data also clears saved pins and cached invoice files', async () => {
  const saved = new Map<string, string>();
  const kv = {
    getItem: async (key: string) => saved.get(key) ?? null,
    setItem: async (key: string, value: string) => {
      saved.set(key, value);
    },
    removeItem: async (key: string) => {
      saved.delete(key);
    },
  };
  const services = createServices('demo', { kv });
  const clearFiles = jest.spyOn(services.files, 'clear');
  await services.pins.toggle('p-1', 'instances');
  await services.pins.toggle('p-2', 'instances');
  expect([...saved.keys()].filter((key) => key.startsWith('sm.pins'))).toHaveLength(1);

  await clearAppData(createQueryClient(), createQueryPersister(kv), services);

  expect([...saved.keys()].filter((key) => key.startsWith('sm.pins'))).toEqual([]);
  expect(await services.pins.list('p-1')).toEqual([]);
  expect(clearFiles).toHaveBeenCalledTimes(1);
});

describe('coming back from the background', () => {
  const listeners = new Set<(state: AppStateStatus) => void>();
  const tell = (state: AppStateStatus) => listeners.forEach((listener) => listener(state));

  beforeEach(() => {
    jest.useFakeTimers();
    listeners.clear();
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
      listeners.add(listener);

      return { remove: () => listeners.delete(listener) };
    });
  });

  afterEach(() => {
    focusManager.setFocused(undefined);
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  test('the app counts as away only in the background; inactive (Face ID, Control Center) changes nothing', () => {
    const unbind = bindFocusManager();

    tell('background');
    expect(focusManager.isFocused()).toBe(false);

    tell('inactive');
    expect(focusManager.isFocused()).toBe(false);

    tell('active');
    expect(focusManager.isFocused()).toBe(true);

    tell('inactive');
    expect(focusManager.isFocused()).toBe(true);

    // Unbound while away: nothing listens any more, and TanStack counts the app as in use again
    tell('background');
    unbind();
    expect(listeners.size).toBe(0);
    expect(focusManager.isFocused()).toBe(true);
  });

  test('data older than 30 seconds is asked again on return; after a quick trip away, nothing is', async () => {
    const queryClient = createQueryClient();
    queryClient.mount();
    const unbind = bindFocusManager();
    const queryFn = jest.fn(async () => 'data');
    const observer = new QueryObserver(queryClient, { queryKey: ['thing'], queryFn, gcTime: Infinity });
    const unsubscribe = observer.subscribe(() => {});
    await jest.advanceTimersByTimeAsync(0);

    expect(queryFn).toHaveBeenCalledTimes(1);

    // Away for 10 seconds: fresh enough
    tell('background');
    await jest.advanceTimersByTimeAsync(10_000);
    tell('active');
    await jest.advanceTimersByTimeAsync(0);

    expect(queryFn).toHaveBeenCalledTimes(1);

    // Away for a minute: asked again at once
    tell('background');
    await jest.advanceTimersByTimeAsync(60_000);
    tell('active');
    await jest.advanceTimersByTimeAsync(0);

    expect(queryFn).toHaveBeenCalledTimes(2);

    unsubscribe();
    unbind();
    queryClient.unmount();
  });
});
