import type {
  ClockPort,
  ElasticMetalAction,
  ElasticMetalPort,
  ElasticMetalServer,
  ElasticMetalStatus,
  PingPoint,
} from '@scaleway-manager/core';

import { DAY, MINUTE, createStateBook, notFound } from './transitions';

const ID = 'demo-em-storage-1';
const ZONE = 'fr-par-2';

const PHASES: Record<ElasticMetalAction, { busy: ElasticMetalStatus; final: ElasticMetalStatus }> = {
  start: { busy: 'starting', final: 'ready' },
  stop: { busy: 'stopping', final: 'stopped' },
  reboot: { busy: 'resetting', final: 'ready' },
};

export const createDemoElasticMetal = (clock: ClockPort): ElasticMetalPort => {
  const book = createStateBook<ElasticMetalStatus>(clock, { [ID]: 'ready' });

  const build = (): ElasticMetalServer => {
    const status = book.get(ID) ?? 'ready';

    return {
      id: ID,
      zone: ZONE,
      name: 'em-storage-1',
      status,
      ping: status === 'ready' ? 'up' : 'unknown',
      offerName: 'EM-A315X-SSD',
      ips: ['198.51.100.5'],
      createdAt: new Date(clock.now().getTime() - 180 * DAY).toISOString(),
    };
  };

  const check = (zone: string, id: string): void => {
    if (zone !== ZONE || id !== ID) {
      throw notFound();
    }
  };

  return {
    list: async (projectId) => (projectId === 'demo-prod' ? [build()] : []),
    get: async (zone, id) => {
      check(zone, id);

      return build();
    },
    act: async (zone, id, action) => {
      check(zone, id);
      book.start(id, PHASES[action].busy, PHASES[action].final);
    },
    // One ping a minute for 24 h, oldest first, with a 20-minute outage 6 hours ago.
    pings: async (zone, id) => {
      check(zone, id);
      const now = clock.now().getTime();
      const points: PingPoint[] = [];

      for (let minutesAgo = 24 * 60 - 1; minutesAgo >= 0; minutesAgo -= 1) {
        const inOutage = minutesAgo > 340 && minutesAgo <= 360;

        points.push({ at: new Date(now - minutesAgo * MINUTE).toISOString(), up: !inOutage });
      }

      return points;
    },
  };
};
