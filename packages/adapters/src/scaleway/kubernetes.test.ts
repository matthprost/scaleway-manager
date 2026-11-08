import { AppError } from '@scaleway-manager/core';

import { createScalewayKubernetes } from './kubernetes';
import { fakeHttp } from './testing/fakeHttp';

const REGIONS = ['fr-par', 'nl-ams', 'pl-waw', 'it-mil'];

const clustersPath = (region: string) => `/k8s/v1/regions/${region}/clusters?project_id=p-1&page_size=100&page=1`;

const nodesPath = (region: string, clusterId: string, page = 1) =>
  `/k8s/v1/regions/${region}/clusters/${clusterId}/nodes?page_size=100&page=${page}`;

// The Kubernetes API's cluster, with fields the app never keeps.
const cluster = (id: string, status: string, fields: Record<string, unknown> = {}) => ({
  id,
  type: 'kapsule',
  name: `k8s-${id}`,
  status,
  version: '1.31.2',
  region: 'fr-par',
  organization_id: 'org-1',
  project_id: 'p-1',
  tags: [],
  cni: 'cilium',
  description: '',
  cluster_url: `https://${id}.api.k8s.fr-par.scw.cloud:6443`,
  dns_wildcard: `*.${id}.nodes.k8s.fr-par.scw.cloud`,
  created_at: '2026-09-01T08:00:00Z',
  updated_at: '2026-11-01T10:00:00Z',
  autoscaler_config: { scale_down_disabled: false },
  auto_upgrade: { enabled: false },
  upgrade_available: false,
  feature_gates: [],
  admission_plugins: [],
  open_id_connect_config: null,
  apiserver_cert_sans: [],
  private_network_id: null,
  commitment_ends_at: null,
  iam_nodes_group_id: 'group-1',
  ...fields,
});

// The API's node; `public_ip_v4` is deprecated and left out unless a test sets it.
const node = (id: string, status: string, fields: Record<string, unknown> = {}) => ({
  id,
  pool_id: 'pool-1',
  cluster_id: 'c-1',
  provider_id: `scaleway://instance/fr-par-1/${id}`,
  region: 'fr-par',
  name: `scw-k8s-${id}`,
  conditions: {},
  status,
  error_message: null,
  created_at: '2026-09-01T08:05:00Z',
  updated_at: '2026-11-01T10:00:00Z',
  ...fields,
});

// Answers by path; anything left out answers with an empty list.
const setup = (answers: Record<string, unknown>) => {
  const { request, http } = fakeHttp(answers, { clusters: [], nodes: [], pools: [], total_count: 0 });

  return { request, kubernetes: createScalewayKubernetes({ http }) };
};

test('clusters come with their nodes', async () => {
  const { request, kubernetes } = setup({
    [clustersPath('fr-par')]: {
      clusters: [cluster('c-1', 'ready', { name: 'k8s-main', upgrade_available: true })],
      total_count: 1,
    },
    [clustersPath('nl-ams')]: { clusters: [cluster('c-2', 'pool_required', { region: 'nl-ams' })], total_count: 1 },
    [nodesPath('fr-par', 'c-1')]: {
      nodes: [
        node('n-1', 'ready', { public_ip_v4: '51.159.40.10' }),
        node('n-2', 'creation_error', { pool_id: 'pool-2', error_message: 'Out of stock' }),
      ],
      total_count: 2,
    },
  });

  const list = await kubernetes.list('p-1');

  expect(list).toEqual([
    {
      id: 'c-1',
      region: 'fr-par',
      name: 'k8s-main',
      status: 'ready',
      version: '1.31.2',
      upgradeAvailable: true,
      nodes: [
        {
          id: 'n-1',
          poolId: 'pool-1',
          name: 'scw-k8s-n-1',
          status: 'ready',
          errorMessage: null,
          publicIpv4: '51.159.40.10',
        },
        {
          id: 'n-2',
          poolId: 'pool-2',
          name: 'scw-k8s-n-2',
          status: 'creation_error',
          errorMessage: 'Out of stock',
          publicIpv4: null,
        },
      ],
    },
    {
      id: 'c-2',
      region: 'nl-ams',
      name: 'k8s-c-2',
      status: 'pool_required',
      version: '1.31.2',
      upgradeAvailable: false,
      nodes: [],
    },
  ]);
  const calls = [
    ...REGIONS.map((region) => ['GET', clustersPath(region)]),
    ['GET', nodesPath('fr-par', 'c-1')],
    ['GET', nodesPath('nl-ams', 'c-2')],
  ];
  expect(request.mock.calls).toEqual(expect.arrayContaining(calls));
  expect(request.mock.calls).toHaveLength(calls.length);
});

test('every node of a cluster is loaded', async () => {
  // A cluster can have more than 100 nodes.
  const { request, kubernetes } = setup({
    [clustersPath('fr-par')]: { clusters: [cluster('c-1', 'ready')], total_count: 1 },
    [nodesPath('fr-par', 'c-1', 1)]: {
      nodes: Array.from({ length: 100 }, (_, i) => node(`n-${i}`, 'ready')),
      total_count: 101,
    },
    [nodesPath('fr-par', 'c-1', 2)]: { nodes: [node('n-100', 'ready')], total_count: 101 },
  });

  const [item] = await kubernetes.list('p-1');

  expect(item?.nodes).toHaveLength(101);
  expect(request.mock.calls.filter(([, path]) => path.includes('/nodes'))).toEqual([
    ['GET', nodesPath('fr-par', 'c-1', 1)],
    ['GET', nodesPath('fr-par', 'c-1', 2)],
  ]);
});

test('states Scaleway adds later become unknown', async () => {
  const clusterStates = ['ready', 'creating', 'updating', 'deleting', 'locked', 'pool_required', 'deleted', 'paused'];
  const nodeStates = [
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
    'sleeping',
  ];
  const { kubernetes } = setup({
    [clustersPath('fr-par')]: {
      clusters: clusterStates.map((status, i) => cluster(`c-${i}`, status)),
      total_count: clusterStates.length,
    },
    [nodesPath('fr-par', 'c-0')]: {
      nodes: nodeStates.map((status, i) => node(`n-${i}`, status)),
      total_count: nodeStates.length,
    },
  });

  const list = await kubernetes.list('p-1');

  expect(list.map((item) => item.status)).toEqual([...clusterStates.slice(0, -1), 'unknown']);
  expect(list[0]?.nodes?.map((item) => item.status)).toEqual([...nodeStates.slice(0, -1), 'unknown']);
});

test('regions that fail are left out', async () => {
  const { kubernetes } = setup({
    [clustersPath('fr-par')]: new AppError('forbidden', 'Forbidden', 403),
    [clustersPath('nl-ams')]: new AppError('server', 'Internal error', 500),
    [clustersPath('pl-waw')]: { clusters: [cluster('c-3', 'ready', { region: 'pl-waw' })], total_count: 1 },
  });

  const list = await kubernetes.list('p-1');

  expect(list.map((item) => [item.region, item.id])).toEqual([['pl-waw', 'c-3']]);
});

test('a cluster whose nodes fail to load is still listed', async () => {
  // Its nodes are unknown (null), not an empty list that would read "0/0 nodes ready".
  const { kubernetes } = setup({
    [clustersPath('fr-par')]: { clusters: [cluster('c-1', 'ready'), cluster('c-2', 'ready')], total_count: 2 },
    [nodesPath('fr-par', 'c-1')]: new AppError('server', 'Internal error', 500),
    [nodesPath('fr-par', 'c-2')]: { nodes: [node('n-1', 'ready')], total_count: 1 },
    '/k8s/v1/regions/fr-par/clusters/c-1': cluster('c-1', 'ready'),
  });

  const list = await kubernetes.list('p-1');
  const item = await kubernetes.get('fr-par', 'c-1');

  expect(list.map((entry) => [entry.id, entry.nodes?.length ?? null])).toEqual([
    ['c-1', null],
    ['c-2', 1],
  ]);
  expect(item).toMatchObject({ id: 'c-1', nodes: null });
});

test('a cluster is read from its region with its nodes', async () => {
  // This answer is the cluster itself, not wrapped.
  const { request, kubernetes } = setup({
    '/k8s/v1/regions/nl-ams/clusters/c-9': cluster('c-9', 'updating', { region: 'nl-ams' }),
    [nodesPath('nl-ams', 'c-9')]: { nodes: [node('n-1', 'upgrading')], total_count: 1 },
  });

  const item = await kubernetes.get('nl-ams', 'c-9');

  expect(item).toMatchObject({ id: 'c-9', region: 'nl-ams', status: 'updating', nodes: [{ status: 'upgrading' }] });
  expect(request.mock.calls).toEqual([
    ['GET', '/k8s/v1/regions/nl-ams/clusters/c-9'],
    ['GET', nodesPath('nl-ams', 'c-9')],
  ]);
});

test('pools are read for a cluster', async () => {
  const { request, kubernetes } = setup({
    '/k8s/v1/regions/fr-par/clusters/c-1/pools?page_size=100&page=1': {
      pools: [
        {
          id: 'pool-1',
          cluster_id: 'c-1',
          created_at: '2026-09-01T08:00:00Z',
          updated_at: '2026-11-01T10:00:00Z',
          name: 'default',
          status: 'scaling',
          version: '1.31.2',
          node_type: 'pro2_xxs',
          autoscaling: true,
          size: 3,
          min_size: 1,
          max_size: 5,
          container_runtime: 'containerd',
          autohealing: true,
          tags: [],
          placement_group_id: null,
          kubelet_args: {},
          upgrade_policy: { max_unavailable: 1, max_surge: 0 },
          zone: 'fr-par-1',
          root_volume_type: 'sbs_5k',
          root_volume_size: 20_000_000_000,
          public_ip_disabled: false,
          region: 'fr-par',
        },
      ],
      total_count: 1,
    },
  });

  const pools = await kubernetes.pools('fr-par', 'c-1');

  expect(pools).toEqual([
    {
      id: 'pool-1',
      name: 'default',
      nodeType: 'pro2_xxs',
      size: 3,
      minSize: 1,
      maxSize: 5,
      autoscaling: true,
      status: 'scaling',
      zone: 'fr-par-1',
    },
  ]);
  expect(request.mock.calls).toEqual([['GET', '/k8s/v1/regions/fr-par/clusters/c-1/pools?page_size=100&page=1']]);
});

test('node reboot and replace call the node endpoints', async () => {
  const { request, kubernetes } = setup({});

  await kubernetes.actOnNode('fr-par', 'n-1', 'reboot');
  await kubernetes.actOnNode('fr-par', 'n-1', 'replace');

  expect(request.mock.calls).toStrictEqual([
    ['POST', '/k8s/v1/regions/fr-par/nodes/n-1/reboot', {}],
    ['POST', '/k8s/v1/regions/fr-par/nodes/n-1/replace', {}],
  ]);
});

test('ids from a link stay one path segment', async () => {
  // A crafted link can't walk the path to another endpoint.
  const { request, kubernetes } = setup({});

  await kubernetes.actOnNode('fr-par', '../clusters/c-1', 'reboot');
  await kubernetes.pools('fr-par', '../../nodes');

  expect(request.mock.calls).toStrictEqual([
    ['POST', '/k8s/v1/regions/fr-par/nodes/..%2Fclusters%2Fc-1/reboot', {}],
    ['GET', '/k8s/v1/regions/fr-par/clusters/..%2F..%2Fnodes/pools?page_size=100&page=1'],
  ]);
});
