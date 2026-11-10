import {
  availableNodeActions,
  clusterStatus,
  clusterToSummary,
  nodeStatus,
  poolStatus,
} from './kubernetes';
import type { KubernetesCluster, KubernetesNode } from './kubernetes';

const node = (overrides: Partial<KubernetesNode> = {}): KubernetesNode => ({
  id: 'n-1',
  poolId: 'p-1',
  name: 'node-1',
  status: 'ready',
  errorMessage: null,
  publicIpv4: null,
  ...overrides,
});

const cluster = (overrides: Partial<KubernetesCluster> = {}): KubernetesCluster => ({
  id: 'k-1',
  region: 'fr-par',
  name: 'prod',
  status: 'ready',
  version: '1.31.2',
  upgradeAvailable: false,
  nodes: [node(), node({ id: 'n-2' })],
  ...overrides,
});

describe('clusterStatus', () => {
  it('a ready cluster with every node ready is Healthy', () => {
    expect(clusterStatus(cluster())).toEqual({ health: 'ok', label: 'Healthy' });
  });

  it('a cluster with a node not ready shows Node problem', () => {
    const nodes = [node(), node({ id: 'n-2', status: 'not_ready' })];

    expect(clusterStatus(cluster({ nodes }))).toEqual({ health: 'warning', label: 'Node problem' });
  });

  it('a cluster with a node in creation_error shows Node problem', () => {
    const nodes = [node(), node({ id: 'n-2', status: 'creation_error' })];

    expect(clusterStatus(cluster({ nodes }))).toEqual({ health: 'warning', label: 'Node problem' });
  });

  it('a ready cluster with a node still starting or rebooting stays Healthy', () => {
    const nodes = [node(), node({ id: 'n-2', status: 'creating' }), node({ id: 'n-3', status: 'rebooting' })];

    expect(clusterStatus(cluster({ nodes }))).toEqual({ health: 'ok', label: 'Healthy' });
  });

  it('a ready cluster whose nodes could not load shows Nodes unavailable', () => {
    expect(clusterStatus(cluster({ nodes: null }))).toEqual({ health: 'warning', label: 'Nodes unavailable' });
  });

  it('a cluster in another state keeps its label when its nodes could not load', () => {
    expect(clusterStatus(cluster({ status: 'locked', nodes: null }))).toEqual({ health: 'error', label: 'Locked' });
    expect(clusterStatus(cluster({ status: 'updating', nodes: null }))).toEqual({
      health: 'busy',
      label: 'Updating…',
    });
  });

  it('a cluster that needs a pool shows Needs a node pool', () => {
    expect(clusterStatus(cluster({ status: 'pool_required', nodes: [] }))).toEqual({
      health: 'warning',
      label: 'Needs a node pool',
    });
  });

  it.each([
    ['creating', 'busy', 'Creating…'],
    ['updating', 'busy', 'Updating…'],
    ['deleting', 'busy', 'Deleting…'],
    ['locked', 'error', 'Locked'],
    ['deleted', 'stopped', 'Deleted'],
    ['unknown', 'warning', 'Unknown'],
  ] as const)('%s is %s "%s"', (status, health, label) => {
    expect(clusterStatus(cluster({ status }))).toEqual({ health, label });
  });

  it.each(['new_one', 'constructor'])('maps the unknown status %s to Unknown', (status) => {
    expect(clusterStatus(cluster({ status: status as never }))).toEqual({
      health: 'warning',
      label: 'Unknown',
    });
  });
});

describe('nodeStatus', () => {
  it.each(['new_one', 'constructor'])('maps the unknown status %s to Unknown', (status) => {
    expect(nodeStatus(node({ status: status as never }))).toEqual({ health: 'warning', label: 'Unknown' });
  });

  it.each([
    ['ready', 'ok', 'Ready'],
    ['not_ready', 'warning', 'Not ready'],
    ['creating', 'busy', 'Creating…'],
    ['deleting', 'busy', 'Deleting…'],
    ['locked', 'error', 'Locked'],
    ['creation_error', 'error', 'Failed to start'],
    ['rebooting', 'busy', 'Rebooting…'],
    ['upgrading', 'busy', 'Updating…'],
    ['starting', 'busy', 'Starting…'],
    ['registering', 'busy', 'Setting up…'],
    ['deleted', 'stopped', 'Deleted'],
    ['unknown', 'warning', 'Unknown'],
  ] as const)('%s is %s "%s"', (status, health, label) => {
    expect(nodeStatus(node({ status }))).toEqual({ health, label });
  });
});

describe('availableNodeActions', () => {
  it.each(['ready', 'not_ready', 'creation_error'] as const)('a %s node can reboot or be replaced', (status) => {
    expect(availableNodeActions(node({ status }))).toEqual(['reboot', 'replace']);
  });

  it.each(['creating', 'deleting', 'locked', 'rebooting', 'unknown'] as const)(
    'a %s node offers nothing',
    (status) => {
      expect(availableNodeActions(node({ status }))).toEqual([]);
    },
  );
});

describe('poolStatus', () => {
  it.each([
    ['ready', 'ok', 'Ready'],
    ['scaling', 'busy', 'Scaling…'],
    ['upgrading', 'busy', 'Updating…'],
    ['warning', 'warning', 'Needs attention'],
    ['locked', 'error', 'Locked'],
    ['deleting', 'busy', 'Deleting…'],
    ['something_else', 'warning', 'Unknown'],
    ['constructor', 'warning', 'Unknown'],
  ])('%s is %s "%s"', (status, health, label) => {
    expect(poolStatus({ status })).toEqual({ health, label });
  });
});

describe('clusterToSummary', () => {
  it('a cluster summary counts ready nodes', () => {
    const nodes = [node(), node({ id: 'n-2', status: 'not_ready' }), node({ id: 'n-3' })];

    expect(clusterToSummary(cluster({ nodes }))).toEqual({
      key: 'kubernetes:fr-par:k-1',
      product: 'kubernetes',
      id: 'k-1',
      locality: 'fr-par',
      name: 'prod',
      kindLabel: 'Kubernetes · 1.31.2',
      detail: '2/3 nodes ready',
      health: 'warning',
      statusLabel: 'Node problem',
    });
  });

  it('a cluster with no pools does not crash', () => {
    const summary = clusterToSummary(cluster({ status: 'pool_required', nodes: [] }));

    expect(summary.detail).toBe('0/0 nodes ready');
    expect(summary.statusLabel).toBe('Needs a node pool');
  });

  it('a cluster whose nodes could not load says so instead of a count', () => {
    const summary = clusterToSummary(cluster({ nodes: null }));

    expect(summary).toMatchObject({ detail: 'Nodes unavailable', health: 'warning', statusLabel: 'Nodes unavailable' });
  });
});
