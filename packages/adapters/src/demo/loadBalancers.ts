import type { BackendHealth, ClockPort, LoadBalancer, LoadBalancersPort } from '@scaleway-manager/core';

import { MINUTE, notFound } from './transitions';

const ID = 'demo-lb-web';
const ZONE = 'fr-par-1';

export const createDemoLoadBalancers = (clock: ClockPort): LoadBalancersPort => {
  const build = (): LoadBalancer => {
    const ago = (minutes: number): string =>
      new Date(clock.now().getTime() - minutes * MINUTE).toISOString();
    const backends: BackendHealth[] = [
      { backendId: 'demo-backend-web', backendName: 'web-http', ip: '10.64.0.12', state: 'up', changedAt: ago(60 * 48) },
      { backendId: 'demo-backend-api', backendName: 'api-http', ip: '10.64.0.21', state: 'up', changedAt: ago(60 * 48) },
      { backendId: 'demo-backend-assets', backendName: 'assets', ip: '10.64.0.30', state: 'down', changedAt: ago(35) },
    ];

    return { id: ID, zone: ZONE, name: 'lb-web', status: 'ready', ip: '198.51.100.10', backends };
  };

  return {
    list: async (projectId) => (projectId === 'demo-prod' ? [build()] : []),
    get: async (zone, id) => {
      if (zone !== ZONE || id !== ID) {
        throw notFound();
      }

      return build();
    },
  };
};
