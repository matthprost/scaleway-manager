import { AppError } from '@scaleway-manager/core';

import { createScalewayDatabases } from './databases';
import { fakeHttp } from './testing/fakeHttp';

const REGIONS = ['fr-par', 'nl-ams', 'pl-waw'];

const instancesPath = (region: string) => `/rdb/v1/regions/${region}/instances?project_id=p-1&page_size=100&page=1`;

// Metrics are asked for one day: the dates go in the query as ISO strings.
const SINCE = new Date('2026-11-06T10:00:00Z');
const UNTIL = new Date('2026-11-07T10:00:00Z');

const metricsPath = (id: string) =>
  `/rdb/v1/regions/fr-par/instances/${id}/metrics` +
  '?start_date=2026-11-06T10:00:00.000Z&end_date=2026-11-07T10:00:00.000Z';

// The public endpoint: Scaleway sets `load_balancer` to an empty object.
const publicEndpoint = (fields: Record<string, unknown> = {}) => ({
  id: 'e-1',
  ip: '51.159.30.40',
  port: 5432,
  name: null,
  load_balancer: {},
  ...fields,
});

const privateEndpoint = (fields: Record<string, unknown> = {}) => ({
  id: 'e-2',
  ip: '192.168.1.4',
  port: 5432,
  name: null,
  private_network: { private_network_id: 'pn-1', service_ip: '192.168.1.4/24', zone: 'fr-par-1' },
  ...fields,
});

// The Database API's instance, with fields the app never keeps.
const instance = (id: string, fields: Record<string, unknown> = {}) => ({
  created_at: '2026-09-01T08:00:00Z',
  volume: { type: 'sbs_5k', size: 10_000_000_000, class: 'sbs' },
  region: 'fr-par',
  id,
  name: `db-${id}`,
  organization_id: 'org-1',
  project_id: 'p-1',
  status: 'ready',
  engine: 'PostgreSQL-16',
  upgradable_version: [],
  endpoint: { id: 'e-1', ip: '51.159.30.40', port: 5432, name: null, load_balancer: {} },
  tags: [],
  settings: [{ name: 'max_connections', value: '100' }],
  backup_schedule: { frequency: 24, retention: 7, disabled: false, next_run_at: '2026-11-08T00:00:00Z' },
  is_ha_cluster: false,
  read_replicas: [],
  node_type: 'db-dev-s',
  init_settings: [],
  endpoints: [publicEndpoint()],
  logs_policy: { max_age_retention: 30, total_disk_retention: null },
  backup_same_region: false,
  maintenances: [],
  encryption: { enabled: false },
  ...fields,
});

// Answers by path; anything left out answers with an empty list.
const setup = (answers: Record<string, unknown>) => {
  const { request, http } = fakeHttp(answers, { instances: [], databases: [], database_backups: [], total_count: 0 });

  return { request, databases: createScalewayDatabases({ http }) };
};

test('databases are listed across regions for the project', async () => {
  const { request, databases } = setup({
    [instancesPath('fr-par')]: { instances: [instance('db-1', { name: 'db-main' })], total_count: 1 },
    [instancesPath('pl-waw')]: {
      instances: [
        instance('db-2', {
          region: 'pl-waw',
          engine: 'MySQL-8',
          status: 'backuping',
          node_type: 'db-gp-xs',
          is_ha_cluster: true,
          endpoints: [publicEndpoint({ ip: '151.115.1.2', port: 3306 })],
        }),
      ],
      total_count: 1,
    },
  });

  const list = await databases.list('p-1');

  expect(list).toEqual([
    {
      id: 'db-1',
      region: 'fr-par',
      name: 'db-main',
      engine: 'PostgreSQL-16',
      status: 'ready',
      nodeType: 'db-dev-s',
      endpoint: '51.159.30.40:5432',
      isHa: false,
    },
    {
      id: 'db-2',
      region: 'pl-waw',
      name: 'db-db-2',
      engine: 'MySQL-8',
      status: 'backuping',
      nodeType: 'db-gp-xs',
      endpoint: '151.115.1.2:3306',
      isHa: true,
    },
  ]);
  expect(request.mock.calls).toEqual(REGIONS.map((region) => ['GET', instancesPath(region)]));
});

test('database endpoint is ip:port', async () => {
  // An endpoint has an IP or a hostname, never both.
  const { databases } = setup({
    [instancesPath('fr-par')]: {
      instances: [
        instance('db-1', { endpoints: [publicEndpoint({ port: 1234 })] }),
        instance('db-2', {
          endpoints: [publicEndpoint({ ip: undefined, hostname: 'db-2.rdb.fr-par.scw.cloud', port: 5432 })],
        }),
      ],
      total_count: 2,
    },
  });

  const list = await databases.list('p-1');

  expect(list.map((item) => item.endpoint)).toEqual(['51.159.30.40:1234', 'db-2.rdb.fr-par.scw.cloud:5432']);
});

test('the public endpoint comes before a private one', async () => {
  const { databases } = setup({
    [instancesPath('fr-par')]: {
      instances: [
        instance('db-1', { endpoints: [privateEndpoint(), publicEndpoint({ port: 4321 })] }),
        instance('db-2', { endpoints: [privateEndpoint()] }),
        // Still being created.
        instance('db-3', { status: 'provisioning', endpoints: [] }),
        instance('db-4', { status: 'provisioning', endpoints: null }),
      ],
      total_count: 4,
    },
  });

  const list = await databases.list('p-1');

  expect(list.map((item) => item.endpoint)).toEqual(['51.159.30.40:4321', '192.168.1.4:5432', null, null]);
});

test('regions that fail are left out', async () => {
  const { databases } = setup({
    [instancesPath('fr-par')]: new AppError('forbidden', 'Forbidden', 403),
    [instancesPath('nl-ams')]: new AppError('server', 'Internal error', 500),
    [instancesPath('pl-waw')]: { instances: [instance('db-3', { region: 'pl-waw' })], total_count: 1 },
  });

  const list = await databases.list('p-1');

  expect(list.map((item) => [item.region, item.id])).toEqual([['pl-waw', 'db-3']]);
});

test('a database is read from its region', async () => {
  // This answer is the instance itself, not wrapped.
  const { request, databases } = setup({
    '/rdb/v1/regions/nl-ams/instances/db-9': instance('db-9', { region: 'nl-ams', status: 'restarting' }),
  });

  const item = await databases.get('nl-ams', 'db-9');

  expect(item).toMatchObject({ id: 'db-9', region: 'nl-ams', status: 'restarting', endpoint: '51.159.30.40:5432' });
  expect(request.mock.calls).toEqual([['GET', '/rdb/v1/regions/nl-ams/instances/db-9']]);
});

test('metrics keep cpu, memory and disk series', async () => {
  const points: [string, number][] = [
    ['2026-11-06T10:00:00Z', 12.5],
    ['2026-11-06T10:05:00Z', 30],
  ];
  const { request, databases } = setup({
    [metricsPath('db-1')]: {
      timeseries: [
        { name: 'cpu_usage_percent', points, metadata: { node: 'db-1-0' } },
        { name: 'connections', points, metadata: { node: 'db-1-0' } },
        { name: 'mem_usage_percent', points: [['2026-11-06T10:00:00Z', 61]], metadata: { node: 'db-1-0' } },
        { name: 'total_disk_usage_percent', points: [['2026-11-06T10:00:00Z', 38]], metadata: { node: 'db-1-0' } },
      ],
    },
  });

  const series = await databases.metrics('fr-par', 'db-1', SINCE, UNTIL);

  expect(series).toEqual([
    {
      metric: 'cpu',
      unit: '%',
      points: [
        { at: '2026-11-06T10:00:00Z', value: 12.5 },
        { at: '2026-11-06T10:05:00Z', value: 30 },
      ],
    },
    { metric: 'memory', unit: '%', points: [{ at: '2026-11-06T10:00:00Z', value: 61 }] },
    { metric: 'disk', unit: '%', points: [{ at: '2026-11-06T10:00:00Z', value: 38 }] },
  ]);
  expect(request.mock.calls).toEqual([['GET', metricsPath('db-1')]]);
});

test('a metric with one series per node keeps the first', async () => {
  // A highly available instance has two nodes.
  const { databases } = setup({
    [metricsPath('db-1')]: {
      timeseries: [
        { name: 'cpu_usage_percent', points: [['2026-11-06T10:00:00Z', 12]], metadata: { node: 'db-1-0' } },
        { name: 'cpu_usage_percent', points: [['2026-11-06T10:00:00Z', 3]], metadata: { node: 'db-1-1' } },
        { name: 'mem_usage_percent', points: [['2026-11-06T10:00:00Z', 61]], metadata: { node: 'db-1-0' } },
        { name: 'mem_usage_percent', points: [['2026-11-06T10:00:00Z', 40]], metadata: { node: 'db-1-1' } },
      ],
    },
  });

  const series = await databases.metrics('fr-par', 'db-1', SINCE, UNTIL);

  expect(series.map((item) => [item.metric, item.points[0]?.value])).toEqual([
    ['cpu', 12],
    ['memory', 61],
  ]);
});

test('a series whose name does not say percent is dropped', async () => {
  // The API gives no unit: only a name ending in percent is charted as %.
  const { databases } = setup({
    [metricsPath('db-1')]: {
      timeseries: [
        { name: 'cpu_seconds_total', points: [['2026-11-06T10:00:00Z', 5_000]], metadata: {} },
        { name: 'total_disk_usage_bytes', points: [['2026-11-06T10:00:00Z', 4_000_000_000]], metadata: {} },
        { name: 'total_disk_usage_percent', points: [['2026-11-06T10:00:00Z', 38]], metadata: {} },
        { name: 'mem_usage_bytes', points: [['2026-11-06T10:00:00Z', 2_000_000_000]], metadata: {} },
      ],
    },
  });

  const series = await databases.metrics('fr-par', 'db-1', SINCE, UNTIL);

  expect(series).toEqual([{ metric: 'disk', unit: '%', points: [{ at: '2026-11-06T10:00:00Z', value: 38 }] }]);
});

test('missing series and points become empty lists', async () => {
  const { databases } = setup({
    [metricsPath('db-1')]: { timeseries: null },
    [metricsPath('db-2')]: { timeseries: [{ name: 'cpu_usage_percent', points: null, metadata: {} }] },
  });

  await expect(databases.metrics('fr-par', 'db-1', SINCE, UNTIL)).resolves.toEqual([]);
  await expect(databases.metrics('fr-par', 'db-2', SINCE, UNTIL)).resolves.toEqual([
    { metric: 'cpu', unit: '%', points: [] },
  ]);
});

test('backups are the newest 20', async () => {
  const path = '/rdb/v1/regions/fr-par/backups?instance_id=db-1&order_by=created_at_desc&page_size=20';
  const { request, databases } = setup({
    [path]: {
      database_backups: [
        {
          id: 'b-2',
          instance_id: 'db-1',
          database_name: 'app',
          name: 'app-2026-11-07-1405',
          status: 'creating',
          size: null,
          expires_at: null,
          created_at: '2026-11-07T14:05:00Z',
          updated_at: '2026-11-07T14:05:00Z',
          instance_name: 'db-main',
          download_url: null,
          download_url_expires_at: null,
          region: 'fr-par',
          same_region: false,
        },
        {
          id: 'b-1',
          instance_id: 'db-1',
          database_name: 'analytics',
          name: 'analytics-2026-11-06-0300',
          status: 'ready',
          size: 412_000_000,
          expires_at: '2026-12-06T03:00:00Z',
          created_at: '2026-11-06T03:00:00Z',
          updated_at: '2026-11-06T03:02:00Z',
          instance_name: 'db-main',
          download_url: 'https://s3.fr-par.scw.cloud/secret-link',
          download_url_expires_at: '2026-11-07T03:00:00Z',
          region: 'fr-par',
          same_region: false,
        },
      ],
      total_count: 31,
    },
  });

  const backups = await databases.backups('fr-par', 'db-1');

  expect(backups).toEqual([
    {
      id: 'b-2',
      name: 'app-2026-11-07-1405',
      databaseName: 'app',
      status: 'creating',
      sizeBytes: null,
      createdAt: '2026-11-07T14:05:00Z',
      expiresAt: null,
    },
    {
      id: 'b-1',
      name: 'analytics-2026-11-06-0300',
      databaseName: 'analytics',
      status: 'ready',
      sizeBytes: 412_000_000,
      createdAt: '2026-11-06T03:00:00Z',
      expiresAt: '2026-12-06T03:00:00Z',
    },
  ]);
  expect(request.mock.calls).toEqual([['GET', path]]);
});

test('database names keep every database', async () => {
  // `managed` means created through Scaleway, not a system database: those are the user's own.
  const path = '/rdb/v1/regions/fr-par/instances/db-1/databases?skip_size_retrieval=true&page_size=100&page=1';
  const { request, databases } = setup({
    [path]: {
      databases: [
        { name: 'rdb', owner: '_rdb_superadmin', managed: true, size: 0 },
        { name: 'app', owner: 'app', managed: true, size: 0 },
        { name: 'analytics', owner: 'analytics', managed: false, size: 0 },
      ],
      total_count: 3,
    },
  });

  const names = await databases.databaseNames('fr-par', 'db-1');

  expect(names).toEqual(['rdb', 'app', 'analytics']);
  expect(request.mock.calls).toEqual([['GET', path]]);
});

test('restart posts to the instance', async () => {
  const { request, databases } = setup({});

  await databases.restart('fr-par', 'db-1');

  expect(request.mock.calls).toStrictEqual([['POST', '/rdb/v1/regions/fr-par/instances/db-1/restart', {}]]);
});

test('a backup sends database, name and expiry', async () => {
  const { request, databases } = setup({});

  await databases.backup('fr-par', 'db-1', {
    databaseName: 'app',
    name: 'app-2026-11-07-1405',
    expiresAt: '2026-12-07T14:05:00.000Z',
  });

  expect(request.mock.calls).toStrictEqual([
    [
      'POST',
      '/rdb/v1/regions/fr-par/backups',
      {
        instance_id: 'db-1',
        database_name: 'app',
        name: 'app-2026-11-07-1405',
        expires_at: '2026-12-07T14:05:00.000Z',
      },
    ],
  ]);
});

test('ids from a link stay one path segment', async () => {
  // A crafted link can't walk the path to another endpoint.
  const { request, databases } = setup({});

  await databases.restart('fr-par', '../../backups');
  await databases.backups('fr-par', 'db-1&page_size=100');

  expect(request.mock.calls).toStrictEqual([
    ['POST', '/rdb/v1/regions/fr-par/instances/..%2F..%2Fbackups/restart', {}],
    ['GET', '/rdb/v1/regions/fr-par/backups?instance_id=db-1%26page_size%3D100&order_by=created_at_desc&page_size=20'],
  ]);
});
