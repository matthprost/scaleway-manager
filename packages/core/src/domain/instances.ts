import type { Health, ResourceSummary } from './resources';

export type InstanceState = 'running' | 'stopped' | 'standby' | 'starting' | 'stopping' | 'locked' | 'unknown';

export type InstanceAction = 'poweron' | 'poweroff' | 'stop_in_place' | 'reboot' | 'backup';

export type InstanceServer = {
  id: string;
  zone: string;
  name: string;
  state: InstanceState;
  commercialType: string;
  imageName: string | null;
  publicIpv4: string[];
  publicIpv6: string[];
  // Power off releases a dynamic public IP (G-8).
  hasDynamicPublicIp: boolean;
  privateIp: string | null;
  volumes: { name: string | null; sizeBytes: number | null; type: string }[];
  createdAt: string;
  updatedAt: string;
  allowedActions: string[];
};

const STATUS: Record<InstanceState, { health: Health; label: string }> = {
  running: { health: 'ok', label: 'Running' },
  stopped: { health: 'stopped', label: 'Stopped' },
  standby: { health: 'stopped', label: 'Standby' },
  starting: { health: 'busy', label: 'Starting…' },
  stopping: { health: 'busy', label: 'Stopping…' },
  locked: { health: 'error', label: 'Locked' },
  unknown: { health: 'warning', label: 'Unknown' },
};

export function instanceStatus(state: InstanceState): { health: Health; label: string } {
  return Object.hasOwn(STATUS, state) ? STATUS[state] : STATUS.unknown;
}

// Only the actions the app offers: terminate and the like are never listed.
export function availableInstanceActions(server: InstanceServer): InstanceAction[] {
  let actions: InstanceAction[] = [];
  if (server.state === 'running') {
    actions = ['poweroff', 'stop_in_place', 'reboot', 'backup'];
  } else if (server.state === 'stopped' || server.state === 'standby') {
    actions = ['poweron', 'backup'];
  }
  if (server.allowedActions.length === 0) {
    return actions;
  }

  return actions.filter((action) => server.allowedActions.includes(action));
}

export function instanceToSummary(server: InstanceServer): ResourceSummary {
  const status = instanceStatus(server.state);

  return {
    key: `instances:${server.zone}:${server.id}`,
    product: 'instances',
    id: server.id,
    locality: server.zone,
    name: server.name,
    kindLabel: `Instance · ${server.imageName ?? server.commercialType}`,
    detail: server.publicIpv4[0] ?? server.privateIp ?? server.commercialType,
    health: status.health,
    statusLabel: status.label,
  };
}
