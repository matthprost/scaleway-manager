import { AppError, formatDay, formatTime } from '@scaleway-manager/core';
import type { ElasticMetalServer, PingPoint } from '@scaleway-manager/core';
import { lightColors } from '@scaleway-manager/ui';
import { onlineManager } from '@tanstack/react-query';
import { act, fireEvent, screen, within } from '@testing-library/react-native';

import { renderWithApp } from '../../../test-utils/renderWithApp';
import { createServices } from '../../../wiring/services';
import type { Services } from '../../../wiring/services';
import { LockProvider } from '../../lock/LockProvider';
import { ElasticMetalDetail } from './ElasticMetalDetail';

// The demo (signed in, no network), with its own empty phone storage. Its clock is the (fake) system clock.
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

const NOW = new Date(2026, 10, 7, 9, 30);
const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;

let services = demo();

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(NOW);
  services = demo();
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
  onlineManager.setOnline(true);
});

// Fake time: let the queries finish inside act
const settle = () =>
  act(async () => {
    await jest.advanceTimersByTimeAsync(50);
  });

const open = async () => {
  await renderWithApp(
    <LockProvider>
      <ElasticMetalDetail locality="fr-par-2" id="demo-em-storage-1" />
    </LockProvider>,
    { services },
  );
  await settle();
};

const press = async (name: string) => {
  await act(async () => {
    fireEvent.press(screen.getByRole('button', { name }));
  });
  await settle();
};

const sheet = () => within(screen.getByTestId('sheet-content'));

const pressInSheet = async (name: string) => {
  await act(async () => {
    fireEvent.press(sheet().getByRole('button', { name }));
  });
  await settle();
};

// The demo's em-storage-1, changed
const emStorage1 = async (change: Partial<ElasticMetalServer>): Promise<ElasticMetalServer> => ({
  ...(await demo().elasticMetal.get('fr-par-2', 'demo-em-storage-1')),
  ...change,
});

// A ping a minute for the last hour, up or down
const pingsFor = (up: (minutesAgo: number) => boolean): PingPoint[] =>
  Array.from({ length: 60 }, (_, index) => {
    const minutesAgo = 59 - index;

    return { at: new Date(NOW.getTime() - minutesAgo * MINUTE).toISOString(), up: up(minutesAgo) };
  });

describe('what an Elastic Metal server shows', () => {
  test('the hero says its offer and zone, and its status', async () => {
    await open();

    expect(screen.getByRole('header', { name: 'em-storage-1' })).toBeOnTheScreen();
    expect(screen.getByLabelText('EM-A315X-SSD · fr-par-2, Running')).toBeOnTheScreen();
  });

  test('not responding server shows the error status', async () => {
    jest.spyOn(services.elasticMetal, 'get').mockResolvedValue(await emStorage1({ ping: 'down' }));
    await open();

    const hero = screen.getByLabelText('EM-A315X-SSD · fr-par-2, Not responding');

    expect(within(hero).getByTestId('pill')).toHaveStyle({ backgroundColor: lightColors.dangerBadge });
  });

  test('its IPs can be copied', async () => {
    const copy = jest.fn(async () => {});
    services = { ...services, clipboard: { copy } };
    jest
      .spyOn(services.elasticMetal, 'get')
      .mockResolvedValue(await emStorage1({ ips: ['198.51.100.5', '2001:db8:1200::5'] }));
    await open();

    expect(screen.getByRole('header', { name: 'Network' })).toBeOnTheScreen();

    // Each copy button says which address it copies
    await press('Copy Public IP 198.51.100.5');
    await press('Copy Public IP 2001:db8:1200::5');

    expect(copy.mock.calls).toEqual([
      ['198.51.100.5', { sensitive: false }],
      ['2001:db8:1200::5', { sensitive: false }],
    ]);
  });

  test('no IP: no Network section', async () => {
    jest.spyOn(services.elasticMetal, 'get').mockResolvedValue(await emStorage1({ ips: [] }));
    await open();

    expect(screen.queryByRole('header', { name: 'Network' })).not.toBeOnTheScreen();
  });

  test('details show the offer, zone and creation date', async () => {
    await open();
    const created = new Date(NOW.getTime() - 180 * DAY);

    expect(screen.getByRole('header', { name: 'Details' })).toBeOnTheScreen();
    expect(screen.getByLabelText('Offer, EM-A315X-SSD')).toBeOnTheScreen();
    expect(screen.getByLabelText('Zone, fr-par-2')).toBeOnTheScreen();
    expect(screen.getByLabelText(`Created, ${formatDay(created)} · ${formatTime(created)}`)).toBeOnTheScreen();
  });
});

describe("an Elastic Metal server's reachability", () => {
  test('reachability chart shows 0% when pings are down', async () => {
    // Up until five minutes ago, down since
    jest.spyOn(services.elasticMetal, 'pings').mockResolvedValue(pingsFor((minutesAgo) => minutesAgo >= 5));
    await open();

    expect(screen.getByLabelText('Reachability (24 h), 0%, lowest 0%, highest 100%')).toBeOnTheScreen();
  });

  test('a server that answers every ping is at 100%', async () => {
    await open();

    expect(screen.getByLabelText(/^Reachability \(24 h\), 100%/)).toBeOnTheScreen();
  });

  test('no pings yet says so', async () => {
    jest.spyOn(services.elasticMetal, 'pings').mockResolvedValue([]);
    await open();

    expect(screen.getByLabelText('Reachability (24 h), No data')).toBeOnTheScreen();
    expect(screen.getByText('No reachability data yet.')).toBeOnTheScreen();
  });

  test('while the pings load, the chart shows its placeholder', async () => {
    jest.spyOn(services.elasticMetal, 'pings').mockReturnValue(new Promise<PingPoint[]>(() => {}));
    await open();

    expect(screen.getByRole('progressbar', { name: 'Reachability (24 h)' })).toBeBusy();
  });

  test('reachability Scaleway refuses (403) is left out, with no Try again', async () => {
    jest.spyOn(services.elasticMetal, 'pings').mockRejectedValue(new AppError('forbidden', 'Forbidden', 403));
    await open();

    expect(screen.queryByLabelText(/^Reachability \(24 h\)/)).not.toBeOnTheScreen();
    expect(screen.queryByText("Couldn't load the reachability")).not.toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeOnTheScreen();
    // The rest of the screen stays
    expect(screen.getByLabelText('Offer, EM-A315X-SSD')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Stop' })).toBeEnabled();
  });

  test('pings that fail to load say so, and try again; the rest of the screen stays', async () => {
    const pings = jest.spyOn(services.elasticMetal, 'pings').mockRejectedValue(new AppError('server', 'Down', 500));
    await open();

    expect(screen.getByText("Couldn't load the reachability")).toBeOnTheScreen();
    expect(screen.getByLabelText('Offer, EM-A315X-SSD')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Stop' })).toBeOnTheScreen();

    pings.mockRestore();
    await press('Try again');

    expect(screen.queryByText("Couldn't load the reachability")).not.toBeOnTheScreen();
    expect(screen.getByLabelText(/^Reachability \(24 h\), 100%/)).toBeOnTheScreen();
  });
});

describe("an Elastic Metal server's actions", () => {
  test('a running server can be stopped or rebooted', async () => {
    await open();

    expect(screen.getByRole('button', { name: 'Stop' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Reboot' })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Start' })).not.toBeOnTheScreen();
  });

  test('stop asks first', async () => {
    const send = jest.spyOn(services.elasticMetal, 'act');
    await open();
    await press('Stop');

    expect(sheet().getByRole('header', { name: 'Stop em-storage-1?' })).toBeOnTheScreen();
    expect(sheet().getByText('The server shuts down. You keep paying for it.')).toBeOnTheScreen();
    expect(send).not.toHaveBeenCalled();

    await pressInSheet('Stop');

    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith('fr-par-2', 'demo-em-storage-1', 'stop');
    expect(screen.queryByTestId('sheet-content')).not.toBeOnTheScreen();
    expect(screen.getByText('Stop requested')).toBeOnTheScreen();
  });

  test('reboot asks first', async () => {
    const send = jest.spyOn(services.elasticMetal, 'act');
    await open();
    await press('Reboot');

    expect(sheet().getByRole('header', { name: 'Reboot em-storage-1?' })).toBeOnTheScreen();
    expect(sheet().getByText('The server restarts. Anything running on it stops for a moment.')).toBeOnTheScreen();

    await pressInSheet('Cancel');

    expect(send).not.toHaveBeenCalled();

    await press('Reboot');
    await pressInSheet('Reboot');

    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith('fr-par-2', 'demo-em-storage-1', 'reboot');
    expect(screen.getByText('Reboot requested')).toBeOnTheScreen();
  });

  test('start runs without asking', async () => {
    jest
      .spyOn(services.elasticMetal, 'get')
      .mockResolvedValue(await emStorage1({ status: 'stopped', ping: 'unknown' }));
    const send = jest.spyOn(services.elasticMetal, 'act');
    await open();

    // Start takes Stop's place; Reboot stays, turned off, and the grid says why
    expect(screen.queryByRole('button', { name: 'Stop' })).not.toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Reboot' })).toBeDisabled();
    expect(screen.getByText('The server is stopped')).toBeOnTheScreen();

    await press('Start');

    expect(screen.queryByTestId('sheet-content')).not.toBeOnTheScreen();
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith('fr-par-2', 'demo-em-storage-1', 'start');
    expect(screen.getByText('Start requested')).toBeOnTheScreen();
  });

  test('a server that is changing keeps its actions, turned off, and says why', async () => {
    jest.spyOn(services.elasticMetal, 'get').mockResolvedValue(await emStorage1({ status: 'starting' }));
    await open();

    expect(screen.getByRole('button', { name: 'Stop' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Reboot' })).toBeDisabled();
    expect(screen.getByText('Wait until the server is ready')).toBeOnTheScreen();
  });

  test("a server in error keeps its actions, turned off, and says they can't run now", async () => {
    jest.spyOn(services.elasticMetal, 'get').mockResolvedValue(await emStorage1({ status: 'error' }));
    await open();

    expect(screen.getByRole('button', { name: 'Stop' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Reboot' })).toBeDisabled();
    expect(screen.getByText('Not available right now')).toBeOnTheScreen();
  });

  test('a failed action shows the quiet failure line under the actions', async () => {
    jest.spyOn(services.elasticMetal, 'act').mockRejectedValue(new AppError('server', 'Down', 500));
    await open();
    await press('Stop');
    await pressInSheet('Stop');

    expect(screen.getByText("Scaleway isn't responding right now. Try again in a moment.")).toBeOnTheScreen();
    expect(screen.queryByText('Stop requested')).not.toBeOnTheScreen();
  });

  test('offline, every action is off and says why once, and nothing is sent later', async () => {
    services = realRules();
    const send = jest.spyOn(services.elasticMetal, 'act');
    await open();
    await act(async () => {
      onlineManager.setOnline(false);
    });

    expect(screen.getByRole('button', { name: 'Stop' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Reboot' })).toBeDisabled();
    expect(screen.getAllByText("You're offline")).toHaveLength(1);

    // A tap that lands anyway asks nothing
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Stop' }));
    });
    await settle();

    expect(screen.queryByTestId('sheet-content')).not.toBeOnTheScreen();

    await act(async () => {
      onlineManager.setOnline(true);
      await jest.advanceTimersByTimeAsync(60_000);
    });

    expect(send).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Stop' })).toBeEnabled();
  });

  test('offline with the chart failed too, "You\'re offline" is still said once', async () => {
    services = realRules();
    jest.spyOn(services.elasticMetal, 'pings').mockRejectedValue(new AppError('server', 'Down', 500));
    await open();
    await act(async () => {
      onlineManager.setOnline(false);
    });

    expect(screen.getByText("Couldn't load the reachability")).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeDisabled();
    expect(screen.getAllByText("You're offline")).toHaveLength(1);
  });
});
