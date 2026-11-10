import type {
  ClockPort,
  KubernetesCluster,
  KubernetesNode,
  KubernetesNodeAction,
  KubernetesNodeStatus,
  KubernetesPool,
  KubernetesPort,
} from '@scaleway-manager/core';

import { createStateBook, notFound } from './transitions';

const CLUSTER_ID = 'demo-k8s-main';
const POOL_ID = 'demo-pool-default';
const REGION = 'fr-par';
const NODE_IDS = ['demo-node-1', 'demo-node-2', 'demo-node-3'];

const PHASES: Record<KubernetesNodeAction, KubernetesNodeStatus> = {
  reboot: 'rebooting',
  replace: 'creating',
};

export const createDemoKubernetes = (clock: ClockPort): KubernetesPort => {
  const book = createStateBook<KubernetesNodeStatus>(
    clock,
    Object.fromEntries(NODE_IDS.map((id) => [id, 'ready' as const])),
  );

  const nodes = (): KubernetesNode[] =>
    NODE_IDS.map((id, index) => ({
      id,
      poolId: POOL_ID,
      name: `scw-k8s-main-default-${['a1b2', 'c3d4', 'e5f6'][index] ?? index}`,
      status: book.get(id) ?? 'ready',
      errorMessage: null,
      publicIpv4: `198.51.100.${40 + index}`,
    }));

  const cluster = (): KubernetesCluster => ({
    id: CLUSTER_ID,
    region: REGION,
    name: 'k8s-main',
    status: 'ready',
    version: '1.33',
    upgradeAvailable: true,
    nodes: nodes(),
  });

  const check = (region: string, id: string): void => {
    if (region !== REGION || id !== CLUSTER_ID) {
      throw notFound();
    }
  };

  return {
    list: async (projectId) => (projectId === 'demo-prod' ? [cluster()] : []),
    get: async (region, id) => {
      check(region, id);

      return cluster();
    },
    pools: async (region, clusterId): Promise<KubernetesPool[]> => {
      check(region, clusterId);

      return [
        {
          id: POOL_ID,
          name: 'default',
          nodeType: 'PRO2-S',
          size: 3,
          minSize: 3,
          maxSize: 3,
          autoscaling: false,
          status: 'ready',
          zone: 'fr-par-1',
        },
      ];
    },
    actOnNode: async (region, nodeId, action) => {
      if (region !== REGION || !NODE_IDS.includes(nodeId)) {
        throw notFound();
      }
      book.start(nodeId, PHASES[action], 'ready');
    },
  };
};
