import { AppError, formatDay, formatTime } from '@scaleway-manager/core';
import type { DatabaseBackup, DatabaseInstance, MetricSeries } from '@scaleway-manager/core';
import { lightColors } from '@scaleway-manager/ui';
import { onlineManager } from '@tanstack/react-query';
import { act, fireEvent, screen, within } from '@testing-library/react-native';

import { renderWithApp } from '../../../test-utils/renderWithApp';
import { createServices } from '../../../wiring/services';
import type { Services } from '../../../wiring/services';
import { LockProvider } from '../../lock/LockProvider';
import { DatabaseDetail } from './DatabaseDetail';

// The demo (signed in, no network), with its own empty phone storage
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

const DAY = 24 * 60 * 60 * 1000;
// 7 Nov 2026, 14:05 on the phone's clock
const NOW = new Date(2026, 10, 7, 14, 5);

let services = demo();

beforeEach(() => {
  jest.useFakeTimers({ now: NOW });
  services = demo();
  onlineManager.setOnline(true);
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
  onlineManager.setOnline(true);
});

const settle = () =>
  act(async () => {
    await jest.advanceTimersByTimeAsync(50);
  });

const open = async () => {
  const result = await renderWithApp(
    <LockProvider>
      <DatabaseDetail locality="fr-par" id="demo-db-main" />
    </LockProvider>,
    { services },
  );
  await settle();

  return result;
};

const press = async (name: string | RegExp) => {
  await act(async () => {
    fireEvent.press(screen.getByRole('button', { name }));
  });
  await settle();
};

const wait = (ms: number) =>
  act(async () => {
    await jest.advanceTimersByTimeAsync(ms);
  });

const sheet = () => within(screen.getByTestId('sheet-content'));

const pressInSheet = async (name: string) => {
  await act(async () => {
    fireEvent.press(sheet().getByRole('button', { name }));
  });
  await settle();
};

const typeName = async (text: string) => {
  await act(async () => {
    fireEvent.changeText(sheet().getByLabelText('Backup name'), text);
  });
};

// The demo's db-main, changed
const withDatabase = async (changes: Partial<DatabaseInstance>) => {
  const db = await demo().databases.get('fr-par', 'demo-db-main');
  jest.spyOn(services.databases, 'get').mockResolvedValue({ ...db, ...changes });
};

// A backup that takes its time
const creatingBackup: DatabaseBackup = {
  id: 'slow',
  name: 'slow',
  databaseName: 'app',
  status: 'creating',
  sizeBytes: null,
  createdAt: NOW.toISOString(),
  expiresAt: null,
};

const chart = (title: string) => screen.queryByRole('image', { name: new RegExp(`^${title}, `) });

describe('a database', () => {
  test('shows its engine and region, and its endpoint to copy', async () => {
    const copy = jest.spyOn(services.clipboard, 'copy').mockResolvedValue(undefined);
    await open();

    expect(screen.getByLabelText('PostgreSQL-16 · fr-par, Ready')).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Connection' })).toBeOnTheScreen();
    expect(screen.getByLabelText('Endpoint, 192.0.2.40:5432')).toBeOnTheScreen();

    await press('Copy Endpoint');

    expect(copy).toHaveBeenCalledWith('192.0.2.40:5432', { sensitive: false });
  });

  test('a highly available database says so', async () => {
    await withDatabase({ isHa: true });
    await open();

    expect(screen.getByLabelText('PostgreSQL-16 · fr-par · High availability, Ready')).toBeOnTheScreen();
  });

  test('a database with no endpoint has no Connection section', async () => {
    await withDatabase({ endpoint: null });
    await open();

    expect(screen.queryByRole('header', { name: 'Connection' })).not.toBeOnTheScreen();
  });
});

describe('its charts', () => {
  test('CPU chart shows the latest value', async () => {
    await open();

    expect(chart('CPU, 92%')).toBeOnTheScreen();
    expect(chart('Memory')).toBeOnTheScreen();
    expect(chart('Disk')).toBeOnTheScreen();
  });

  test('cover the last 24 hours', async () => {
    const metrics = jest.spyOn(services.databases, 'metrics');
    await open();

    expect(metrics).toHaveBeenCalledWith('fr-par', 'demo-db-main', new Date(NOW.getTime() - DAY), NOW);
  });

  test('a missing series is hidden', async () => {
    const all = await demo().databases.metrics('fr-par', 'demo-db-main', new Date(NOW.getTime() - DAY), NOW);
    const cpu = all.filter((series): series is MetricSeries => series.metric === 'cpu');
    jest.spyOn(services.databases, 'metrics').mockResolvedValue(cpu);
    await open();

    expect(chart('CPU')).toBeOnTheScreen();
    expect(chart('Memory')).not.toBeOnTheScreen();
    expect(chart('Disk')).not.toBeOnTheScreen();
  });

  test('metrics that fail hide the three charts, and nothing else', async () => {
    jest.spyOn(services.databases, 'metrics').mockRejectedValue(new AppError('server', 'Down', 500));
    await open();

    expect(chart('CPU')).not.toBeOnTheScreen();
    expect(chart('Memory')).not.toBeOnTheScreen();
    expect(chart('Disk')).not.toBeOnTheScreen();
    expect(screen.getByLabelText('Endpoint, 192.0.2.40:5432')).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Backups' })).toBeOnTheScreen();
  });

  test('while they load, they hold their place', async () => {
    jest.spyOn(services.databases, 'metrics').mockReturnValue(new Promise(() => {}));
    await open();

    expect(screen.getByRole('progressbar', { name: 'CPU' })).toBeOnTheScreen();
    expect(screen.getByRole('progressbar', { name: 'Memory' })).toBeOnTheScreen();
    expect(screen.getByRole('progressbar', { name: 'Disk' })).toBeOnTheScreen();
  });
});

describe('its backups', () => {
  test('show their database, date and size', async () => {
    await open();
    const yesterday = new Date(NOW.getTime() - DAY);

    expect(screen.getByRole('header', { name: 'Backups' })).toBeOnTheScreen();
    expect(
      screen.getByLabelText(`scheduled-1, app · ${formatDay(yesterday)} · ${formatTime(yesterday)}, 399 MB`),
    ).toBeOnTheScreen();
    expect(screen.getByLabelText(/^scheduled-2, app · .*, 393 MB$/)).toBeOnTheScreen();
    expect(screen.getByLabelText(/^scheduled-3, app · .*, 387 MB$/)).toBeOnTheScreen();
  });

  test('no backups shows the caption', async () => {
    jest.spyOn(services.databases, 'backups').mockResolvedValue([]);
    await open();

    // One line on the page, in the list's place: never words inside an empty Section
    expect(screen.getByText('No backups yet.')).toBeOnTheScreen();
    expect(screen.queryByRole('header', { name: 'Backups' })).not.toBeOnTheScreen();
  });

  test('a backup that is not ready shows its status as a Pill; a ready one, its size', async () => {
    jest.spyOn(services.databases, 'backups').mockResolvedValue([
      creatingBackup,
      { ...creatingBackup, id: 'broken', name: 'broken', status: 'error' },
      { ...creatingBackup, id: 'done', name: 'done', status: 'ready', sizeBytes: 412_000_000 },
    ]);
    await open();

    const pill = (name: string) => within(screen.getByLabelText(new RegExp(`^${name}, `))).queryByTestId('pill');

    expect(screen.getByLabelText(/^slow, app · .*, Creating…$/)).toBeOnTheScreen();
    expect(pill('slow')).toHaveStyle({ backgroundColor: lightColors.primaryButton });
    expect(screen.getByLabelText(/^broken, app · .*, Failed$/)).toBeOnTheScreen();
    expect(pill('broken')).toHaveStyle({ backgroundColor: lightColors.dangerBadge });
    expect(screen.getByLabelText(/^done, app · .*, 412 MB$/)).toBeOnTheScreen();
    expect(pill('done')).not.toBeOnTheScreen();
  });

  test('backups Scaleway refuses (403) are left out, with no Try again', async () => {
    jest.spyOn(services.databases, 'backups').mockRejectedValue(new AppError('forbidden', 'Forbidden', 403));
    await open();

    expect(screen.queryByRole('header', { name: 'Backups' })).not.toBeOnTheScreen();
    expect(screen.queryByText("Couldn't load your backups")).not.toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeOnTheScreen();
    // The rest of the screen stays
    expect(screen.getByLabelText('Endpoint, 192.0.2.40:5432')).toBeOnTheScreen();
  });

  test("backups that couldn't load say so, and Try again asks again", async () => {
    const backups = jest.spyOn(services.databases, 'backups').mockRejectedValue(new AppError('server', 'Down', 500));
    await open();

    expect(screen.getByText("Couldn't load your backups")).toBeOnTheScreen();

    backups.mockRestore();
    await press('Try again');

    expect(screen.getByLabelText(/^scheduled-1, app · /)).toBeOnTheScreen();
  });
});

describe('restarting', () => {
  test('restart asks first', async () => {
    const restart = jest.spyOn(services.databases, 'restart');
    await open();
    await press('Restart');

    expect(sheet().getByRole('header', { name: 'Restart db-main?' })).toBeOnTheScreen();
    expect(sheet().getByText('The database is unavailable for a moment while it restarts.')).toBeOnTheScreen();
    expect(restart).not.toHaveBeenCalled();

    await pressInSheet('Restart');

    expect(restart).toHaveBeenCalledTimes(1);
    expect(restart).toHaveBeenCalledWith('fr-par', 'demo-db-main');
    expect(screen.getByText('Restart requested')).toBeOnTheScreen();
    // The database follows the change
    expect(screen.getByLabelText('PostgreSQL-16 · fr-par, Restarting…')).toBeOnTheScreen();
  });

  test("a busy database's actions are off, and say why", async () => {
    await withDatabase({ status: 'restarting' });
    await open();

    expect(screen.getByRole('button', { name: 'Restart' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Back up now' })).toBeDisabled();
    expect(screen.getByText('Wait until the database is ready')).toBeOnTheScreen();
  });

  test("a locked database's actions are off, and say so", async () => {
    await withDatabase({ status: 'locked' });
    await open();

    expect(screen.getByRole('button', { name: 'Restart' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Back up now' })).toBeDisabled();
    expect(screen.getByText('Not available right now')).toBeOnTheScreen();
  });

  test('a ready database says nothing under its actions', async () => {
    await open();

    expect(screen.getByRole('button', { name: 'Restart' })).toBeEnabled();
    expect(screen.queryByText('Wait until the database is ready')).not.toBeOnTheScreen();
    expect(screen.queryByText('Not available right now')).not.toBeOnTheScreen();
  });

  test('offline, Restart and Back up now are off and say why', async () => {
    services = { ...demo(), mode: 'real' };
    const restart = jest.spyOn(services.databases, 'restart');
    await open();
    await act(async () => {
      onlineManager.setOnline(false);
    });

    expect(screen.getByRole('button', { name: 'Restart' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Back up now' })).toBeDisabled();
    expect(screen.getByText("You're offline")).toBeOnTheScreen();

    await press('Restart');
    await press('Back up now');

    expect(screen.queryByTestId('sheet-content')).not.toBeOnTheScreen();
    expect(restart).not.toHaveBeenCalled();
  });

  test('offline, a busy database says only that it is offline', async () => {
    services = { ...demo(), mode: 'real' };
    await withDatabase({ status: 'restarting' });
    await open();
    await act(async () => {
      onlineManager.setOnline(false);
    });

    expect(screen.getAllByText("You're offline")).toHaveLength(1);
    expect(screen.queryByText('Wait until the database is ready')).not.toBeOnTheScreen();
  });

  test('a failed restart shows the quiet failure line under the actions', async () => {
    jest.spyOn(services.databases, 'restart').mockRejectedValue(new AppError('server', 'Down', 500));
    await open();
    await press('Restart');
    await pressInSheet('Restart');

    expect(screen.getByText("Scaleway isn't responding right now. Try again in a moment.")).toBeOnTheScreen();
    expect(screen.queryByText('Restart requested')).not.toBeOnTheScreen();
  });
});

describe('backing up', () => {
  test('backup defaults to the first database and 30 days', async () => {
    const backup = jest.spyOn(services.databases, 'backup');
    await open();
    await press('Back up now');

    expect(sheet().getByRole('header', { name: 'Back up db-main' })).toBeOnTheScreen();
    expect(sheet().getByRole('header', { name: 'Database' })).toBeOnTheScreen();
    expect(sheet().getByRole('button', { name: 'app' })).toBeSelected();
    expect(sheet().getByRole('button', { name: 'analytics' })).not.toBeSelected();
    expect(sheet().getByLabelText('Backup name')).toHaveDisplayValue('app-2026-11-07-1405');
    expect(sheet().getByText('Kept for 30 days.')).toBeOnTheScreen();

    const sentAt = Date.now();
    await pressInSheet('Back up');

    expect(backup).toHaveBeenCalledTimes(1);
    expect(backup).toHaveBeenCalledWith('fr-par', 'demo-db-main', {
      databaseName: 'app',
      name: 'app-2026-11-07-1405',
      expiresAt: new Date(sentAt + 30 * DAY).toISOString(),
    });
    // The sheet goes, so the toast can be seen, and the new backup shows
    expect(screen.queryByTestId('sheet-content')).not.toBeOnTheScreen();
    expect(screen.getByText('Backup started')).toBeOnTheScreen();
    expect(screen.getByLabelText(/^app-2026-11-07-1405, app · .*, Creating…$/)).toBeOnTheScreen();
  });

  test('the backup name follows the picked database until it is edited', async () => {
    await open();
    await press('Back up now');
    await pressInSheet('analytics');

    expect(sheet().getByRole('button', { name: 'analytics' })).toBeSelected();
    expect(sheet().getByLabelText('Backup name')).toHaveDisplayValue('analytics-2026-11-07-1405');

    await typeName('before-migration');
    await pressInSheet('app');

    expect(sheet().getByLabelText('Backup name')).toHaveDisplayValue('before-migration');
  });

  test('a backup needs a name', async () => {
    await open();
    await press('Back up now');
    await typeName('  ');

    expect(sheet().getByRole('button', { name: 'Back up' })).toBeDisabled();
  });

  test('each opening starts again from the defaults', async () => {
    await open();
    await press('Back up now');
    await pressInSheet('analytics');
    await typeName('before-migration');
    await pressInSheet('Close');
    await press('Back up now');

    expect(sheet().getByRole('button', { name: 'app' })).toBeSelected();
    expect(sheet().getByLabelText('Backup name')).toHaveDisplayValue('app-2026-11-07-1405');
  });

  test('a backup is sent once, however many times Back up is pressed', async () => {
    let finish = () => {};
    const backup = jest.spyOn(services.databases, 'backup').mockReturnValue(
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
    );
    await open();
    await press('Back up now');
    // A second tap while it's sent (the same frame is the shared flow's test)
    await pressInSheet('Back up');
    await pressInSheet('Back up');

    expect(backup).toHaveBeenCalledTimes(1);
    expect(sheet().getByRole('button', { name: 'Back up' })).toBeBusy();

    await act(async () => {
      finish();
    });
    await settle();

    expect(backup).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Backup started')).toBeOnTheScreen();
  });

  test('a backup that fails keeps the sheet open, with the failure line under its button', async () => {
    jest.spyOn(services.databases, 'backup').mockRejectedValue(new AppError('server', 'Down', 500));
    await open();
    await press('Back up now');
    await pressInSheet('Back up');

    expect(sheet().getByText("Scaleway isn't responding right now. Try again in a moment.")).toBeOnTheScreen();
    expect(screen.queryByText('Backup started')).not.toBeOnTheScreen();
  });

  test('a backup that fails after its sheet was closed says so under the actions', async () => {
    let fail: (error: Error) => void = () => {};
    jest.spyOn(services.databases, 'backup').mockReturnValue(
      new Promise<void>((_, reject) => {
        fail = reject;
      }),
    );
    await open();
    await press('Back up now');
    await pressInSheet('Back up');
    // Closed while it's still being sent
    await pressInSheet('Close');

    expect(screen.queryByTestId('sheet-content')).not.toBeOnTheScreen();

    await act(async () => {
      fail(new AppError('server', 'Down', 500));
    });
    await settle();

    expect(screen.getByText("Scaleway isn't responding right now. Try again in a moment.")).toBeOnTheScreen();
    expect(screen.queryByText('Backup started')).not.toBeOnTheScreen();

    // Opened again, the sheet starts fresh, and the line leaves the actions
    await press('Back up now');

    expect(screen.queryByText("Scaleway isn't responding right now. Try again in a moment.")).not.toBeOnTheScreen();
  });

  test('databases Scaleway refuses (403) say backups are not available, with no Try again', async () => {
    jest.spyOn(services.databases, 'databaseNames').mockRejectedValue(new AppError('forbidden', 'Forbidden', 403));
    await open();
    await press('Back up now');

    expect(sheet().getByText("Backups aren't available")).toBeOnTheScreen();
    expect(sheet().getByText("You don't have access to backups in this project.")).toBeOnTheScreen();
    expect(sheet().queryByRole('button', { name: 'Try again' })).not.toBeOnTheScreen();
  });

  test('after a backup, the list is asked again every 5 s while it is created, then no more', async () => {
    await open();
    const backups = jest.spyOn(services.databases, 'backups');
    await press('Back up now');
    await pressInSheet('Back up');

    // Asked again once right away: the new backup is being created
    expect(backups).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText(/^app-2026-11-07-1405, app · .*, Creating…$/)).toBeOnTheScreen();

    await wait(5_000);

    expect(backups).toHaveBeenCalledTimes(2);

    // The demo's backup is ready after 6 s
    await wait(5_000);

    expect(backups).toHaveBeenCalledTimes(3);
    expect(screen.getByLabelText(/^app-2026-11-07-1405, app · .*, 412 MB$/)).toBeOnTheScreen();

    await wait(60_000);

    expect(backups).toHaveBeenCalledTimes(3);
  });

  test('a backup still being created after 2 minutes is no longer asked about', async () => {
    await open();
    const backups = jest.spyOn(services.databases, 'backups').mockResolvedValue([creatingBackup]);
    await press('Back up now');
    await pressInSheet('Back up');
    await wait(2 * 60_000);
    const asked = backups.mock.calls.length;

    // Every 5 s for 2 minutes: about 24 times, then never again
    expect(asked).toBeGreaterThanOrEqual(24);
    expect(asked).toBeLessThanOrEqual(26);

    await wait(5 * 60_000);

    expect(backups).toHaveBeenCalledTimes(asked);
    expect(screen.getByLabelText(/^slow, app · .*, Creating…$/)).toBeOnTheScreen();
  });

  test('leaving the screen while a backup is followed stops asking', async () => {
    const { unmount } = await open();
    const backups = jest.spyOn(services.databases, 'backups').mockResolvedValue([creatingBackup]);
    await press('Back up now');
    await pressInSheet('Back up');
    await wait(5_000);
    const asked = backups.mock.calls.length;

    expect(asked).toBe(2);

    await act(async () => {
      unmount();
    });
    await wait(60_000);

    expect(backups).toHaveBeenCalledTimes(asked);
  });

  test('opening a database with a backup being created asks nothing more', async () => {
    const backups = jest.spyOn(services.databases, 'backups').mockResolvedValue([creatingBackup]);
    await open();
    await wait(60_000);

    expect(backups).toHaveBeenCalledTimes(1);
  });

  test("offline, the backup sheet's button is off and says why", async () => {
    services = { ...demo(), mode: 'real' };
    const backup = jest.spyOn(services.databases, 'backup');
    await open();
    await press('Back up now');
    await act(async () => {
      onlineManager.setOnline(false);
    });

    expect(sheet().getByRole('button', { name: 'Back up' })).toBeDisabled();
    expect(sheet().getByText("You're offline")).toBeOnTheScreen();

    await pressInSheet('Back up');

    expect(backup).not.toHaveBeenCalled();
  });
});
