import { AppError } from '@scaleway-manager/core';

import { createScalewayLoadBalancers } from './loadBalancers';
import { fakeHttp } from './testing/fakeHttp';

const ZONES = ['fr-par-1', 'fr-par-2', 'nl-ams-1', 'nl-ams-2', 'nl-ams-3', 'pl-waw-1', 'pl-waw-2', 'pl-waw-3'];

const lbsPath = (zone: string, page = 1) => `/lb/v1/zones/${zone}/lbs?project_id=p-1&page_size=100&page=${page}`;

const backendsPath = (zone: string, id: string, page = 1) =>
  `/lb/v1/zones/${zone}/lbs/${id}/backends?page_size=100&page=${page}`;

const statsPath = (zone: string, id: string, page = 1) =>
  `/lb/v1/zones/${zone}/lbs/${id}/backend-stats?page_size=100&page=${page}`;

// The Load Balancer API's object, with fields the app never keeps.
const lb = (id: string, fields: Record<string, unknown> = {}) => ({
  id,
  name: `lb-${id}`,
  description: '',
  status: 'ready',
  instances: [{ id: 'node-1', status: 'ready', ip_address: '10.0.0.1', zone: 'fr-par-1' }],
  organization_id: 'org-1',
  project_id: 'p-1',
  ip: [{ id: 'ip-1', ip_address: '51.159.10.10', reverse: 'lb.example.com', zone: 'fr-par-1' }],
  ipam_ips: [],
  tags: [],
  frontend_count: 1,
  backend_count: 2,
  type: 'lb-s',
  subscriber: null,
  ssl_compatibility_level: 'ssl_compatibility_level_intermediate',
  created_at: '2026-09-01T08:00:00Z',
  updated_at: '2026-11-01T10:00:00Z',
  private_network_count: 0,
  route_count: 0,
  zone: 'fr-par-1',
  ...fields,
});

const backend = (id: string, name: string) => ({
  id,
  name,
  forward_protocol: 'http',
  forward_port: 80,
  forward_port_algorithm: 'roundrobin',
  sticky_sessions: 'none',
  health_check: { port: 80, check_delay: 3000, check_max_retries: 2 },
  pool: ['10.64.0.12', '10.64.0.21'],
  on_marked_down_action: 'on_marked_down_action_none',
  zone: 'fr-par-1',
});

// One load balancer node's view of one backend server.
const stat = (backendId: string, ip: string, fields: Record<string, unknown> = {}) => ({
  instance_id: 'node-1',
  backend_id: backendId,
  ip,
  server_state: 'running',
  server_state_changed_at: '2026-11-05T10:00:00Z',
  last_health_check_status: 'passed',
  ...fields,
});

// Answers by path; anything left out answers with an empty list.
const setup = (answers: Record<string, unknown>) => {
  const { request, http } = fakeHttp(answers, { lbs: [], backends: [], backend_servers_stats: [], total_count: 0 });

  return { request, loadBalancers: createScalewayLoadBalancers({ http }) };
};

test('backend health joins names and stats', async () => {
  const { request, loadBalancers } = setup({
    [lbsPath('fr-par-1')]: { lbs: [lb('lb-1', { name: 'lb-web' })], total_count: 1 },
    [lbsPath('nl-ams-1')]: { lbs: [lb('lb-2', { status: 'pending', ip: [], zone: 'nl-ams-1' })], total_count: 1 },
    [backendsPath('fr-par-1', 'lb-1')]: {
      backends: [backend('b-1', 'web-http'), backend('b-2', 'api-http')],
      total_count: 2,
    },
    [statsPath('fr-par-1', 'lb-1')]: {
      backend_servers_stats: [
        stat('b-1', '10.64.0.12'),
        stat('b-2', '10.64.0.21', { server_state: 'stopped', last_health_check_status: 'failed' }),
        stat('b-2', '10.64.0.22', {
          server_state: 'starting',
          server_state_changed_at: null,
          last_health_check_status: 'unknown',
        }),
      ],
      total_count: 3,
    },
  });

  const list = await loadBalancers.list('p-1');

  expect(list).toEqual([
    {
      id: 'lb-1',
      zone: 'fr-par-1',
      name: 'lb-web',
      status: 'ready',
      ip: '51.159.10.10',
      backends: [
        { backendId: 'b-1', backendName: 'web-http', ip: '10.64.0.12', state: 'up', changedAt: '2026-11-05T10:00:00Z' },
        {
          backendId: 'b-2',
          backendName: 'api-http',
          ip: '10.64.0.21',
          state: 'down',
          changedAt: '2026-11-05T10:00:00Z',
        },
        { backendId: 'b-2', backendName: 'api-http', ip: '10.64.0.22', state: 'checking', changedAt: null },
      ],
    },
    { id: 'lb-2', zone: 'nl-ams-1', name: 'lb-lb-2', status: 'pending', ip: null, backends: [] },
  ]);
  const calls = [
    ...ZONES.map((zone) => ['GET', lbsPath(zone)]),
    ['GET', backendsPath('fr-par-1', 'lb-1')],
    ['GET', statsPath('fr-par-1', 'lb-1')],
    ['GET', backendsPath('nl-ams-1', 'lb-2')],
    ['GET', statsPath('nl-ams-1', 'lb-2')],
  ];
  expect(request.mock.calls).toEqual(expect.arrayContaining(calls));
  expect(request.mock.calls).toHaveLength(calls.length);
});

test('a server seen by several load balancer nodes is one row, the worst state first', async () => {
  const { loadBalancers } = setup({
    '/lb/v1/zones/fr-par-1/lbs/lb-1': lb('lb-1'),
    [backendsPath('fr-par-1', 'lb-1')]: { backends: [backend('b-1', 'web-http')], total_count: 1 },
    [statsPath('fr-par-1', 'lb-1')]: {
      backend_servers_stats: [
        // Up on one node, down on the other: down.
        stat('b-1', '10.64.0.1'),
        stat('b-1', '10.64.0.1', { instance_id: 'node-2', last_health_check_status: 'failed' }),
        // Checking beats up.
        stat('b-1', '10.64.0.2', { last_health_check_status: 'neutral' }),
        stat('b-1', '10.64.0.2', { instance_id: 'node-2' }),
        // The same state on both: the latest change.
        stat('b-1', '10.64.0.3', { server_state_changed_at: '2026-11-05T10:00:00Z' }),
        stat('b-1', '10.64.0.3', { instance_id: 'node-2', server_state_changed_at: '2026-11-06T09:30:00.5Z' }),
        stat('b-1', '10.64.0.4', { server_state_changed_at: null }),
        stat('b-1', '10.64.0.4', { instance_id: 'node-2', server_state_changed_at: '2026-11-04T08:00:00Z' }),
      ],
      total_count: 8,
    },
  });

  const item = await loadBalancers.get('fr-par-1', 'lb-1');

  expect(item.backends?.map((row) => [row.ip, row.state, row.changedAt])).toEqual([
    ['10.64.0.1', 'down', '2026-11-05T10:00:00Z'],
    ['10.64.0.2', 'checking', '2026-11-05T10:00:00Z'],
    ['10.64.0.3', 'up', '2026-11-06T09:30:00.5Z'],
    ['10.64.0.4', 'up', '2026-11-04T08:00:00Z'],
  ]);
});

test('a stat for a backend that just went away is named by its id', async () => {
  const { loadBalancers } = setup({
    '/lb/v1/zones/fr-par-1/lbs/lb-1': lb('lb-1'),
    [statsPath('fr-par-1', 'lb-1')]: { backend_servers_stats: [stat('b-gone', '10.64.0.9')], total_count: 1 },
  });

  const item = await loadBalancers.get('fr-par-1', 'lb-1');

  expect(item.backends?.map((row) => [row.backendId, row.backendName])).toEqual([['b-gone', 'b-gone']]);
});

test('every backend and stat is loaded', async () => {
  const { request, loadBalancers } = setup({
    '/lb/v1/zones/fr-par-1/lbs/lb-1': lb('lb-1'),
    [backendsPath('fr-par-1', 'lb-1', 1)]: {
      backends: Array.from({ length: 100 }, (_, i) => backend(`b-${i}`, `backend-${i}`)),
      total_count: 101,
    },
    [backendsPath('fr-par-1', 'lb-1', 2)]: { backends: [backend('b-100', 'backend-100')], total_count: 101 },
    [statsPath('fr-par-1', 'lb-1', 1)]: {
      backend_servers_stats: Array.from({ length: 100 }, (_, i) => stat(`b-${i}`, '10.64.0.1')),
      total_count: 101,
    },
    [statsPath('fr-par-1', 'lb-1', 2)]: { backend_servers_stats: [stat('b-100', '10.64.0.1')], total_count: 101 },
  });

  const item = await loadBalancers.get('fr-par-1', 'lb-1');

  expect(item.backends).toHaveLength(101);
  expect(item.backends?.[100]).toMatchObject({ backendId: 'b-100', backendName: 'backend-100' });
  expect(request.mock.calls).toEqual(
    expect.arrayContaining([
      ['GET', backendsPath('fr-par-1', 'lb-1', 2)],
      ['GET', statsPath('fr-par-1', 'lb-1', 2)],
    ]),
  );
});

test('a load balancer is read from its zone', async () => {
  // This answer is the load balancer itself, not wrapped.
  const { request, loadBalancers } = setup({
    '/lb/v1/zones/nl-ams-1/lbs/lb-9': lb('lb-9', { status: 'migrating', zone: 'nl-ams-1' }),
  });

  const item = await loadBalancers.get('nl-ams-1', 'lb-9');

  expect(item).toEqual({
    id: 'lb-9',
    zone: 'nl-ams-1',
    name: 'lb-lb-9',
    status: 'migrating',
    ip: '51.159.10.10',
    backends: [],
  });
  expect(request.mock.calls).toEqual([
    ['GET', '/lb/v1/zones/nl-ams-1/lbs/lb-9'],
    ['GET', backendsPath('nl-ams-1', 'lb-9')],
    ['GET', statsPath('nl-ams-1', 'lb-9')],
  ]);
});

test('zones that fail are left out', async () => {
  const { loadBalancers } = setup({
    [lbsPath('fr-par-1')]: new AppError('forbidden', 'Forbidden', 403),
    [lbsPath('nl-ams-1')]: new AppError('server', 'Internal error', 500),
    [lbsPath('pl-waw-1')]: { lbs: [lb('lb-3', { zone: 'pl-waw-1' })], total_count: 1 },
  });

  const list = await loadBalancers.list('p-1');

  expect(list.map((item) => [item.zone, item.id])).toEqual([['pl-waw-1', 'lb-3']]);
});

test('a load balancer whose backend health fails to load is still listed', async () => {
  // Its backends are unknown (null), not an empty list that would read "Healthy".
  const { loadBalancers } = setup({
    [lbsPath('nl-ams-1')]: {
      lbs: [lb('lb-1', { zone: 'nl-ams-1' }), lb('lb-2', { zone: 'nl-ams-1' }), lb('lb-3', { zone: 'nl-ams-1' })],
      total_count: 3,
    },
    [statsPath('nl-ams-1', 'lb-1')]: new AppError('server', 'Internal error', 500),
    [backendsPath('nl-ams-1', 'lb-2')]: new AppError('server', 'Internal error', 500),
    [statsPath('nl-ams-1', 'lb-3')]: { backend_servers_stats: [stat('b-1', '10.64.0.1')], total_count: 1 },
    '/lb/v1/zones/nl-ams-1/lbs/lb-1': lb('lb-1', { zone: 'nl-ams-1' }),
  });

  const list = await loadBalancers.list('p-1');
  const item = await loadBalancers.get('nl-ams-1', 'lb-1');

  expect(list.map((entry) => [entry.id, entry.backends?.length ?? null])).toEqual([
    ['lb-1', null],
    ['lb-2', null],
    ['lb-3', 1],
  ]);
  expect(item).toEqual({
    id: 'lb-1',
    zone: 'nl-ams-1',
    name: 'lb-lb-1',
    status: 'ready',
    ip: '51.159.10.10',
    backends: null,
  });
});

test('ids from a link stay one path segment', async () => {
  // A crafted link can't walk the path to another endpoint.
  const { request, loadBalancers } = setup({ '/lb/v1/zones/fr-par-1/lbs/..%2Fips': lb('lb-1') });

  await loadBalancers.get('fr-par-1', '../ips');

  expect(request.mock.calls[0]).toEqual(['GET', '/lb/v1/zones/fr-par-1/lbs/..%2Fips']);
});
