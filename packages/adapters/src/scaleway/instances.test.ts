import { AppError } from '@scaleway-manager/core';

import { createScalewayInstances } from './instances';
import { fakeHttp } from './testing/fakeHttp';

const serversPath = (zone: string, page = 1) =>
  `/instance/v1/zones/${zone}/servers?project=p-1&per_page=100&page=${page}`;

const ZONES = [
  'fr-par-1',
  'fr-par-2',
  'fr-par-3',
  'nl-ams-1',
  'nl-ams-2',
  'nl-ams-3',
  'pl-waw-1',
  'pl-waw-2',
  'pl-waw-3',
  'it-mil-1',
];

// The Instance API's server, with fields the app never keeps.
const server = (id: string, state: string, fields: Record<string, unknown> = {}) => ({
  id,
  name: `server-${id}`,
  organization: 'org-1',
  project: 'p-1',
  hostname: `server-${id}`,
  commercial_type: 'DEV1-S',
  state,
  state_detail: 'booted',
  image: { id: 'img-1', name: 'Ubuntu 24.04 Noble Numbat' },
  public_ip: null,
  public_ips: [],
  private_ip: null,
  volumes: {},
  tags: ['web'],
  security_group: { id: 'sg-1', name: 'Default security group' },
  creation_date: '2026-10-01T09:00:00.000000+00:00',
  modification_date: '2026-11-06T14:05:00.000000+00:00',
  allowed_actions: ['poweroff', 'terminate', 'reboot', 'stop_in_place', 'backup'],
  zone: 'fr-par-1',
  ...fields,
});

const ip = (address: string, family = 'inet', dynamic = false) => ({ id: `ip-${address}`, address, family, dynamic });

// Answers by path; a zone left out answers with no servers.
const setup = (answers: Record<string, unknown>) => {
  const { request, http } = fakeHttp(answers, { servers: [] });

  return { request, instances: createScalewayInstances({ http }) };
};

test('instances are listed across zones for the project', async () => {
  const { request, instances } = setup({
    [serversPath('fr-par-1')]: {
      servers: [
        server('s-1', 'running', {
          name: 'web-prod-1',
          public_ips: [ip('51.15.12.34')],
          volumes: {
            '0': { id: 'v-1', name: 'web-prod-1-root', size: 20_000_000_000, volume_type: 'l_ssd', boot: true },
            // Block Storage volumes come without a name or size.
            '1': { id: 'v-2', volume_type: 'sbs_volume', boot: false },
          },
        }),
      ],
    },
    [serversPath('nl-ams-1')]: {
      servers: [
        server('s-2', 'stopped', {
          zone: 'nl-ams-1',
          commercial_type: 'GP1-XS',
          image: null,
          private_ip: '10.0.0.3',
          allowed_actions: ['poweron', 'backup'],
        }),
      ],
    },
  });

  const list = await instances.list('p-1');

  expect(list).toEqual([
    {
      id: 's-1',
      zone: 'fr-par-1',
      name: 'web-prod-1',
      state: 'running',
      commercialType: 'DEV1-S',
      imageName: 'Ubuntu 24.04 Noble Numbat',
      publicIpv4: ['51.15.12.34'],
      publicIpv6: [],
      hasDynamicPublicIp: false,
      privateIp: null,
      volumes: [
        { name: 'web-prod-1-root', sizeBytes: 20_000_000_000, type: 'l_ssd' },
        { name: null, sizeBytes: null, type: 'sbs_volume' },
      ],
      createdAt: '2026-10-01T09:00:00.000000+00:00',
      updatedAt: '2026-11-06T14:05:00.000000+00:00',
      allowedActions: ['poweroff', 'terminate', 'reboot', 'stop_in_place', 'backup'],
    },
    {
      id: 's-2',
      zone: 'nl-ams-1',
      name: 'server-s-2',
      state: 'stopped',
      commercialType: 'GP1-XS',
      imageName: null,
      publicIpv4: [],
      publicIpv6: [],
      hasDynamicPublicIp: false,
      privateIp: '10.0.0.3',
      volumes: [],
      createdAt: '2026-10-01T09:00:00.000000+00:00',
      updatedAt: '2026-11-06T14:05:00.000000+00:00',
      allowedActions: ['poweron', 'backup'],
    },
  ]);
  expect(request.mock.calls).toEqual(ZONES.map((zone) => ['GET', serversPath(zone)]));
});

test('standby comes from stopped in place', async () => {
  const { instances } = setup({
    [serversPath('fr-par-1')]: {
      servers: [
        server('s-1', 'running'),
        server('s-2', 'stopped'),
        server('s-3', 'stopped in place'),
        server('s-4', 'starting'),
        server('s-5', 'stopping'),
        server('s-6', 'locked'),
      ],
    },
  });

  const list = await instances.list('p-1');

  expect(list.map((item) => item.state)).toEqual(['running', 'stopped', 'standby', 'starting', 'stopping', 'locked']);
});

test('a state Scaleway adds later becomes unknown', async () => {
  const { instances } = setup({
    [serversPath('fr-par-1')]: { servers: [server('s-1', 'hibernating')] },
  });

  const list = await instances.list('p-1');

  expect(list.map((item) => item.state)).toEqual(['unknown']);
});

test('IPv4 and IPv6 are split by family', async () => {
  const { instances } = setup({
    [serversPath('fr-par-1')]: {
      servers: [
        server('s-1', 'running', {
          public_ips: [ip('51.15.12.34'), ip('2001:bc8:1210::1', 'inet6'), ip('51.15.99.1')],
        }),
      ],
    },
  });

  const [item] = await instances.list('p-1');

  expect(item?.publicIpv4).toEqual(['51.15.12.34', '51.15.99.1']);
  expect(item?.publicIpv6).toEqual(['2001:bc8:1210::1']);
});

test('a dynamic public IP is flagged', async () => {
  // Power off releases a dynamic IP, so the question has to say so.
  const { instances } = setup({
    [serversPath('fr-par-1')]: {
      servers: [
        server('s-1', 'running', { public_ips: [ip('51.15.12.34'), ip('2001:bc8:1210::1', 'inet6', true)] }),
        server('s-2', 'running', { public_ips: [ip('51.15.99.1')] }),
      ],
    },
  });

  const list = await instances.list('p-1');

  expect(list.map((item) => [item.id, item.hasDynamicPublicIp])).toEqual([
    ['s-1', true],
    ['s-2', false],
  ]);
});

test('missing IPs and disks become empty lists', async () => {
  const { instances } = setup({
    [serversPath('fr-par-1')]: { servers: [server('s-1', 'running', { public_ips: null, volumes: null })] },
  });

  const [item] = await instances.list('p-1');

  expect(item).toMatchObject({ publicIpv4: [], publicIpv6: [], hasDynamicPublicIp: false, volumes: [] });
});

test('an instance is read from its zone', async () => {
  const { request, instances } = setup({
    '/instance/v1/zones/fr-par-2/servers/s-9': { server: server('s-9', 'stopped in place', { zone: 'fr-par-2' }) },
  });

  const item = await instances.get('fr-par-2', 's-9');

  expect(item).toMatchObject({ id: 's-9', zone: 'fr-par-2', state: 'standby', name: 'server-s-9' });
  expect(request.mock.calls).toEqual([['GET', '/instance/v1/zones/fr-par-2/servers/s-9']]);
});

test('a backup sends its name', async () => {
  const { request, instances } = setup({});

  await instances.act('fr-par-1', 's-1', 'backup', 'web-prod-1-2026-11-07');
  await instances.act('fr-par-1', 's-1', 'poweroff');

  expect(request.mock.calls).toStrictEqual([
    ['POST', '/instance/v1/zones/fr-par-1/servers/s-1/action', { action: 'backup', name: 'web-prod-1-2026-11-07' }],
    ['POST', '/instance/v1/zones/fr-par-1/servers/s-1/action', { action: 'poweroff' }],
  ]);
});

test('every page of a zone is loaded', async () => {
  // The Instance API sends its total in a header, not the body: a short page is the last one.
  const { request, instances } = setup({
    [serversPath('fr-par-1', 1)]: { servers: Array.from({ length: 100 }, (_, i) => server(`s-${i}`, 'running')) },
    [serversPath('fr-par-1', 2)]: { servers: [server('s-100', 'running')] },
  });

  const list = await instances.list('p-1');

  expect(list).toHaveLength(101);
  expect(request.mock.calls.filter(([, path]) => path.includes('/fr-par-1/'))).toEqual([
    ['GET', serversPath('fr-par-1', 1)],
    ['GET', serversPath('fr-par-1', 2)],
  ]);
});

test('zones answering 404 are skipped', async () => {
  const { request, instances } = setup({
    [serversPath('fr-par-1')]: { servers: [server('s-1', 'running')] },
    [serversPath('nl-ams-1')]: new AppError('not_found', 'Zone not found', 404),
    [serversPath('pl-waw-1')]: new AppError('forbidden', 'Forbidden', 403),
  });

  const list = await instances.list('p-1');

  expect(list.map((item) => [item.zone, item.id])).toEqual([['fr-par-1', 's-1']]);
  expect(request.mock.calls).toEqual(ZONES.map((zone) => ['GET', serversPath(zone)]));
});

test('a 500 in one zone leaves that zone out', async () => {
  // One zone down at Scaleway doesn't blank the whole product.
  const { instances } = setup({
    [serversPath('fr-par-1')]: { servers: [server('s-1', 'running')] },
    [serversPath('fr-par-2')]: new AppError('server', 'Internal error', 500),
  });

  const list = await instances.list('p-1');

  expect(list.map((item) => item.id)).toEqual(['s-1']);
});

test('every zone refusing hides the product', async () => {
  // Mixed 404s and 403s still read as "no access": the first zone's 404 isn't what comes back.
  const { instances } = setup(
    Object.fromEntries(
      ZONES.map((zone, i) => [
        serversPath(zone),
        i % 2 === 0 ? new AppError('not_found', 'Not found', 404) : new AppError('forbidden', 'Forbidden', 403),
      ]),
    ),
  );

  const failure = instances.list('p-1');

  await expect(failure).rejects.toBeInstanceOf(AppError);
  await expect(failure).rejects.toMatchObject({ kind: 'forbidden' });
});

test('every zone failing for another reason fails the list', async () => {
  // The first error that isn't a refusal is shown, so the user can try again.
  const { instances } = setup({
    ...Object.fromEntries(ZONES.map((zone) => [serversPath(zone), new AppError('offline', 'Network request failed')])),
    [serversPath('fr-par-1')]: new AppError('forbidden', 'Forbidden', 403),
    [serversPath('fr-par-2')]: new AppError('server', 'Internal error', 500),
  });

  await expect(instances.list('p-1')).rejects.toMatchObject({ kind: 'server' });
});
