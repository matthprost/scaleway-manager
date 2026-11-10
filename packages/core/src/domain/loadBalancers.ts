import type { Health, ResourceSummary } from './resources';

export type BackendHealth = {
  backendId: string;
  backendName: string;
  ip: string;
  state: 'up' | 'down' | 'checking';
  changedAt: string | null;
};

export type LoadBalancer = {
  id: string;
  zone: string;
  name: string;
  status: string;
  ip: string | null;
  // null when the backends' health couldn't be loaded.
  backends: BackendHealth[] | null;
};

type Status = { health: Health; label: string };

const STATUS = new Map<string, Status>(
  Object.entries({
    pending: { health: 'busy', label: 'Setting up…' },
    creating: { health: 'busy', label: 'Setting up…' },
    to_create: { health: 'busy', label: 'Setting up…' },
    migrating: { health: 'busy', label: 'Setting up…' },
    deleting: { health: 'busy', label: 'Deleting…' },
    to_delete: { health: 'busy', label: 'Deleting…' },
    stopped: { health: 'stopped', label: 'Stopped' },
    error: { health: 'error', label: 'Error' },
    locked: { health: 'error', label: 'Locked' },
  } satisfies Record<string, Status>),
);

// Takes the API's words, already read by the adapter. A stopped server counts as down.
export function backendState(stat: {
  serverState: string;
  healthCheck: string;
}): BackendHealth['state'] {
  if (stat.serverState === 'stopped' || stat.healthCheck === 'failed') {
    return 'down';
  }

  return stat.serverState === 'running' && (stat.healthCheck === 'passed' || stat.healthCheck === 'condpass')
    ? 'up'
    : 'checking';
}

export function loadBalancerStatus(lb: Pick<LoadBalancer, 'status' | 'backends'>): Status {
  if (lb.status !== 'ready') {
    return STATUS.get(lb.status) ?? { health: 'warning', label: 'Unknown' };
  }
  if (lb.backends === null) {
    return { health: 'warning', label: 'Backends unavailable' };
  }
  const down = lb.backends.filter((backend) => backend.state === 'down').length;

  if (down === 0) {
    return { health: 'ok', label: 'Healthy' };
  }

  return down === lb.backends.length
    ? { health: 'error', label: 'All backends down' }
    : { health: 'warning', label: `${down} ${down === 1 ? 'backend' : 'backends'} down` };
}

export function loadBalancerToSummary(lb: LoadBalancer): ResourceSummary {
  const status = loadBalancerStatus(lb);

  return {
    key: `load-balancers:${lb.zone}:${lb.id}`,
    product: 'load-balancers',
    id: lb.id,
    locality: lb.zone,
    name: lb.name,
    kindLabel: 'Load balancer',
    detail: lb.ip ?? '—',
    health: status.health,
    statusLabel: status.label,
  };
}
