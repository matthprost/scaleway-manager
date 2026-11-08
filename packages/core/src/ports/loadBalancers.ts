import type { LoadBalancer } from '../domain/loadBalancers';

export type LoadBalancersPort = {
  list(projectId: string): Promise<LoadBalancer[]>;
  get(zone: string, id: string): Promise<LoadBalancer>;
};
