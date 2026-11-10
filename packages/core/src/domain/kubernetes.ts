import type { Health, ResourceSummary } from './resources';

export type KubernetesNodeStatus =
  | 'ready'
  | 'not_ready'
  | 'creating'
  | 'deleting'
  | 'locked'
  | 'creation_error'
  | 'rebooting'
  | 'upgrading'
  | 'starting'
  | 'registering'
  | 'deleted'
  | 'unknown';

export type KubernetesNode = {
  id: string;
  poolId: string;
  name: string;
  status: KubernetesNodeStatus;
  errorMessage: string | null;
  publicIpv4: string | null;
};

export type KubernetesClusterStatus =
  | 'ready'
  | 'creating'
  | 'updating'
  | 'deleting'
  | 'locked'
  | 'pool_required'
  | 'deleted'
  | 'unknown';

export type KubernetesCluster = {
  id: string;
  region: string;
  name: string;
  status: KubernetesClusterStatus;
  version: string;
  upgradeAvailable: boolean;
  // null when the node list couldn't be loaded.
  nodes: KubernetesNode[] | null;
};

export type KubernetesPool = {
  id: string;
  name: string;
  nodeType: string;
  size: number;
  minSize: number;
  maxSize: number;
  autoscaling: boolean;
  status: string;
  zone: string;
};

export type KubernetesNodeAction = 'reboot' | 'replace';

type Status = { health: Health; label: string };

const CLUSTER_STATUS: Record<Exclude<KubernetesClusterStatus, 'ready'>, Status> = {
  creating: { health: 'busy', label: 'Creating…' },
  updating: { health: 'busy', label: 'Updating…' },
  deleting: { health: 'busy', label: 'Deleting…' },
  locked: { health: 'error', label: 'Locked' },
  pool_required: { health: 'warning', label: 'Needs a node pool' },
  deleted: { health: 'stopped', label: 'Deleted' },
  unknown: { health: 'warning', label: 'Unknown' },
};

const NODE_STATUS: Record<KubernetesNodeStatus, Status> = {
  ready: { health: 'ok', label: 'Ready' },
  not_ready: { health: 'warning', label: 'Not ready' },
  creating: { health: 'busy', label: 'Creating…' },
  deleting: { health: 'busy', label: 'Deleting…' },
  locked: { health: 'error', label: 'Locked' },
  creation_error: { health: 'error', label: 'Failed to start' },
  rebooting: { health: 'busy', label: 'Rebooting…' },
  upgrading: { health: 'busy', label: 'Updating…' },
  starting: { health: 'busy', label: 'Starting…' },
  registering: { health: 'busy', label: 'Setting up…' },
  deleted: { health: 'stopped', label: 'Deleted' },
  unknown: { health: 'warning', label: 'Unknown' },
};

const POOL_STATUS = new Map<string, Status>(
  Object.entries({
    ready: { health: 'ok', label: 'Ready' },
    scaling: { health: 'busy', label: 'Scaling…' },
    upgrading: { health: 'busy', label: 'Updating…' },
    warning: { health: 'warning', label: 'Needs attention' },
    locked: { health: 'error', label: 'Locked' },
    deleting: { health: 'busy', label: 'Deleting…' },
  } satisfies Record<string, Status>),
);

export function clusterStatus(cluster: Pick<KubernetesCluster, 'status' | 'nodes'>): Status {
  if (cluster.status === 'ready') {
    if (cluster.nodes === null) {
      return { health: 'warning', label: 'Nodes unavailable' };
    }
    const hasProblem = cluster.nodes.some(
      (node) => node.status === 'not_ready' || node.status === 'creation_error',
    );

    return hasProblem ? { health: 'warning', label: 'Node problem' } : { health: 'ok', label: 'Healthy' };
  }

  return Object.hasOwn(CLUSTER_STATUS, cluster.status)
    ? CLUSTER_STATUS[cluster.status as keyof typeof CLUSTER_STATUS]
    : CLUSTER_STATUS.unknown;
}

export function nodeStatus(node: Pick<KubernetesNode, 'status'>): Status {
  return Object.hasOwn(NODE_STATUS, node.status) ? NODE_STATUS[node.status] : NODE_STATUS.unknown;
}

export function poolStatus(pool: Pick<KubernetesPool, 'status'>): Status {
  return POOL_STATUS.get(pool.status) ?? { health: 'warning', label: 'Unknown' };
}

export function availableNodeActions(node: Pick<KubernetesNode, 'status'>): KubernetesNodeAction[] {
  const canAct = node.status === 'ready' || node.status === 'not_ready' || node.status === 'creation_error';

  return canAct ? ['reboot', 'replace'] : [];
}

export function clusterToSummary(cluster: KubernetesCluster): ResourceSummary {
  const status = clusterStatus(cluster);
  const { nodes } = cluster;
  const detail =
    nodes === null
      ? 'Nodes unavailable'
      : `${nodes.filter((node) => node.status === 'ready').length}/${nodes.length} nodes ready`;

  return {
    key: `kubernetes:${cluster.region}:${cluster.id}`,
    product: 'kubernetes',
    id: cluster.id,
    locality: cluster.region,
    name: cluster.name,
    kindLabel: `Kubernetes · ${cluster.version}`,
    detail,
    health: status.health,
    statusLabel: status.label,
  };
}
