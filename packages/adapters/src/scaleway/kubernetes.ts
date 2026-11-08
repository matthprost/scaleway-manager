import type {
  KubernetesCluster,
  KubernetesClusterStatus,
  KubernetesNodeStatus,
  KubernetesPort,
} from '@scaleway-manager/core';

import { forEachLocality } from './forEachLocality';
import type { ScalewayHttp } from './http';
import { K8S_REGIONS } from './localities';
import { PAGE_SIZE, paginate } from './paginate';

type ClusterResponse = {
  id: string;
  name: string;
  status: string;
  version: string;
  upgrade_available: boolean;
};

type NodeResponse = {
  id: string;
  pool_id: string;
  name: string;
  status: string;
  error_message?: string | null;
  // Deprecated by Scaleway, and missing on private-network clusters.
  public_ip_v4?: string | null;
};

type PoolResponse = {
  id: string;
  name: string;
  node_type: string;
  size: number;
  min_size: number;
  max_size: number;
  autoscaling: boolean;
  status: string;
  zone: string;
};

// Scaleway's statuses today; a new one becomes 'unknown'.
const CLUSTER_STATUSES: KubernetesClusterStatus[] = [
  'ready',
  'creating',
  'updating',
  'deleting',
  'locked',
  'pool_required',
  'deleted',
  'unknown',
];

const NODE_STATUSES: KubernetesNodeStatus[] = [
  'ready',
  'not_ready',
  'creating',
  'deleting',
  'locked',
  'creation_error',
  'rebooting',
  'upgrading',
  'starting',
  'registering',
  'deleted',
  'unknown',
];

// Region and id can come from a link: encoded so they stay one path segment each.
const regionPath = (region: string) => `/k8s/v1/regions/${encodeURIComponent(region)}`;

const clusterPath = (region: string, id: string) => `${regionPath(region)}/clusters/${encodeURIComponent(id)}`;

export const createScalewayKubernetes = (deps: { http: ScalewayHttp }): KubernetesPort => {
  // Field by field, with every node of the cluster: nothing else from Scaleway's objects is kept.
  const withNodes = async (region: string, cluster: ClusterResponse): Promise<KubernetesCluster> => {
    // A node list that fails to load keeps the cluster, with its nodes unknown (null).
    const nodes = await paginate(async (page) => {
      const data = await deps.http.request<{ nodes: NodeResponse[]; total_count: number }>(
        'GET',
        `${clusterPath(region, cluster.id)}/nodes?page_size=${PAGE_SIZE}&page=${page}`,
      );

      return {
        items: data.nodes.map((node) => ({
          id: node.id,
          poolId: node.pool_id,
          name: node.name,
          status: NODE_STATUSES.find((status) => status === node.status) ?? 'unknown',
          errorMessage: node.error_message ?? null,
          publicIpv4: node.public_ip_v4 ?? null,
        })),
        total: data.total_count,
      };
    }).catch(() => null);

    return {
      id: cluster.id,
      region,
      name: cluster.name,
      status: CLUSTER_STATUSES.find((status) => status === cluster.status) ?? 'unknown',
      version: cluster.version,
      upgradeAvailable: cluster.upgrade_available,
      nodes,
    };
  };

  return {
    list(projectId) {
      return forEachLocality(K8S_REGIONS, async (region) => {
        const clusters = await paginate(async (page) => {
          const data = await deps.http.request<{ clusters: ClusterResponse[]; total_count: number }>(
            'GET',
            `${regionPath(region)}/clusters?project_id=${projectId}&page_size=${PAGE_SIZE}&page=${page}`,
          );

          return { items: data.clusters, total: data.total_count };
        });

        return Promise.all(clusters.map((cluster) => withNodes(region, cluster)));
      });
    },

    async get(region, id) {
      // This answer is the cluster itself, not wrapped.
      return withNodes(region, await deps.http.request<ClusterResponse>('GET', clusterPath(region, id)));
    },

    pools(region, clusterId) {
      return paginate(async (page) => {
        const data = await deps.http.request<{ pools: PoolResponse[]; total_count: number }>(
          'GET',
          `${clusterPath(region, clusterId)}/pools?page_size=${PAGE_SIZE}&page=${page}`,
        );

        return {
          items: data.pools.map((pool) => ({
            id: pool.id,
            name: pool.name,
            nodeType: pool.node_type,
            size: pool.size,
            minSize: pool.min_size,
            maxSize: pool.max_size,
            autoscaling: pool.autoscaling,
            status: pool.status,
            zone: pool.zone,
          })),
          total: data.total_count,
        };
      });
    },

    async actOnNode(region, nodeId, action) {
      await deps.http.request('POST', `${regionPath(region)}/nodes/${encodeURIComponent(nodeId)}/${action}`, {});
    },
  };
};
