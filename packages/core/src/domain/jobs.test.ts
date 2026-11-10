import {
  canStopRun,
  cronInWords,
  jobDefinitionStatus,
  jobRunStatus,
  jobToSummary,
  runDurationLabel,
} from './jobs';
import type { JobDefinition, JobRun, JobRunState } from './jobs';

const run = (overrides: Partial<JobRun> = {}): JobRun => ({
  id: 'r-1',
  definitionId: 'j-1',
  state: 'succeeded',
  startedAt: '2026-11-05T10:00:00Z',
  finishedAt: '2026-11-05T10:03:20Z',
  exitCode: 0,
  errorMessage: null,
  ...overrides,
});

const definition = (overrides: Partial<JobDefinition> = {}): JobDefinition => ({
  id: 'j-1',
  region: 'fr-par',
  name: 'nightly',
  cronSchedule: '0 3 * * *',
  cronTimezone: 'Europe/Paris',
  lastRun: null,
  ...overrides,
});

describe('jobRunStatus', () => {
  it.each([
    ['succeeded', 'ok', 'Succeeded'],
    ['failed', 'error', 'Failed'],
    ['interrupted', 'warning', 'Interrupted'],
    ['running', 'busy', 'Running…'],
    ['queued', 'busy', 'Queued'],
    ['initialized', 'busy', 'Queued'],
    ['validated', 'busy', 'Queued'],
    ['retrying', 'busy', 'Retrying…'],
    ['interrupting', 'busy', 'Stopping…'],
    ['unknown_state', 'warning', 'Unknown'],
    ['brand_new', 'warning', 'Unknown'],
    ['constructor', 'warning', 'Unknown'],
  ])('%s is %s %s', (state, health, label) => {
    expect(jobRunStatus(run({ state: state as JobRunState }))).toEqual({ health, label });
  });
});

describe('jobDefinitionStatus', () => {
  it('a job that never ran says Never run', () => {
    expect(jobDefinitionStatus(definition())).toEqual({ health: 'stopped', label: 'Never run' });
  });

  it('prefixes finished states with Last run', () => {
    expect(jobDefinitionStatus(definition({ lastRun: run() }))).toEqual({
      health: 'ok',
      label: 'Last run: Succeeded',
    });
    expect(jobDefinitionStatus(definition({ lastRun: run({ state: 'failed' }) }))).toEqual({
      health: 'error',
      label: 'Last run: Failed',
    });
    expect(jobDefinitionStatus(definition({ lastRun: run({ state: 'interrupted' }) }))).toEqual({
      health: 'warning',
      label: 'Last run: Interrupted',
    });
  });

  it('a job whose runs could not load says Last run unavailable', () => {
    expect(jobDefinitionStatus(definition({ lastRun: 'unavailable' }))).toEqual({
      health: 'warning',
      label: 'Last run unavailable',
    });
  });

  it('keeps the live label for a run in progress', () => {
    expect(jobDefinitionStatus(definition({ lastRun: run({ state: 'running' }) }))).toEqual({
      health: 'busy',
      label: 'Running…',
    });
  });
});

describe('canStopRun', () => {
  it.each(['queued', 'initialized', 'validated', 'running', 'retrying'] as const)('%s can be stopped', (state) => {
    expect(canStopRun(run({ state }))).toBe(true);
  });

  it.each(['succeeded', 'failed', 'interrupting', 'interrupted', 'unknown_state'] as const)(
    '%s cannot be stopped',
    (state) => {
      expect(canStopRun(run({ state }))).toBe(false);
    },
  );
});

describe('runDurationLabel', () => {
  const now = new Date('2026-11-05T12:00:00Z');

  it('shows minutes and seconds', () => {
    expect(runDurationLabel(run(), now)).toBe('3 min 20 s');
  });

  it('shows hours from 60 minutes', () => {
    const long = run({ finishedAt: '2026-11-05T12:00:00Z' });

    expect(runDurationLabel(long, now)).toBe('2 h 0 min');
  });

  it('a run with no end time shows Running for', () => {
    expect(runDurationLabel(run({ state: 'running', finishedAt: null }), now)).toBe('Running for 2 h 0 min');
    expect(
      runDurationLabel(run({ state: 'running', startedAt: '2026-11-05T11:41:30Z', finishedAt: null }), now),
    ).toBe('Running for 18 min');
  });

  it('shows a dash when it never started', () => {
    expect(runDurationLabel(run({ state: 'queued', startedAt: null, finishedAt: null }), now)).toBe('—');
  });
});

describe('cronInWords', () => {
  it.each([
    ['0 3 * * *', 'Every day at 03:00'],
    ['30 14 * * *', 'Every day at 14:30'],
    ['5 0 * * *', 'Every day at 00:05'],
    [' 0  23 * * * ', 'Every day at 23:00'],
  ])('a daily schedule (%s) is said in words', (schedule, words) => {
    expect(cronInWords(schedule, null)).toBe(words);
  });

  it('says the time zone after the words', () => {
    expect(cronInWords('0 3 * * *', 'Europe/Paris')).toBe('Every day at 03:00 (Europe/Paris)');
  });

  it.each([
    '*/15 * * * *',
    '0 */2 * * *',
    '0 3 * * 1',
    '0 3 1 * *',
    '0 3 * 1 *',
    '0 3,15 * * *',
    '60 3 * * *',
    '0 24 * * *',
    '0 3 * * * *',
    '@daily',
  ])('anything else stays as written (%s)', (schedule) => {
    expect(cronInWords(schedule, null)).toBe(schedule);
  });

  it('says the time zone after a raw schedule too', () => {
    expect(cronInWords('*/15 * * * *', 'UTC')).toBe('*/15 * * * * (UTC)');
  });

  it('an empty time zone adds nothing, not "()"', () => {
    expect(cronInWords('0 3 * * *', '')).toBe('Every day at 03:00');
  });

  it('a raw schedule is shown without the spaces around it', () => {
    expect(cronInWords('  */15 * * * * ', null)).toBe('*/15 * * * *');
  });
});

describe('jobToSummary', () => {
  it('uses the cron schedule as detail', () => {
    expect(jobToSummary(definition())).toEqual({
      key: 'jobs:fr-par:j-1',
      product: 'jobs',
      id: 'j-1',
      locality: 'fr-par',
      name: 'nightly',
      kindLabel: 'Job',
      detail: '0 3 * * *',
      health: 'stopped',
      statusLabel: 'Never run',
    });
  });

  it('says the last run is unavailable when its runs could not load', () => {
    expect(jobToSummary(definition({ lastRun: 'unavailable' }))).toMatchObject({
      health: 'warning',
      statusLabel: 'Last run unavailable',
    });
  });

  it('says Manual without a schedule and shows the last run', () => {
    expect(jobToSummary(definition({ cronSchedule: null, lastRun: run() }))).toMatchObject({
      detail: 'Manual',
      health: 'ok',
      statusLabel: 'Last run: Succeeded',
    });
  });
});
