import { AppError } from '@scaleway-manager/core';

import { createScalewayServerless } from './serverless';
import { fakeHttp } from './testing/fakeHttp';

const CONTAINER_REGIONS = ['fr-par', 'nl-ams', 'pl-waw', 'it-mil'];
const FUNCTION_REGIONS = ['fr-par', 'nl-ams', 'pl-waw'];

const containersPath = (region: string, page = 1) =>
  `/containers/v1/regions/${region}/containers?project_id=p-1&page_size=100&page=${page}`;

const functionsPath = (region: string, page = 1) =>
  `/functions/v1beta1/regions/${region}/functions?project_id=p-1&page_size=100&page=${page}`;

// The Containers API v1's container, with fields the app never keeps (secrets included).
const container = (id: string, fields: Record<string, unknown> = {}) => ({
  id,
  srn: `srn://containers.scaleway.com/regions/fr-par/containers/${id}`,
  name: `ctr-${id}`,
  namespace_id: 'ns-1',
  description: '',
  status: 'ready',
  error_message: null,
  created_at: '2026-09-01T08:00:00Z',
  updated_at: '2026-11-04T10:00:00Z',
  environment_variables: { LOG_LEVEL: 'info' },
  secret_environment_variables: { API_TOKEN: '$argon2id$v=19$hashed' },
  min_scale: 0,
  max_scale: 5,
  memory_limit_bytes: 2_048_000_000,
  mvcpu_limit: 1000,
  local_storage_limit_bytes: 1_000_000_000,
  timeout: '300s',
  privacy: 'public',
  image: 'rg.fr-par.scw.cloud/acme/frontend:latest',
  protocol: 'http1',
  port: 8080,
  https_connections_only: true,
  sandbox: 'v2',
  scaling_option: { concurrent_requests_threshold: 50 },
  liveness_probe: null,
  startup_probe: null,
  tags: [],
  private_network_id: null,
  command: [],
  args: [],
  public_endpoint: `https://${id}-acme.functions.fnc.fr-par.scw.cloud`,
  private_endpoint: null,
  default_public_endpoint_enabled: true,
  region: 'fr-par',
  ...fields,
});

// The Functions API's function, with fields the app never keeps (secrets included).
const fn = (id: string, fields: Record<string, unknown> = {}) => ({
  id,
  srn: `srn://functions.scaleway.com/regions/fr-par/functions/${id}`,
  name: `fn-${id}`,
  namespace_id: 'ns-2',
  status: 'ready',
  environment_variables: { LOG_LEVEL: 'info' },
  min_scale: 0,
  max_scale: 20,
  runtime: 'python313',
  memory_limit: 256,
  cpu_limit: 140,
  timeout: '300s',
  handler: 'handler.handle',
  error_message: null,
  build_message: 'Function built',
  privacy: 'public',
  description: null,
  domain_name: `${id}-acme.functions.fnc.fr-par.scw.cloud`,
  secret_environment_variables: [{ key: 'API_TOKEN', hashed_value: '$argon2id$v=19$hashed' }],
  region: 'fr-par',
  http_option: 'redirected',
  runtime_message: '',
  sandbox: 'v2',
  created_at: '2026-09-01T08:00:00Z',
  updated_at: '2026-11-05T10:00:00Z',
  ready_at: '2026-11-05T10:01:00Z',
  tags: [],
  private_network_id: null,
  ...fields,
});

// Answers by path; anything left out answers with an empty list.
const setup = (answers: Record<string, unknown>) => {
  const { request, http } = fakeHttp(answers, { containers: [], functions: [], total_count: 0 });

  return { request, serverless: createScalewayServerless({ http }) };
};

test('containers and functions are merged with their kind', async () => {
  const { request, serverless } = setup({
    [containersPath('it-mil')]: {
      containers: [container('c-1', { name: 'frontend', region: 'it-mil' })],
      total_count: 1,
    },
    [functionsPath('nl-ams')]: {
      functions: [
        fn('f-1', {
          name: 'resize-images',
          status: 'error',
          error_message: 'Build failed: missing handler',
          region: 'nl-ams',
        }),
      ],
      total_count: 1,
    },
  });

  const list = await serverless.list('p-1');

  expect(list).toEqual([
    {
      id: 'c-1',
      region: 'it-mil',
      kind: 'container',
      name: 'frontend',
      status: 'ready',
      errorMessage: null,
      domainName: 'c-1-acme.functions.fnc.fr-par.scw.cloud',
      runtimeOrImage: 'rg.fr-par.scw.cloud/acme/frontend:latest',
      updatedAt: '2026-11-04T10:00:00Z',
    },
    {
      id: 'f-1',
      region: 'nl-ams',
      kind: 'function',
      name: 'resize-images',
      status: 'error',
      errorMessage: 'Build failed: missing handler',
      domainName: 'f-1-acme.functions.fnc.fr-par.scw.cloud',
      runtimeOrImage: 'python313',
      updatedAt: '2026-11-05T10:00:00Z',
    },
  ]);
  const calls = [
    ...CONTAINER_REGIONS.map((region) => ['GET', containersPath(region)]),
    ...FUNCTION_REGIONS.map((region) => ['GET', functionsPath(region)]),
  ];
  expect(request.mock.calls).toEqual(expect.arrayContaining(calls));
  expect(request.mock.calls).toHaveLength(calls.length);
});

test('a container URL is kept as a host, with or without https', async () => {
  const { serverless } = setup({
    [containersPath('fr-par')]: {
      containers: [
        container('c-1', { public_endpoint: 'https://c-1.functions.fnc.fr-par.scw.cloud' }),
        container('c-2', { public_endpoint: 'c-2.functions.fnc.fr-par.scw.cloud' }),
        container('c-3', { public_endpoint: 'https://c-3.functions.fnc.fr-par.scw.cloud/' }),
        // Turned off: the URL wouldn't open.
        container('c-4', { default_public_endpoint_enabled: false }),
        container('c-5', { public_endpoint: '' }),
      ],
      total_count: 5,
    },
    [functionsPath('fr-par')]: { functions: [fn('f-1', { domain_name: '' })], total_count: 1 },
  });

  const list = await serverless.list('p-1');

  expect(list.map((app) => [app.id, app.domainName])).toEqual([
    ['c-1', 'c-1.functions.fnc.fr-par.scw.cloud'],
    ['c-2', 'c-2.functions.fnc.fr-par.scw.cloud'],
    ['c-3', 'c-3.functions.fnc.fr-par.scw.cloud'],
    ['c-4', null],
    ['c-5', null],
    ['f-1', null],
  ]);
});

test('an error message is kept only while the app is in error', async () => {
  // Scaleway gives a container's last error, which may be old.
  const { serverless } = setup({
    [containersPath('fr-par')]: {
      containers: [
        container('c-1', { status: 'ready', error_message: 'Image not found' }),
        container('c-2', { status: 'error', error_message: 'Image not found' }),
      ],
      total_count: 2,
    },
  });

  const list = await serverless.list('p-1');

  expect(list.map((app) => [app.id, app.errorMessage])).toEqual([
    ['c-1', null],
    ['c-2', 'Image not found'],
  ]);
});

test('every page of a region is loaded', async () => {
  const { request, serverless } = setup({
    [functionsPath('fr-par', 1)]: { functions: Array.from({ length: 100 }, (_, i) => fn(`f-${i}`)), total_count: 101 },
    [functionsPath('fr-par', 2)]: { functions: [fn('f-100')], total_count: 101 },
  });

  const list = await serverless.list('p-1');

  expect(list).toHaveLength(101);
  expect(request.mock.calls.filter(([, path]) => path.startsWith('/functions/v1beta1/regions/fr-par'))).toEqual([
    ['GET', functionsPath('fr-par', 1)],
    ['GET', functionsPath('fr-par', 2)],
  ]);
});

test('regions and a kind that fail are left out', async () => {
  // No access to containers at all: the functions still show.
  const { serverless } = setup({
    ...Object.fromEntries(
      CONTAINER_REGIONS.map((region) => [containersPath(region), new AppError('forbidden', 'Forbidden', 403)]),
    ),
    [functionsPath('fr-par')]: new AppError('server', 'Internal error', 500),
    [functionsPath('pl-waw')]: { functions: [fn('f-3', { region: 'pl-waw' })], total_count: 1 },
  });

  const list = await serverless.list('p-1');

  expect(list.map((app) => [app.kind, app.region, app.id])).toEqual([['function', 'pl-waw', 'f-3']]);
});

test('a kind that fails everywhere fails the list, so the Resources tab names it', async () => {
  // Containers are down in every region while functions answer: not hidden without a word
  const down = new AppError('server', 'Internal error', 500);
  const { serverless } = setup({
    ...Object.fromEntries(CONTAINER_REGIONS.map((region) => [containersPath(region), down])),
    [functionsPath('fr-par')]: { functions: [fn('f-1')], total_count: 1 },
  });

  await expect(serverless.list('p-1')).rejects.toBe(down);
});

test('serverless refused everywhere hides the product', async () => {
  const refused = new AppError('forbidden', 'Forbidden', 403);
  const { serverless } = setup({
    ...Object.fromEntries(CONTAINER_REGIONS.map((region) => [containersPath(region), refused])),
    ...Object.fromEntries(FUNCTION_REGIONS.map((region) => [functionsPath(region), refused])),
  });

  await expect(serverless.list('p-1')).rejects.toMatchObject({ kind: 'forbidden' });
});

test('an app is read from its region by kind', async () => {
  // Both answers are the app itself, not wrapped.
  const { request, serverless } = setup({
    '/containers/v1/regions/it-mil/containers/c-9': container('c-9', { status: 'upgrading', region: 'it-mil' }),
    '/functions/v1beta1/regions/nl-ams/functions/f-9': fn('f-9', { status: 'created', region: 'nl-ams' }),
  });

  const app = await serverless.get('it-mil', 'container', 'c-9');
  const other = await serverless.get('nl-ams', 'function', 'f-9');

  expect(app).toMatchObject({ id: 'c-9', region: 'it-mil', kind: 'container', status: 'upgrading' });
  expect(other).toMatchObject({ id: 'f-9', region: 'nl-ams', kind: 'function', status: 'created' });
  expect(request.mock.calls).toEqual([
    ['GET', '/containers/v1/regions/it-mil/containers/c-9'],
    ['GET', '/functions/v1beta1/regions/nl-ams/functions/f-9'],
  ]);
});

test('redeploy posts to the right kind', async () => {
  const { request, serverless } = setup({});

  await serverless.redeploy('fr-par', 'container', 'c-1');
  await serverless.redeploy('nl-ams', 'function', 'f-1');

  expect(request.mock.calls).toStrictEqual([
    ['POST', '/containers/v1/regions/fr-par/containers/c-1/redeploy', {}],
    ['POST', '/functions/v1beta1/regions/nl-ams/functions/f-1/deploy', {}],
  ]);
});

test('ids from a link stay one path segment', async () => {
  // A crafted link can't walk the path to another endpoint.
  const { request, serverless } = setup({});

  await serverless.redeploy('fr-par', 'container', '../../namespaces/n-1');
  await serverless.redeploy('fr-par/..', 'function', 'f-1');

  expect(request.mock.calls).toStrictEqual([
    ['POST', '/containers/v1/regions/fr-par/containers/..%2F..%2Fnamespaces%2Fn-1/redeploy', {}],
    ['POST', '/functions/v1beta1/regions/fr-par%2F../functions/f-1/deploy', {}],
  ]);
});
