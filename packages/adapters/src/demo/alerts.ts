import type { AlertsPort } from '@scaleway-manager/core';

export const createDemoAlerts = (): AlertsPort => ({
  listFiring: async (projectId) =>
    projectId === 'demo-prod'
      ? [
          {
            id: 'demo-alert-1',
            name: 'High CPU on db-main',
            region: 'fr-par',
            summary: 'CPU has been above 90% for 10 minutes.',
          },
        ]
      : [],
});
