import type {
  ClockPort,
  DatabaseBackup,
  DatabaseInstance,
  DatabasesPort,
  MetricSeries,
} from '@scaleway-manager/core';

import { BUSY_MS, DAY, MINUTE, createStateBook, notFound } from './transitions';

const MB = 1_000_000;
const ID = 'demo-db-main';
const REGION = 'fr-par';

type NewBackup = { id: string; name: string; databaseName: string; at: number; expiresAt: string };

export const createDemoDatabases = (clock: ClockPort): DatabasesPort => {
  const book = createStateBook<string>(clock, { [ID]: 'ready' });
  const added: NewBackup[] = [];

  const build = (): DatabaseInstance => ({
    id: ID,
    region: REGION,
    name: 'db-main',
    engine: 'PostgreSQL-16',
    status: book.get(ID) ?? 'ready',
    nodeType: 'DB-DEV-M',
    endpoint: '192.0.2.40:5432',
    isHa: false,
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
    // Five-minute points ending at `until`; the CPU climbs to 92% over the last hour.
    metrics: async (region, id, since, until) => {
      check(region, id);
      const cpu: MetricSeries = { metric: 'cpu', unit: '%', points: [] };
      const memory: MetricSeries = { metric: 'memory', unit: '%', points: [] };
      const disk: MetricSeries = { metric: 'disk', unit: '%', points: [] };
      const steps = Math.floor((until.getTime() - since.getTime()) / (5 * MINUTE));

      for (let back = steps; back >= 0; back -= 1) {
        const at = new Date(until.getTime() - back * 5 * MINUTE).toISOString();
        const minutesAgo = back * 5;
        const wobble = Math.sin(back / 3);

        cpu.points.push({
          at,
          value: Math.round(minutesAgo <= 60 ? 92 - (minutesAgo / 60) * 38 : 54 + wobble * 6),
        });
        memory.points.push({ at, value: Math.round(61 + wobble * 3) });
        disk.points.push({ at, value: Math.round(38 + (steps - back) / 400) });
      }

      return [cpu, memory, disk];
    },
    // Newest first, like the real API.
    backups: async (region, id) => {
      check(region, id);
      const now = clock.now().getTime();
      const mine: DatabaseBackup[] = added.map((backup) => ({
        id: backup.id,
        name: backup.name,
        databaseName: backup.databaseName,
        status: now - backup.at >= BUSY_MS ? 'ready' : 'creating',
        sizeBytes: now - backup.at >= BUSY_MS ? 412 * MB : null,
        createdAt: new Date(backup.at).toISOString(),
        expiresAt: backup.expiresAt,
      }));
      const scheduled: DatabaseBackup[] = [1, 2, 3].map((daysAgo) => ({
        id: `demo-backup-${daysAgo}`,
        name: `scheduled-${daysAgo}`,
        databaseName: 'app',
        status: 'ready',
        sizeBytes: (405 - daysAgo * 6) * MB,
        createdAt: new Date(now - daysAgo * DAY).toISOString(),
        expiresAt: new Date(now + (7 - daysAgo) * DAY).toISOString(),
      }));

      return [...mine.reverse(), ...scheduled];
    },
    databaseNames: async (region, id) => {
      check(region, id);

      return ['app', 'analytics'];
    },
    restart: async (region, id) => {
      check(region, id);
      book.start(id, 'restarting', 'ready');
    },
    backup: async (region, id, input) => {
      check(region, id);
      added.push({
        id: `demo-backup-new-${added.length + 1}`,
        name: input.name,
        databaseName: input.databaseName,
        at: clock.now().getTime(),
        expiresAt: input.expiresAt,
      });
    },
  };
};
