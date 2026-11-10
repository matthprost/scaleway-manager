import { createScalewayStatus } from './status';

const UNRESOLVED_URL = 'https://status.scaleway.com/api/v2/incidents/unresolved.json';

// The shape of status.scaleway.com's public JSON, trimmed.
const unresolved = {
  page: { id: 'page-1', name: 'Scaleway', url: 'https://status.scaleway.com' },
  incidents: [
    {
      id: 'inc-1',
      name: '[LOAD BALANCER] - [PAR1] - Autohealing stopped',
      status: 'monitoring',
      impact: 'minor',
      created_at: '2026-11-03T10:54:41.000+01:00',
      updated_at: '2026-11-04T09:21:08.961+01:00',
      shortlink: 'https://stspg.io/k816rm9ygb41',
      incident_updates: [
        { id: 'u-2', status: 'monitoring', body: 'A fix has been implemented.', created_at: '2026-11-04T09:21:08.961+01:00' },
        { id: 'u-1', status: 'investigating', body: 'We are looking into it.', created_at: '2026-11-03T10:54:41.045+01:00' },
      ],
      components: [
        { id: 'c-1', name: 'fr-par-1', status: 'degraded_performance', group_id: 'g-az' },
        { id: 'c-2', name: 'Load Balancer', status: 'degraded_performance', group_id: 'g-products' },
      ],
    },
    {
      id: 'inc-2',
      name: 'Slower API answers',
      status: 'investigating',
      impact: 'major',
      created_at: '2026-11-06T11:35:43.191+01:00',
      updated_at: '2026-11-06T11:35:43.191+01:00',
      shortlink: 'https://stspg.io/ycqzhtnwplq4',
      incident_updates: [],
      components: [],
    },
  ],
};

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });

test('status reads unresolved incidents without a session header', async () => {
  const fetchMock = jest.fn(async (_url: string, _init?: RequestInit) => json(200, unresolved));
  const status = createScalewayStatus({ fetch: fetchMock as unknown as typeof fetch });

  await expect(status.listOpenIncidents()).resolves.toEqual([
    {
      id: 'inc-1',
      name: '[LOAD BALANCER] - [PAR1] - Autohealing stopped',
      status: 'monitoring',
      impact: 'minor',
      components: ['fr-par-1', 'Load Balancer'],
      latestUpdate: 'A fix has been implemented.',
      updatedAt: '2026-11-04T09:21:08.961+01:00',
      url: 'https://status.scaleway.com/incidents/inc-1',
    },
    {
      id: 'inc-2',
      name: 'Slower API answers',
      status: 'investigating',
      impact: 'major',
      components: [],
      latestUpdate: null,
      updatedAt: '2026-11-06T11:35:43.191+01:00',
      url: 'https://status.scaleway.com/incidents/inc-2',
    },
  ]);
  expect(fetchMock).toHaveBeenCalledTimes(1);
  const [url, init] = fetchMock.mock.calls[0] ?? [];
  expect(url).toBe(UNRESOLVED_URL);
  expect(init?.headers).toBeUndefined();
  // Sent through safeFetch, so it has a time limit.
  expect(init?.signal).toBeInstanceOf(AbortSignal);
});

test('status turns a failed request into an app error', async () => {
  const down = createScalewayStatus({
    fetch: jest.fn(async () => json(503, { message: 'Service unavailable' })) as unknown as typeof fetch,
  });
  const offline = createScalewayStatus({
    fetch: jest.fn(async () => {
      throw new TypeError('Network request failed');
    }) as unknown as typeof fetch,
  });

  await expect(down.listOpenIncidents()).rejects.toMatchObject({ kind: 'server', status: 503 });
  await expect(offline.listOpenIncidents()).rejects.toMatchObject({ kind: 'offline' });
});
