import { AppError, formatDayShort, formatTime } from '@scaleway-manager/core';
import type { JobRun } from '@scaleway-manager/core';
import { onlineManager } from '@tanstack/react-query';
import { act, fireEvent, screen, within } from '@testing-library/react-native';

import { renderWithApp } from '../../../test-utils/renderWithApp';
import { createServices } from '../../../wiring/services';
import type { Services } from '../../../wiring/services';
import { LockProvider } from '../../lock/LockProvider';
import { JobDetail } from './JobDetail';

const NOW = new Date('2026-11-07T12:00:00Z');
const ID = 'demo-nightly-report';

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

// A run's title: when it started, on the phone's clock ("7 Nov 04:00")
const startedAt = (iso: string | Date) => {
  const date = new Date(iso);

  return `${formatDayShort(date)} ${formatTime(date)}`;
};

const RUNNING: JobRun = {
  id: 'run-live',
  definitionId: ID,
  state: 'running',
  startedAt: new Date(NOW.getTime() - 12 * 60_000).toISOString(),
  finishedAt: null,
  exitCode: null,
  errorMessage: null,
};
const RUNNING_LABEL = `${startedAt(RUNNING.startedAt ?? '')}, Running for 12 min, Running…`;

const FAILED: JobRun = {
  id: 'run-failed',
  definitionId: ID,
  state: 'failed',
  startedAt: '2026-11-06T03:00:00Z',
  finishedAt: '2026-11-06T03:01:10Z',
  exitCode: 137,
  errorMessage: 'Out of memory',
};

// The demo's latest nightly run, today at 03:00 UTC
const LATEST_LABEL = `${startedAt('2026-11-07T03:00:00Z')}, 4 min 0 s · exit 0, Succeeded`;

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

// Let the queries finish inside act
const settle = () =>
  act(async () => {
    await jest.advanceTimersByTimeAsync(50);
  });

const openJob = async () => {
  await renderWithApp(
    <LockProvider>
      <JobDetail locality="fr-par" id={ID} />
    </LockProvider>,
    { services },
  );
  await settle();
};

// The demo's job, changed
const withJob = async (changes: { cronSchedule?: string | null; cronTimezone?: string | null; lastRun?: null }) => {
  const job = await demo().jobs.get('fr-par', ID);
  jest.spyOn(services.jobs, 'get').mockResolvedValue({ ...job, ...changes });
};

const press = async (name: string) => {
  await act(async () => {
    fireEvent.press(screen.getByRole('button', { name }));
  });
  await settle();
};

const sheet = () => within(screen.getByTestId('sheet-content'));

const confirmIn = async (name: string) => {
  await act(async () => {
    fireEvent.press(sheet().getByRole('button', { name }));
  });
  await settle();
};

test('daily cron is shown in words', async () => {
  await openJob();

  expect(screen.getByLabelText('Every day at 03:00 (UTC) · fr-par, Last run: Succeeded')).toBeOnTheScreen();
});

test('a job without a schedule runs manually', async () => {
  await withJob({ cronSchedule: null, cronTimezone: null });
  await openJob();

  expect(screen.getByLabelText('Runs manually · fr-par, Last run: Succeeded')).toBeOnTheScreen();
});

test('run now asks first', async () => {
  const start = jest.spyOn(services.jobs, 'start');
  await openJob();
  await press('Run now');

  expect(sheet().getByText('Run nightly-report now?')).toBeOnTheScreen();
  expect(sheet().getByText('This starts a new run right away.')).toBeOnTheScreen();
  expect(start).not.toHaveBeenCalled();

  // Two taps in the same frame start one run
  await act(async () => {
    const confirm = sheet().getByRole('button', { name: 'Run' });
    fireEvent.press(confirm);
    fireEvent.press(confirm);
  });
  await settle();

  expect(start).toHaveBeenCalledTimes(1);
  expect(start).toHaveBeenCalledWith('fr-par', ID);
  expect(screen.getByText('Run started')).toBeOnTheScreen();
  // The new run tops the list, and the job shows it running
  expect(screen.getByLabelText('Every day at 03:00 (UTC) · fr-par, Running…')).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: `${startedAt(NOW)}, Running for 0 min, Running…` })).toBeOnTheScreen();
});

test('a running run can be stopped', async () => {
  jest.spyOn(services.jobs, 'runs').mockResolvedValue([RUNNING, FAILED]);
  const stopRun = jest.spyOn(services.jobs, 'stopRun').mockResolvedValue();
  await openJob();
  await press(RUNNING_LABEL);

  expect(sheet().getByText('Stop this run of nightly-report?')).toBeOnTheScreen();
  expect(sheet().getByText('The job is interrupted where it is.')).toBeOnTheScreen();
  expect(stopRun).not.toHaveBeenCalled();

  await confirmIn('Stop');

  expect(stopRun).toHaveBeenCalledTimes(1);
  expect(stopRun).toHaveBeenCalledWith('fr-par', 'run-live');
  expect(screen.getByText('Run stopped')).toBeOnTheScreen();
});

test('a run that can be stopped tells screen readers what a tap does', async () => {
  jest.spyOn(services.jobs, 'runs').mockResolvedValue([RUNNING, FAILED]);
  await openJob();

  expect(screen.getByRole('button', { name: RUNNING_LABEL }).props.accessibilityHint).toBe(
    'Asks if you want to stop this run',
  );
});

test('a finished run cannot be stopped', async () => {
  await openJob();

  expect(screen.getByRole('header', { name: 'Recent runs' })).toBeOnTheScreen();
  expect(screen.getByLabelText(LATEST_LABEL)).toBeOnTheScreen();
  // None of the five finished runs opens anything
  expect(screen.getAllByLabelText(/, 4 min 0 s · exit 0, Succeeded$/)).toHaveLength(5);
  expect(screen.queryAllByRole('button', { name: /Succeeded$/ })).toHaveLength(0);
});

test("a failed run's error is its subtitle", async () => {
  jest.spyOn(services.jobs, 'runs').mockResolvedValue([FAILED]);
  await openJob();

  expect(screen.getByLabelText(`${startedAt(FAILED.startedAt ?? '')}, Out of memory, Failed`)).toBeOnTheScreen();
});

test('offline, Run now and stopping a run are off, said once', async () => {
  services = { ...demo(), mode: 'real' };
  jest.spyOn(services.jobs, 'runs').mockResolvedValue([RUNNING]);
  const stopRun = jest.spyOn(services.jobs, 'stopRun');
  await openJob();
  await act(async () => {
    onlineManager.setOnline(false);
  });

  expect(screen.getByRole('button', { name: 'Run now' })).toBeDisabled();
  expect(screen.getByRole('button', { name: RUNNING_LABEL })).toBeDisabled();
  expect(screen.getAllByText("You're offline")).toHaveLength(1);

  await press(RUNNING_LABEL);

  expect(screen.queryByTestId('sheet-content')).not.toBeOnTheScreen();
  expect(stopRun).not.toHaveBeenCalled();
});

test("runs that couldn't load say so, and try again", async () => {
  const runs = jest.spyOn(services.jobs, 'runs').mockRejectedValue(new AppError('server', 'Down', 500));
  await openJob();

  expect(screen.getByText("Couldn't load your recent runs")).toBeOnTheScreen();
  // Only that part: the rest of the screen stays
  expect(screen.getByRole('button', { name: 'Run now' })).toBeEnabled();

  runs.mockRestore();
  await press('Try again');

  expect(screen.getByLabelText(LATEST_LABEL)).toBeOnTheScreen();
});

test('runs Scaleway refuses (403) are left out, with no Try again', async () => {
  jest.spyOn(services.jobs, 'runs').mockRejectedValue(new AppError('forbidden', 'Forbidden', 403));
  await openJob();

  expect(screen.queryByRole('header', { name: 'Recent runs' })).not.toBeOnTheScreen();
  expect(screen.queryByText("Couldn't load your recent runs")).not.toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Run now' })).toBeEnabled();
});

test('a job that never ran lists no runs', async () => {
  await withJob({ lastRun: null });
  jest.spyOn(services.jobs, 'runs').mockResolvedValue([]);
  await openJob();

  expect(screen.getByLabelText('Every day at 03:00 (UTC) · fr-par, Never run')).toBeOnTheScreen();
  expect(screen.queryByRole('header', { name: 'Recent runs' })).not.toBeOnTheScreen();
});
