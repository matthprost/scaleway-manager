import type { ClockPort, InstanceAction, InstanceServer, InstanceState, InstancesPort } from '@scaleway-manager/core';

import { DAY, createStateBook, notFound } from './transitions';

const GB = 1_000_000_000;

type Seed = Omit<InstanceServer, 'state' | 'createdAt' | 'updatedAt' | 'allowedActions'> & {
  state: InstanceState;
  ageDays: number;
};

const SEEDS: Record<string, Seed[]> = {
  'demo-prod': [
    {
      id: 'demo-web-prod-1',
      zone: 'fr-par-1',
      name: 'web-prod-1',
      state: 'running',
      commercialType: 'PRO2-S',
      imageName: 'Ubuntu',
      publicIpv4: ['203.0.113.34'],
      publicIpv6: ['2001:db8:1640:1a2b::1'],
      hasDynamicPublicIp: false,
      privateIp: '10.64.0.12',
      volumes: [{ name: 'web-prod-1-root', sizeBytes: 50 * GB, type: 'sbs_volume' }],
      ageDays: 210,
    },
    {
      id: 'demo-api-prod-2',
      zone: 'nl-ams-1',
      name: 'api-prod-2',
      state: 'running',
      commercialType: 'PRO2-XS',
      imageName: 'Debian',
      publicIpv4: ['203.0.113.21'],
      publicIpv6: [],
      hasDynamicPublicIp: false,
      privateIp: null,
      volumes: [{ name: 'api-prod-2-root', sizeBytes: 30 * GB, type: 'sbs_volume' }],
      ageDays: 95,
    },
    {
      id: 'demo-worker-1',
      zone: 'pl-waw-1',
      name: 'worker-1',
      state: 'standby',
      commercialType: 'DEV1-M',
      imageName: 'Alpine',
      publicIpv4: [],
      publicIpv6: [],
      hasDynamicPublicIp: false,
      privateIp: null,
      volumes: [{ name: null, sizeBytes: 40 * GB, type: 'l_ssd' }],
      ageDays: 40,
    },
  ],
  'demo-staging': [
    {
      id: 'demo-staging-1',
      zone: 'fr-par-2',
      name: 'staging-1',
      state: 'running',
      commercialType: 'DEV1-S',
      imageName: 'Ubuntu',
      publicIpv4: ['203.0.113.7'],
      publicIpv6: [],
      // Its Power off question says the IP will change.
      hasDynamicPublicIp: true,
      privateIp: null,
      volumes: [{ name: 'staging-1-root', sizeBytes: 20 * GB, type: 'sbs_volume' }],
      ageDays: 12,
    },
  ],
};

const PHASES: Partial<Record<InstanceAction, { busy: InstanceState; final: InstanceState }>> = {
  poweron: { busy: 'starting', final: 'running' },
  poweroff: { busy: 'stopping', final: 'stopped' },
  stop_in_place: { busy: 'stopping', final: 'standby' },
  reboot: { busy: 'starting', final: 'running' },
};

export const createDemoInstances = (clock: ClockPort): InstancesPort => {
  const seeds = Object.entries(SEEDS).flatMap(([projectId, list]) =>
    list.map((seed) => ({ projectId, seed })),
  );
  const book = createStateBook<InstanceState>(
    clock,
    Object.fromEntries(seeds.map(({ seed }) => [seed.id, seed.state])),
  );

  const build = ({ ageDays, ...seed }: Seed): InstanceServer => ({
    ...seed,
    state: book.get(seed.id) ?? seed.state,
    createdAt: new Date(clock.now().getTime() - ageDays * DAY).toISOString(),
    updatedAt: new Date(clock.now().getTime() - 2 * DAY).toISOString(),
    allowedActions: [],
  });

  return {
    list: async (projectId) => (SEEDS[projectId] ?? []).map(build),
    get: async (zone, id) => {
      const found = seeds.find(({ seed }) => seed.id === id && seed.zone === zone);

      if (found === undefined) {
        throw notFound();
      }

      return build(found.seed);
    },
    act: async (zone, id, action) => {
      const found = seeds.find(({ seed }) => seed.id === id && seed.zone === zone);
      const phase = PHASES[action];

      if (found === undefined) {
        throw notFound();
      }
      if (phase !== undefined) {
        book.start(id, phase.busy, phase.final);
      }
    },
  };
};
