import type { ClockPort, StatusPort } from '@scaleway-manager/core';

export const createDemoStatus = (clock: ClockPort): StatusPort => ({
  listOpenIncidents: async () => [
    {
      id: 'demo-incident-1',
      name: 'Slower block storage in fr-par-1',
      status: 'investigating',
      impact: 'minor',
      components: ['Instances', 'fr-par-1'],
      latestUpdate: 'We are looking into slower disk operations.',
      updatedAt: new Date(clock.now().getTime() - 2 * 3_600_000).toISOString(),
      url: 'https://status.scaleway.com',
    },
  ],
});
