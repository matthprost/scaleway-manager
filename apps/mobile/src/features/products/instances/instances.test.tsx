import { AppError, formatDay, formatTime } from '@scaleway-manager/core';
import type { InstanceServer } from '@scaleway-manager/core';
import { onlineManager } from '@tanstack/react-query';
import { act, fireEvent, screen, within } from '@testing-library/react-native';

import { renderWithApp } from '../../../test-utils/renderWithApp';
import { createServices } from '../../../wiring/services';
import type { Services } from '../../../wiring/services';
import { LockProvider } from '../../lock/LockProvider';
import { InstanceDetail } from './InstanceDetail';

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

// Late in the evening on the phone: the backup name takes the phone's date
const NOW = new Date(2026, 10, 7, 23, 30);

// failureWords for a server error
const SCALEWAY_DOWN = "Scaleway isn't responding right now. Try again in a moment.";

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

const open = async (zone: string, id: string) => {
  await renderWithApp(
    <LockProvider>
      <InstanceDetail locality={zone} id={id} />
    </LockProvider>,
    { services },
  );
  await settle();
};

const openWebProd1 = () => open('fr-par-1', 'demo-web-prod-1');

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

// What screen readers hear for each action button, in order
const actions = () =>
  ['Power on', 'Power off', 'Standby', 'Reboot', 'Back up'].filter(
    (name) => screen.queryByRole('button', { name }) !== null,
  );

// The demo's web-prod-1, changed
const webProd1 = async (change: Partial<InstanceServer>): Promise<InstanceServer> => ({
  ...(await demo().instances.get('fr-par-1', 'demo-web-prod-1')),
  ...change,
});

describe('what an Instance shows', () => {
  test('the hero says its type and zone, and its status', async () => {
    await openWebProd1();

    expect(screen.getByRole('header', { name: 'web-prod-1' })).toBeOnTheScreen();
    expect(screen.getByLabelText('PRO2-S · fr-par-1, Running')).toBeOnTheScreen();
  });

  test('IPs can be copied', async () => {
    const copy = jest.fn(async () => {});
    services = { ...services, clipboard: { copy } };
    await openWebProd1();

    expect(screen.getByRole('header', { name: 'Network' })).toBeOnTheScreen();
    expect(screen.getByLabelText('Public IPv4, 203.0.113.34')).toBeOnTheScreen();

    await press('Copy Public IPv4 203.0.113.34');
    await press('Copy Public IPv6 2001:db8:1640:1a2b::1');
    await press('Copy Private IP 10.64.0.12');

    expect(copy.mock.calls).toEqual([
      ['203.0.113.34', { sensitive: false }],
      ['2001:db8:1640:1a2b::1', { sensitive: false }],
      ['10.64.0.12', { sensitive: false }],
    ]);
    // Confirmed in place, never a toast
    expect(screen.getByRole('button', { name: 'Copied Public IPv4 203.0.113.34' })).toBeOnTheScreen();
  });

  test('every public IPv4 gets its own row', async () => {
    jest
      .spyOn(services.instances, 'get')
      .mockResolvedValue(await webProd1({ publicIpv4: ['203.0.113.34', '203.0.113.35'] }));
    await openWebProd1();

    expect(screen.getByLabelText('Public IPv4, 203.0.113.34')).toBeOnTheScreen();
    expect(screen.getByLabelText('Public IPv4, 203.0.113.35')).toBeOnTheScreen();
    // Screen readers tell their copy buttons apart
    expect(screen.getByRole('button', { name: 'Copy Public IPv4 203.0.113.34' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Copy Public IPv4 203.0.113.35' })).toBeOnTheScreen();
  });

  test('details show the image, type, zone and dates', async () => {
    await openWebProd1();
    const created = new Date(NOW.getTime() - 210 * 24 * 60 * 60 * 1000);
    const updated = new Date(NOW.getTime() - 2 * 24 * 60 * 60 * 1000);

    expect(screen.getByRole('header', { name: 'Details' })).toBeOnTheScreen();
    expect(screen.getByLabelText('Image, Ubuntu')).toBeOnTheScreen();
    expect(screen.getByLabelText('Type, PRO2-S')).toBeOnTheScreen();
    expect(screen.getByLabelText('Zone, fr-par-1')).toBeOnTheScreen();
    expect(screen.getByLabelText(`Created, ${formatDay(created)} · ${formatTime(created)}`)).toBeOnTheScreen();
    expect(screen.getByLabelText(`Updated, ${formatDay(updated)} · ${formatTime(updated)}`)).toBeOnTheScreen();
  });

  test('each disk shows its size and type', async () => {
    await openWebProd1();

    expect(screen.getByRole('header', { name: 'Disks' })).toBeOnTheScreen();
    expect(screen.getByLabelText('web-prod-1-root, 50 GB · Block storage')).toBeOnTheScreen();
  });

  test('a disk with no name is titled by its type, and an unknown size is left out', async () => {
    jest.spyOn(services.instances, 'get').mockResolvedValue(
      await webProd1({
        volumes: [
          { name: null, sizeBytes: 40_000_000_000, type: 'l_ssd' },
          { name: 'data', sizeBytes: null, type: 'sbs_volume' },
          { name: 'tmp', sizeBytes: 20_000_000_000, type: 'scratch' },
          { name: 'other', sizeBytes: 10_000_000_000, type: 'new_kind' },
        ],
      }),
    );
    await openWebProd1();

    expect(screen.getByLabelText('Local SSD, 40 GB')).toBeOnTheScreen();
    expect(screen.getByLabelText('data, Block storage')).toBeOnTheScreen();
    expect(screen.getByLabelText('tmp, 20 GB · Scratch')).toBeOnTheScreen();
    expect(screen.getByLabelText('other, 10 GB · new_kind')).toBeOnTheScreen();
  });

  test('values a server lacks are left out (no IP at all: no Network section)', async () => {
    // worker-1: no public IPs, no private IP
    await open('pl-waw-1', 'demo-worker-1');

    expect(screen.queryByRole('header', { name: 'Network' })).not.toBeOnTheScreen();
    expect(screen.queryByLabelText(/^Public IPv6,/)).not.toBeOnTheScreen();
    expect(screen.queryByLabelText(/^Private IP,/)).not.toBeOnTheScreen();
    expect(screen.getByLabelText('Local SSD, 40 GB')).toBeOnTheScreen();
  });

  test('no image name: no Image row', async () => {
    jest.spyOn(services.instances, 'get').mockResolvedValue(await webProd1({ imageName: null }));
    await openWebProd1();

    expect(screen.queryByLabelText(/^Image,/)).not.toBeOnTheScreen();
    expect(screen.getByLabelText('Type, PRO2-S')).toBeOnTheScreen();
  });
});

describe("an Instance's actions", () => {
  test('running instance shows power off, standby, reboot and back up', async () => {
    await openWebProd1();

    expect(actions()).toEqual(['Power off', 'Standby', 'Reboot', 'Back up']);
  });

  test('a stopped instance shows power on and back up', async () => {
    jest.spyOn(services.instances, 'get').mockResolvedValue(await webProd1({ state: 'stopped' }));
    await openWebProd1();

    // Power on takes Power off's place; what a stopped server can't do stays, turned off
    expect(actions()).toEqual(['Power on', 'Standby', 'Reboot', 'Back up']);
    expect(screen.getByRole('button', { name: 'Power on' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Back up' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Standby' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Reboot' })).toBeDisabled();
    // Never off without a reason
    expect(screen.getByText('The server is stopped')).toBeOnTheScreen();
    expect(screen.queryByText('Not available right now')).not.toBeOnTheScreen();
  });

  test('a server on standby says why Standby and Reboot are off', async () => {
    jest.spyOn(services.instances, 'get').mockResolvedValue(await webProd1({ state: 'standby' }));
    await openWebProd1();

    expect(screen.getByRole('button', { name: 'Power on' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Reboot' })).toBeDisabled();
    expect(screen.getByText('The server is on standby')).toBeOnTheScreen();
  });

  test("an action Scaleway doesn't allow right now stays, turned off, and the grid says so", async () => {
    jest
      .spyOn(services.instances, 'get')
      .mockResolvedValue(await webProd1({ allowedActions: ['poweroff', 'stop_in_place', 'reboot'] }));
    await openWebProd1();

    expect(screen.getByRole('button', { name: 'Reboot' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Back up' })).toBeDisabled();
    expect(screen.getByText("Some actions aren't available right now")).toBeOnTheScreen();
  });

  test('offline, a server on standby says only that it is offline', async () => {
    services = realRules();
    await open('pl-waw-1', 'demo-worker-1');

    expect(screen.getByText('The server is on standby')).toBeOnTheScreen();

    await act(async () => {
      onlineManager.setOnline(false);
    });

    expect(screen.getAllByText("You're offline")).toHaveLength(1);
    expect(screen.queryByText('The server is on standby')).not.toBeOnTheScreen();
  });

  test('a server that is changing keeps its actions, turned off, and says why', async () => {
    services = realRules();
    jest.spyOn(services.instances, 'get').mockResolvedValue(await webProd1({ state: 'stopping' }));
    await openWebProd1();

    expect(actions()).toEqual(['Power off', 'Standby', 'Reboot', 'Back up']);
    for (const name of actions()) {
      expect(screen.getByRole('button', { name })).toBeDisabled();
    }
    expect(screen.getByText('Wait until the server is ready')).toBeOnTheScreen();

    // Offline is said instead, once
    await act(async () => {
      onlineManager.setOnline(false);
    });

    expect(screen.getAllByText("You're offline")).toHaveLength(1);
    expect(screen.queryByText('Wait until the server is ready')).not.toBeOnTheScreen();
  });

  test("a locked server's actions are off, and say so", async () => {
    jest.spyOn(services.instances, 'get').mockResolvedValue(await webProd1({ state: 'locked' }));
    await openWebProd1();

    expect(actions()).toEqual(['Power off', 'Standby', 'Reboot', 'Back up']);
    expect(screen.getByRole('button', { name: 'Back up' })).toBeDisabled();
    expect(screen.getByText('Not available right now')).toBeOnTheScreen();

    // A tap that lands anyway opens nothing
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Back up' }));
    });
    await settle();

    expect(screen.queryByTestId('sheet-content')).not.toBeOnTheScreen();
  });

  test('power off asks first with the server name', async () => {
    const send = jest.spyOn(services.instances, 'act');
    await openWebProd1();
    await press('Power off');

    expect(sheet().getByRole('header', { name: 'Power off web-prod-1?' })).toBeOnTheScreen();
    expect(
      sheet().getByText('The server shuts down and its compute resources are released. Its disks are kept.'),
    ).toBeOnTheScreen();
    expect(send).not.toHaveBeenCalled();

    await pressInSheet('Power off');

    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith('fr-par-1', 'demo-web-prod-1', 'poweroff');
    expect(screen.queryByTestId('sheet-content')).not.toBeOnTheScreen();
    expect(screen.getByText('Power off requested')).toBeOnTheScreen();
  });

  test('power off says when the public IP will change and scratch disks are erased', async () => {
    jest.spyOn(services.instances, 'get').mockResolvedValue(
      await webProd1({
        hasDynamicPublicIp: true,
        volumes: [{ name: 'tmp', sizeBytes: 20_000_000_000, type: 'scratch' }],
      }),
    );
    await openWebProd1();
    await press('Power off');

    expect(
      sheet().getByText(
        'The server shuts down and its compute resources are released. Its disks are kept. ' +
          'Its public IP is released and will change. Scratch disks are erased.',
      ),
    ).toBeOnTheScreen();
  });

  test.each([
    [
      'Standby',
      'Put web-prod-1 on standby?',
      'The server stops but keeps its resources reserved, so it starts again faster. You keep paying for it.',
      'stop_in_place',
      'Standby requested',
    ],
    [
      'Reboot',
      'Reboot web-prod-1?',
      'The server restarts. Anything running on it stops for a moment.',
      'reboot',
      'Reboot requested',
    ],
  ])('%s asks first with the server name', async (verb, title, message, action, toast) => {
    const send = jest.spyOn(services.instances, 'act');
    await openWebProd1();
    await press(verb);

    expect(sheet().getByRole('header', { name: title })).toBeOnTheScreen();
    expect(sheet().getByText(message)).toBeOnTheScreen();

    // Cancel sends nothing
    await pressInSheet('Cancel');

    expect(send).not.toHaveBeenCalled();

    await press(verb);
    await pressInSheet(verb);

    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith('fr-par-1', 'demo-web-prod-1', action);
    expect(screen.getByText(toast)).toBeOnTheScreen();
  });

  test('power on runs without asking', async () => {
    const send = jest.spyOn(services.instances, 'act');
    await open('pl-waw-1', 'demo-worker-1');
    await press('Power on');

    expect(screen.queryByTestId('sheet-content')).not.toBeOnTheScreen();
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith('pl-waw-1', 'demo-worker-1', 'poweron');
    expect(screen.getByText('Power on requested')).toBeOnTheScreen();
  });

  test('a failed action shows the quiet failure line under the actions', async () => {
    jest.spyOn(services.instances, 'act').mockRejectedValue(new AppError('server', 'Down', 500));
    await openWebProd1();
    await press('Reboot');
    await pressInSheet('Reboot');

    expect(screen.getByText(SCALEWAY_DOWN)).toBeOnTheScreen();
    expect(screen.queryByText('Reboot requested')).not.toBeOnTheScreen();
  });

  test('offline, every action is off and says why once, and nothing is sent later', async () => {
    services = realRules();
    const send = jest.spyOn(services.instances, 'act');
    await openWebProd1();
    await act(async () => {
      onlineManager.setOnline(false);
    });

    ['Power off', 'Standby', 'Reboot', 'Back up'].forEach((name) => {
      expect(screen.getByRole('button', { name })).toBeDisabled();
    });
    expect(screen.getAllByText("You're offline")).toHaveLength(1);

    // Taps that land anyway open nothing
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Power off' }));
      fireEvent.press(screen.getByRole('button', { name: 'Back up' }));
    });
    await settle();

    expect(screen.queryByTestId('sheet-content')).not.toBeOnTheScreen();

    await act(async () => {
      onlineManager.setOnline(true);
      await jest.advanceTimersByTimeAsync(60_000);
    });

    expect(send).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Power off' })).toBeEnabled();
  });
});

describe("an Instance's backup", () => {
  test('backup name defaults to name and date', async () => {
    const send = jest.spyOn(services.instances, 'act');
    await openWebProd1();
    await press('Back up');

    expect(sheet().getByRole('header', { name: 'Back up web-prod-1' })).toBeOnTheScreen();
    expect(sheet().getByLabelText('Backup name')).toHaveDisplayValue('web-prod-1-2026-11-07');
    expect(
      sheet().getByText("A backup copies this server's disks, except scratch disks. It's billed as storage."),
    ).toBeOnTheScreen();
    // Taking a backup asks nothing
    expect(send).not.toHaveBeenCalled();

    await pressInSheet('Back up');

    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith('fr-par-1', 'demo-web-prod-1', 'backup', 'web-prod-1-2026-11-07');
    expect(screen.queryByTestId('sheet-content')).not.toBeOnTheScreen();
    expect(screen.getByText('Backup started')).toBeOnTheScreen();
  });

  test('the backup takes the name typed, and waits for one', async () => {
    const send = jest.spyOn(services.instances, 'act');
    await openWebProd1();
    await press('Back up');

    await act(async () => {
      fireEvent.changeText(sheet().getByLabelText('Backup name'), '   ');
    });

    expect(sheet().getByRole('button', { name: 'Back up' })).toBeDisabled();

    await act(async () => {
      fireEvent.changeText(sheet().getByLabelText('Backup name'), ' before-upgrade ');
    });
    await pressInSheet('Back up');

    expect(send).toHaveBeenCalledWith('fr-par-1', 'demo-web-prod-1', 'backup', 'before-upgrade');
  });

  test('a backup is sent once, however many times its button is pressed', async () => {
    const send = jest.spyOn(services.instances, 'act').mockReturnValue(new Promise<void>(() => {}));
    await openWebProd1();
    await press('Back up');

    await act(async () => {
      const button = sheet().getByRole('button', { name: 'Back up' });
      fireEvent.press(button);
      fireEvent.press(button);
    });

    expect(send).toHaveBeenCalledTimes(1);
    expect(sheet().getByRole('button', { name: 'Back up' })).toBeBusy();
    expect(sheet().getByLabelText('Backup name')).toBeDisabled();
  });

  test('offline, the backup button is off and says why, and nothing is sent later', async () => {
    services = realRules();
    const send = jest.spyOn(services.instances, 'act');
    await openWebProd1();
    await press('Back up');
    await act(async () => {
      onlineManager.setOnline(false);
    });

    expect(sheet().getByRole('button', { name: 'Back up' })).toBeDisabled();
    expect(sheet().getByText("You're offline")).toBeOnTheScreen();

    await act(async () => {
      fireEvent.press(sheet().getByRole('button', { name: 'Back up' }));
    });
    await act(async () => {
      onlineManager.setOnline(true);
      await jest.advanceTimersByTimeAsync(60_000);
    });

    expect(send).not.toHaveBeenCalled();
  });

  test('a backup that fails keeps its sheet open, with the reason under its button', async () => {
    jest.spyOn(services.instances, 'act').mockRejectedValue(new AppError('server', 'Down', 500));
    await openWebProd1();
    await press('Back up');
    await pressInSheet('Back up');

    expect(sheet().getByText(SCALEWAY_DOWN)).toBeOnTheScreen();
    // Said once: under the sheet's button, not under the actions behind it too
    expect(screen.getAllByText(SCALEWAY_DOWN)).toHaveLength(1);
    expect(screen.queryByText('Backup started')).not.toBeOnTheScreen();

    // Closed, the actions say it
    await pressInSheet('Close');

    expect(screen.getByText(SCALEWAY_DOWN)).toBeOnTheScreen();

    // Opened again later, it starts fresh
    await press('Back up');

    expect(screen.queryByText(SCALEWAY_DOWN)).not.toBeOnTheScreen();
  });

  test('a backup that fails after its sheet was closed says so under the actions', async () => {
    let fail: (error: Error) => void = () => {};
    jest.spyOn(services.instances, 'act').mockReturnValue(
      new Promise<void>((_, reject) => {
        fail = reject;
      }),
    );
    await openWebProd1();
    await press('Back up');
    await pressInSheet('Back up');
    // Closed while it's still being sent
    await pressInSheet('Close');

    expect(screen.queryByTestId('sheet-content')).not.toBeOnTheScreen();

    await act(async () => {
      fail(new AppError('server', 'Down', 500));
    });
    await settle();

    expect(screen.getByText(SCALEWAY_DOWN)).toBeOnTheScreen();
    expect(screen.queryByText('Backup started')).not.toBeOnTheScreen();
  });
});
