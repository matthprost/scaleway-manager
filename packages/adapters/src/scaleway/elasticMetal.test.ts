import { createScalewayElasticMetal } from './elasticMetal';
import { fakeHttp } from './testing/fakeHttp';

const serversPath = (zone: string, page = 1) =>
  `/baremetal/v1/zones/${zone}/servers?project_id=p-1&page_size=100&page=${page}`;

const ZONES = ['fr-par-1', 'fr-par-2', 'nl-ams-1', 'nl-ams-2', 'pl-waw-2', 'pl-waw-3'];

// The Elastic Metal API's server, with fields the app never keeps (user_data can hold secrets).
const server = (id: string, status: string, fields: Record<string, unknown> = {}) => ({
  id,
  organization_id: 'org-1',
  project_id: 'p-1',
  name: `em-${id}`,
  description: '',
  updated_at: '2026-11-01T10:00:00.000Z',
  created_at: '2026-09-01T08:00:00.000Z',
  status,
  offer_id: 'offer-1',
  offer_name: 'EM-A115X-SSD',
  tags: [],
  ips: [],
  domain: `${id}.dedibox.fr`,
  boot_type: 'normal',
  zone: 'fr-par-2',
  install: null,
  ping_status: 'ping_status_up',
  options: [],
  rescue_server: null,
  protected: false,
  user_data: 'c2VjcmV0',
  ...fields,
});

const ip = (address: string, version: string) => ({
  id: `ip-${address}`,
  address,
  reverse: '',
  version,
  reverse_status: 'active',
  reverse_status_message: '',
});

// Answers by path; a zone left out answers with no servers.
const setup = (answers: Record<string, unknown>) => {
  const { request, http } = fakeHttp(answers, { servers: [], total_count: 0 });

  return { request, elasticMetal: createScalewayElasticMetal({ http }) };
};

test('elastic metal servers are listed across zones for the project', async () => {
  const { request, elasticMetal } = setup({
    [serversPath('fr-par-2')]: {
      servers: [
        server('em-1', 'ready', { ips: [ip('51.159.1.2', 'IPv4'), ip('2001:bc8:701::1', 'IPv6')] }),
        server('em-2', 'ready', { ping_status: 'ping_status_down' }),
        server('em-3', 'stopped', { ping_status: 'ping_status_unknown' }),
        server('em-4', 'hibernating'),
      ],
      total_count: 4,
    },
  });

  const list = await elasticMetal.list('p-1');

  expect(list[0]).toEqual({
    id: 'em-1',
    zone: 'fr-par-2',
    name: 'em-em-1',
    status: 'ready',
    ping: 'up',
    offerName: 'EM-A115X-SSD',
    ips: ['51.159.1.2', '2001:bc8:701::1'],
    createdAt: '2026-09-01T08:00:00.000Z',
  });
  expect(list.map((item) => [item.id, item.status, item.ping])).toEqual([
    ['em-1', 'ready', 'up'],
    ['em-2', 'ready', 'down'],
    ['em-3', 'stopped', 'unknown'],
    ['em-4', 'unknown', 'up'],
  ]);
  expect(request.mock.calls).toEqual(ZONES.map((zone) => ['GET', serversPath(zone)]));
});

test('an elastic metal server is read from its zone', async () => {
  const { request, elasticMetal } = setup({
    '/baremetal/v1/zones/nl-ams-1/servers/em-9': server('em-9', 'stopped', { zone: 'nl-ams-1' }),
  });

  const item = await elasticMetal.get('nl-ams-1', 'em-9');

  expect(item).toMatchObject({ id: 'em-9', zone: 'nl-ams-1', status: 'stopped', ping: 'up' });
  expect(request.mock.calls).toEqual([['GET', '/baremetal/v1/zones/nl-ams-1/servers/em-9']]);
});

test('elastic metal pings map to up and down', async () => {
  const { request, elasticMetal } = setup({
    '/baremetal/v1/zones/fr-par-2/servers/em-1/metrics': {
      pings: {
        name: 'pings',
        points: [
          ['2026-11-07T10:00:00Z', 1],
          ['2026-11-07T10:01:00Z', 0],
          ['2026-11-07T10:02:00Z', 1],
        ],
        metadata: {},
      },
    },
  });

  const pings = await elasticMetal.pings('fr-par-2', 'em-1');

  expect(pings).toEqual([
    { at: '2026-11-07T10:00:00Z', up: true },
    { at: '2026-11-07T10:01:00Z', up: false },
    { at: '2026-11-07T10:02:00Z', up: true },
  ]);
  expect(request.mock.calls).toEqual([['GET', '/baremetal/v1/zones/fr-par-2/servers/em-1/metrics']]);
});

test('a server with no pings yet has no points', async () => {
  // A server still being delivered may answer without a series.
  const { elasticMetal } = setup({
    '/baremetal/v1/zones/fr-par-2/servers/em-1/metrics': { pings: null },
    '/baremetal/v1/zones/fr-par-2/servers/em-2/metrics': { pings: { name: 'pings', points: null, metadata: {} } },
  });

  await expect(elasticMetal.pings('fr-par-2', 'em-1')).resolves.toEqual([]);
  await expect(elasticMetal.pings('fr-par-2', 'em-2')).resolves.toEqual([]);
});

test('elastic metal actions post to start, stop and reboot', async () => {
  const { request, elasticMetal } = setup({});

  await elasticMetal.act('fr-par-2', 'em-1', 'start');
  await elasticMetal.act('fr-par-2', 'em-1', 'stop');
  await elasticMetal.act('fr-par-2', 'em-1', 'reboot');

  expect(request.mock.calls).toStrictEqual([
    ['POST', '/baremetal/v1/zones/fr-par-2/servers/em-1/start', {}],
    ['POST', '/baremetal/v1/zones/fr-par-2/servers/em-1/stop', {}],
    ['POST', '/baremetal/v1/zones/fr-par-2/servers/em-1/reboot', {}],
  ]);
});
