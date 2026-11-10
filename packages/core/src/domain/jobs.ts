import type { Health, ResourceSummary } from './resources';

export type JobRunState =
  | 'initialized'
  | 'validated'
  | 'queued'
  | 'running'
  | 'succeeded'
  | 'failed'
  | 'interrupting'
  | 'interrupted'
  | 'retrying'
  | 'unknown_state';

export type JobRun = {
  id: string;
  definitionId: string;
  state: JobRunState;
  startedAt: string | null;
  finishedAt: string | null;
  exitCode: number | null;
  errorMessage: string | null;
};

export type JobDefinition = {
  id: string;
  region: string;
  name: string;
  cronSchedule: string | null;
  // The schedule's time zone (tz database name, e.g. Europe/Paris).
  cronTimezone: string | null;
  // null when the job never ran; 'unavailable' when its runs couldn't be loaded.
  lastRun: JobRun | null | 'unavailable';
};

type Status = { health: Health; label: string };

const RUN_STATUS = new Map<string, Status>(
  Object.entries({
    succeeded: { health: 'ok', label: 'Succeeded' },
    failed: { health: 'error', label: 'Failed' },
    interrupted: { health: 'warning', label: 'Interrupted' },
    running: { health: 'busy', label: 'Running…' },
    queued: { health: 'busy', label: 'Queued' },
    initialized: { health: 'busy', label: 'Queued' },
    validated: { health: 'busy', label: 'Queued' },
    retrying: { health: 'busy', label: 'Retrying…' },
    interrupting: { health: 'busy', label: 'Stopping…' },
  } satisfies Record<string, Status>),
);

const FINISHED: string[] = ['succeeded', 'failed', 'interrupted'];
const STOPPABLE: string[] = ['queued', 'initialized', 'validated', 'running', 'retrying'];

export function jobRunStatus(run: Pick<JobRun, 'state'>): Status {
  return RUN_STATUS.get(run.state) ?? { health: 'warning', label: 'Unknown' };
}

export function jobDefinitionStatus(definition: Pick<JobDefinition, 'lastRun'>): Status {
  const { lastRun } = definition;

  if (lastRun === null) {
    return { health: 'stopped', label: 'Never run' };
  }
  if (lastRun === 'unavailable') {
    return { health: 'warning', label: 'Last run unavailable' };
  }
  const status = jobRunStatus(lastRun);

  return FINISHED.includes(lastRun.state) ? { ...status, label: `Last run: ${status.label}` } : status;
}

// A daily schedule ("0 3 * * *", "30 14 * * *") in words: "Every day at 03:00"; anything else as written. Then the
// time zone, when there is one: "Every day at 03:00 (Europe/Paris)".
export function cronInWords(schedule: string, timezone: string | null): string {
  const raw = schedule.trim();
  const [minute = '', hour = '', ...rest] = raw.split(/\s+/);
  const daily =
    rest.length === 3 &&
    rest.every((field) => field === '*') &&
    /^\d{1,2}$/.test(minute) &&
    /^\d{1,2}$/.test(hour) &&
    Number(minute) < 60 &&
    Number(hour) < 24;
  const words = daily ? `Every day at ${hour.padStart(2, '0')}:${minute.padStart(2, '0')}` : raw;

  return timezone === null || timezone === '' ? words : `${words} (${timezone})`;
}

export function canStopRun(run: Pick<JobRun, 'state'>): boolean {
  return STOPPABLE.includes(run.state);
}

// `{m} min {s} s`, or `{h} h {m} min` from one hour. Without an end time: `Running for …`.
export function runDurationLabel(run: Pick<JobRun, 'startedAt' | 'finishedAt'>, now: Date): string {
  if (run.startedAt === null) {
    return '—';
  }
  const end = run.finishedAt === null ? now.getTime() : new Date(run.finishedAt).getTime();
  const totalSeconds = Math.max(0, Math.floor((end - new Date(run.startedAt).getTime()) / 1000));
  const totalMinutes = Math.floor(totalSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (run.finishedAt === null) {
    return `Running for ${hours > 0 ? `${hours} h ${minutes} min` : `${minutes} min`}`;
  }

  return hours > 0 ? `${hours} h ${minutes} min` : `${minutes} min ${totalSeconds % 60} s`;
}

export function jobToSummary(definition: JobDefinition): ResourceSummary {
  const status = jobDefinitionStatus(definition);

  return {
    key: `jobs:${definition.region}:${definition.id}`,
    product: 'jobs',
    id: definition.id,
    locality: definition.region,
    name: definition.name,
    kindLabel: 'Job',
    detail: definition.cronSchedule ?? 'Manual',
    health: status.health,
    statusLabel: status.label,
  };
}
