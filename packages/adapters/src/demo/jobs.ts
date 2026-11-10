import type { ClockPort, JobDefinition, JobRun, JobsPort } from '@scaleway-manager/core';

import { BUSY_MS, DAY, MINUTE, notFound } from './transitions';

const ID = 'demo-nightly-report';
const REGION = 'fr-par';
// A manual run lasts this long, so there is time to stop it.
const RUN_MS = 30_000;

type Started = { id: string; at: number; stoppedAt: number | null };

export const createDemoJobs = (clock: ClockPort): JobsPort => {
  const started: Started[] = [];

  // Past runs: every night at 03:00 UTC, taking 4 minutes.
  const history = (): JobRun[] => {
    const now = clock.now();
    const last = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 3);
    const latest = last > now.getTime() ? last - DAY : last;

    return [0, 1, 2, 3, 4].map((back) => {
      const start = latest - back * DAY;

      return {
        id: `demo-run-${back}`,
        definitionId: ID,
        state: 'succeeded',
        startedAt: new Date(start).toISOString(),
        finishedAt: new Date(start + 4 * MINUTE).toISOString(),
        exitCode: 0,
        errorMessage: null,
      };
    });
  };

  const runs = (): JobRun[] => {
    const now = clock.now().getTime();
    const mine = started.map((run): JobRun => {
      const base = { id: run.id, definitionId: ID, startedAt: new Date(run.at).toISOString() };

      if (run.stoppedAt !== null) {
        const done = now - run.stoppedAt >= BUSY_MS;

        return {
          ...base,
          state: done ? 'interrupted' : 'interrupting',
          finishedAt: done ? new Date(run.stoppedAt + BUSY_MS).toISOString() : null,
          exitCode: null,
          errorMessage: null,
        };
      }
      if (now - run.at >= RUN_MS) {
        return {
          ...base,
          state: 'succeeded',
          finishedAt: new Date(run.at + RUN_MS).toISOString(),
          exitCode: 0,
          errorMessage: null,
        };
      }

      return { ...base, state: 'running', finishedAt: null, exitCode: null, errorMessage: null };
    });

    return [...mine.reverse(), ...history()];
  };

  const build = (): JobDefinition => ({
    id: ID,
    region: REGION,
    name: 'nightly-report',
    cronSchedule: '0 3 * * *',
    cronTimezone: 'UTC',
    lastRun: runs()[0] ?? null,
  });

  const check = (region: string, id: string): void => {
    if (region !== REGION || id !== ID) {
      throw notFound();
    }
  };

  return {
    list: async (projectId) => (projectId === 'demo-prod' ? [build()] : []),
    get: async (region, id) => {
      check(region, id);

      return build();
    },
    runs: async (region, definitionId) => {
      check(region, definitionId);

      return runs();
    },
    start: async (region, definitionId) => {
      check(region, definitionId);
      started.push({ id: `demo-run-manual-${started.length + 1}`, at: clock.now().getTime(), stoppedAt: null });
    },
    stopRun: async (region, runId) => {
      const run = started.find((item) => item.id === runId);

      if (region !== REGION || run === undefined) {
        throw notFound();
      }
      const now = clock.now().getTime();

      // A finished or already stopped run can't be stopped again.
      if (run.stoppedAt === null && now - run.at < RUN_MS) {
        run.stoppedAt = now;
      }
    },
  };
};
