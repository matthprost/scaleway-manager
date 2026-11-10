import type { KubernetesCluster, KubernetesNodeAction, KubernetesPool } from '../domain/kubernetes';

export type KubernetesPort = {
  list(projectId: string): Promise<KubernetesCluster[]>;
  get(region: string, id: string): Promise<KubernetesCluster>;
  pools(region: string, clusterId: string): Promise<KubernetesPool[]>;
  actOnNode(region: string, nodeId: string, action: KubernetesNodeAction): Promise<void>;
};
