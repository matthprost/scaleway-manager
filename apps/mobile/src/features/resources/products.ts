import {
  clusterToSummary,
  databaseToSummary,
  elasticMetalToSummary,
  instanceToSummary,
  jobToSummary,
  loadBalancerToSummary,
  serverlessToSummary,
} from '@scaleway-manager/core';
import type {
  DatabaseInstance,
  ElasticMetalServer,
  InstanceServer,
  JobDefinition,
  KubernetesCluster,
  LoadBalancer,
  ProductKey,
  ResourceSummary,
  ServerlessApp,
} from '@scaleway-manager/core';
import { queryOptions, skipToken } from '@tanstack/react-query';

import type { Services } from '../../wiring/services';

// Where resources come from: one cached list per source (containers and functions share one)
export type Source =
  | 'instances'
  | 'elastic-metal'
  | 'kubernetes'
  | 'databases'
  | 'serverless'
  | 'jobs'
  | 'load-balancers';

type SourceItem = {
  instances: InstanceServer;
  'elastic-metal': ElasticMetalServer;
  kubernetes: KubernetesCluster;
  databases: DatabaseInstance;
  serverless: ServerlessApp;
  jobs: JobDefinition;
  'load-balancers': LoadBalancer;
};

// What one resource of each product is
export type ProductItem = {
  instances: InstanceServer;
  'elastic-metal': ElasticMetalServer;
  kubernetes: KubernetesCluster;
  databases: DatabaseInstance;
  containers: ServerlessApp;
  functions: ServerlessApp;
  jobs: JobDefinition;
  'load-balancers': LoadBalancer;
};

type SourceSpec<T> = {
  list: (services: Services, projectId: string) => Promise<T[]>;
  toSummary: (item: T) => ResourceSummary;
};

const SOURCES: { [S in Source]: SourceSpec<SourceItem[S]> } = {
  instances: { list: (services, projectId) => services.instances.list(projectId), toSummary: instanceToSummary },
  'elastic-metal': {
    list: (services, projectId) => services.elasticMetal.list(projectId),
    toSummary: elasticMetalToSummary,
  },
  kubernetes: { list: (services, projectId) => services.kubernetes.list(projectId), toSummary: clusterToSummary },
  databases: { list: (services, projectId) => services.databases.list(projectId), toSummary: databaseToSummary },
  serverless: { list: (services, projectId) => services.serverless.list(projectId), toSummary: serverlessToSummary },
  jobs: { list: (services, projectId) => services.jobs.list(projectId), toSummary: jobToSummary },
  'load-balancers': {
    list: (services, projectId) => services.loadBalancers.list(projectId),
    toSummary: loadBalancerToSummary,
  },
};

export const SOURCE_KEYS = Object.keys(SOURCES) as Source[];

type ProductSpec<T> = {
  // The Resources tab's row and the product list's header
  title: string;
  source: Source;
  // One resource, for its own screen
  get: (services: Services, locality: string, id: string) => Promise<T>;
  toSummary: (item: T) => ResourceSummary;
};

// Every product, in the Resources tab's order.
export const PRODUCTS: { [P in ProductKey]: ProductSpec<ProductItem[P]> } = {
  instances: {
    title: 'Instances',
    source: 'instances',
    get: (services, zone, id) => services.instances.get(zone, id),
    toSummary: instanceToSummary,
  },
  'elastic-metal': {
    title: 'Elastic Metal',
    source: 'elastic-metal',
    get: (services, zone, id) => services.elasticMetal.get(zone, id),
    toSummary: elasticMetalToSummary,
  },
  kubernetes: {
    title: 'Kubernetes',
    source: 'kubernetes',
    get: (services, region, id) => services.kubernetes.get(region, id),
    toSummary: clusterToSummary,
  },
  databases: {
    title: 'Databases',
    source: 'databases',
    get: (services, region, id) => services.databases.get(region, id),
    toSummary: databaseToSummary,
  },
  containers: {
    title: 'Serverless containers',
    source: 'serverless',
    get: (services, region, id) => services.serverless.get(region, 'container', id),
    toSummary: serverlessToSummary,
  },
  functions: {
    title: 'Serverless functions',
    source: 'serverless',
    get: (services, region, id) => services.serverless.get(region, 'function', id),
    toSummary: serverlessToSummary,
  },
  jobs: {
    title: 'Jobs',
    source: 'jobs',
    get: (services, region, id) => services.jobs.get(region, id),
    toSummary: jobToSummary,
  },
  'load-balancers': {
    title: 'Load balancers',
    source: 'load-balancers',
    get: (services, zone, id) => services.loadBalancers.get(zone, id),
    toSummary: loadBalancerToSummary,
  },
};

export const PRODUCT_KEYS = Object.keys(PRODUCTS) as ProductKey[];

// A product named in a link: anything else gets a calm message, never a crash
export const isProduct = (value: string | undefined): value is ProductKey =>
  value !== undefined && Object.hasOwn(PRODUCTS, value);

// A resource's query; its parts sit below it (`[...resourceKey(…), 'pings']`), so one invalidation covers them all.
export const resourceKey = (product: ProductKey, locality: string, id: string) =>
  ['resource', product, locality, id] as const;

// A source's lists, for every project
export const sourceKey = (source: Source) => ['resources', source] as const;

// A source's list for the project. The cache keeps the port's domain list (a resource's screen opens from its item);
// the summaries are mapped on the way out. One refresh hits about 40 places, and Home and Resources mount the same
// queries: 30 s of freshness.
export function sourceList<S extends Source>(services: Services, source: S, projectId: string | undefined) {
  const { list, toSummary } = SOURCES[source];

  return queryOptions({
    queryKey: [...sourceKey(source), projectId],
    queryFn: projectId === undefined ? skipToken : () => list(services, projectId),
    staleTime: 30_000,
    select: (items: SourceItem[S][]) => items.map(toSummary),
  });
}
