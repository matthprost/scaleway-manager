import { formatDayShort, formatTime } from '@scaleway-manager/core';
import type { LoadBalancer } from '@scaleway-manager/core';
import { act, fireEvent, screen } from '@testing-library/react-native';

import { renderWithApp } from '../../../test-utils/renderWithApp';
import { createServices } from '../../../wiring/services';
import type { Services } from '../../../wiring/services';
import { LockProvider } from '../../lock/LockProvider';
import { LoadBalancerDetail } from './LoadBalancerDetail';

const NOW = new Date('2026-11-07T12:00:00Z');
const ID = 'demo-lb-web';

// The demo (signed in, no network), with its own empty phone storage. Its clock is the fake system clock.
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

let services = demo();

beforeEach(() => {
  jest.useFakeTimers({ now: NOW });
  services = demo();
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

const openLoadBalancer = async () => {
  await renderWithApp(
    <LockProvider>
      <LoadBalancerDetail locality="fr-par-1" id={ID} />
    </LockProvider>,
    { services },
  );
  // Let the queries finish inside act
  await act(async () => {
    await jest.advanceTimersByTimeAsync(50);
  });
};

// The demo's load balancer, changed
const withLoadBalancer = async (changes: Partial<LoadBalancer>) => {
  const lb = await demo().loadBalancers.get('fr-par-1', ID);
  jest.spyOn(services.loadBalancers, 'get').mockResolvedValue({ ...lb, ...changes });
};

// What screen readers hear for each backend server row, in order
const backendRows = () =>
  screen.getAllByLabelText(/^10\.64\.0\.\d+, /).map((row) => row.props.accessibilityLabel as string);

test('down backends are listed first', async () => {
  const downSince = new Date(NOW.getTime() - 35 * 60_000);
  const upSince = new Date(NOW.getTime() - 48 * 3_600_000);
  await openLoadBalancer();

  expect(screen.getByLabelText('Load balancer · fr-par-1, 1 backend down')).toBeOnTheScreen();
  expect(screen.getByRole('header', { name: 'Backend servers' })).toBeOnTheScreen();
  // Changed today: the time; earlier: the day
  expect(backendRows()).toEqual([
    `10.64.0.30, assets · since ${formatTime(downSince)}, Down`,
    `10.64.0.12, web-http · since ${formatDayShort(upSince)}, Up`,
    `10.64.0.21, api-http · since ${formatDayShort(upSince)}, Up`,
  ]);
});

test('there are no actions on load balancers', async () => {
  await openLoadBalancer();

  // Only Back, the pin and the IP's copy button
  expect(screen.getAllByRole('button').map((button) => button.props.accessibilityLabel)).toEqual([
    'Back',
    'Pin to Home',
    'Copy IP address',
  ]);
});

test('the details show the IP address to copy, and the zone', async () => {
  await openLoadBalancer();

  expect(screen.getByLabelText('IP address, 198.51.100.10')).toBeOnTheScreen();
  expect(screen.getByLabelText('Zone, fr-par-1')).toBeOnTheScreen();
});

test('a load balancer without an IP address leaves that row out', async () => {
  await withLoadBalancer({ ip: null });
  await openLoadBalancer();

  expect(screen.queryByText('IP address')).not.toBeOnTheScreen();
  expect(screen.getByLabelText('Zone, fr-par-1')).toBeOnTheScreen();
});

test('a backend still being checked says so, without a time when Scaleway gives none', async () => {
  await withLoadBalancer({
    backends: [{ backendId: 'b-1', backendName: 'web-http', ip: '10.64.0.40', state: 'checking', changedAt: null }],
  });
  await openLoadBalancer();

  expect(backendRows()).toEqual(['10.64.0.40, web-http, Checking']);
});

test("backends that couldn't load say so, and Try again asks again", async () => {
  await withLoadBalancer({ backends: null });
  await openLoadBalancer();

  expect(screen.getByLabelText('Load balancer · fr-par-1, Backends unavailable')).toBeOnTheScreen();
  expect(screen.queryByRole('header', { name: 'Backend servers' })).not.toBeOnTheScreen();
  expect(screen.getByText("Couldn't load your backend servers")).toBeOnTheScreen();

  const get = jest.spyOn(services.loadBalancers, 'get').mockImplementation(demo().loadBalancers.get);
  await act(async () => {
    fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    await jest.advanceTimersByTimeAsync(50);
  });

  expect(get).toHaveBeenCalled();
  expect(screen.queryByText("Couldn't load your backend servers")).not.toBeOnTheScreen();
  expect(screen.getByRole('header', { name: 'Backend servers' })).toBeOnTheScreen();
});
