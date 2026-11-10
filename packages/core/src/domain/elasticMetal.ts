import type { Health, ResourceSummary } from './resources';

export type ElasticMetalStatus =
  | 'ready'
  | 'stopped'
  | 'starting'
  | 'stopping'
  | 'resetting'
  | 'delivering'
  | 'ordered'
  | 'migrating'
  | 'deleting'
  | 'error'
  | 'locked'
  | 'out_of_stock'
  | 'unknown';

export type ElasticMetalServer = {
  id: string;
  zone: string;
  name: string;
  status: ElasticMetalStatus;
  ping: 'up' | 'down' | 'unknown';
  offerName: string;
  ips: string[];
  createdAt: string;
};

export type PingPoint = { at: string; up: boolean };

export type ElasticMetalAction = 'start' | 'stop' | 'reboot';

const STATUS: Record<Exclude<ElasticMetalStatus, 'ready'>, { health: Health; label: string }> = {
  stopped: { health: 'stopped', label: 'Stopped' },
  starting: { health: 'busy', label: 'Starting…' },
  stopping: { health: 'busy', label: 'Stopping…' },
  resetting: { health: 'busy', label: 'Restarting…' },
  delivering: { health: 'busy', label: 'Being delivered' },
  ordered: { health: 'busy', label: 'Ordered' },
  migrating: { health: 'busy', label: 'Migrating…' },
  deleting: { health: 'busy', label: 'Deleting…' },
  error: { health: 'error', label: 'Error' },
  locked: { health: 'error', label: 'Locked' },
  out_of_stock: { health: 'warning', label: 'Out of stock' },
  unknown: { health: 'warning', label: 'Unknown' },
};

export function elasticMetalStatus(server: Pick<ElasticMetalServer, 'status' | 'ping'>): {
  health: Health;
  label: string;
} {
  if (server.status === 'ready') {
    return server.ping === 'down'
      ? { health: 'error', label: 'Not responding' }
      : { health: 'ok', label: 'Running' };
  }

  return Object.hasOwn(STATUS, server.status) ? STATUS[server.status] : STATUS.unknown;
}

export function availableElasticMetalActions(
  server: Pick<ElasticMetalServer, 'status'>,
): ElasticMetalAction[] {
  if (server.status === 'ready') {
    return ['stop', 'reboot'];
  }

  return server.status === 'stopped' ? ['start'] : [];
}

export function elasticMetalToSummary(server: ElasticMetalServer): ResourceSummary {
  const status = elasticMetalStatus(server);

  return {
    key: `elastic-metal:${server.zone}:${server.id}`,
    product: 'elastic-metal',
    id: server.id,
    locality: server.zone,
    name: server.name,
    kindLabel: `Elastic Metal · ${server.offerName}`,
    detail: server.ips[0] ?? server.offerName,
    health: status.health,
    statusLabel: status.label,
  };
}
