import { AppError } from '@scaleway-manager/core';

import { createScalewayActivity } from './activity';
import { fakeHttp } from './testing/fakeHttp';

const eventsPath = (region: string) =>
  `/audit-trail/v1alpha1/regions/${region}/combined-events?organization_id=org-1&order_by=recorded_at_desc&page_size=50`;

// `minutesAgo` before 2026-11-06 12:00 UTC.
const at = (minutesAgo: number) => new Date(Date.UTC(2026, 10, 6, 12, 0) - minutesAgo * 60_000).toISOString();

const apiEvent = (id: string, minutesAgo: number, fields: Record<string, unknown> = {}) => ({
  api: {
    id,
    recorded_at: at(minutesAgo),
    locality: 'fr-par-1',
    principal: { id: 'u-1' },
    organization_id: 'org-1',
    project_id: 'p-1',
    product_name: 'instance',
    service_name: 'scaleway.instance.v1.Api',
    method_name: 'StopServer',
    resources: [],
    request_id: 'req-1',
    status_code: 200,
    ...fields,
  },
});

const authEvent = (id: string, minutesAgo: number, result: string, userId: string) => ({
  auth: {
    id,
    recorded_at: at(minutesAgo),
    organization_id: 'org-1',
    resources: [{ id: userId, type: 'account_user' }],
    result,
    method: 'password',
    origin: 'console',
  },
});

const systemEvent = (id: string, minutesAgo: number, systemName: string) => ({
  system: {
    id,
    recorded_at: at(minutesAgo),
    locality: 'fr-par',
    organization_id: 'org-1',
    project_id: 'p-1',
    product_name: 'secret-manager',
    source: 'secret-manager',
    system_name: systemName,
    resources: [],
    kind: 'cron',
  },
});

// Answers by path; a region left out answers with no events.
const setup = (answers: Record<string, unknown>) => {
  const { request, http } = fakeHttp(answers, { events: [], next_page_token: null });

  return { request, activity: createScalewayActivity({ http }) };
};

test('activity merges regions newest first and caps at 50', async () => {
  // fr-par holds the even minutes, nl-ams the odd ones: 80 events in all.
  const { request, activity } = setup({
    [eventsPath('fr-par')]: {
      events: Array.from({ length: 40 }, (_, i) => apiEvent(`par-${i}`, 2 * i)),
      next_page_token: 'next',
    },
    [eventsPath('nl-ams')]: {
      events: Array.from({ length: 40 }, (_, i) => apiEvent(`ams-${i}`, 2 * i + 1)),
      next_page_token: 'next',
    },
  });

  const events = await activity.listRecent('org-1');

  expect(events.map((event) => event.id)).toEqual(
    Array.from({ length: 25 }, (_, i) => [`par-${i}`, `ams-${i}`]).flat(),
  );
  expect(events[0]?.at).toBe('2026-11-06T12:00:00.000Z');
  expect(events[49]?.at).toBe('2026-11-06T11:11:00.000Z');
  // By organization only: logins belong to no project.
  expect(request.mock.calls).toEqual([
    ['GET', eventsPath('fr-par')],
    ['GET', eventsPath('nl-ams')],
  ]);
});

test('activity names logins and failures', async () => {
  const { activity } = setup({
    [eventsPath('fr-par')]: {
      events: [
        authEvent('e-1', 1, 'success', 'u-1'),
        authEvent('e-2', 2, 'failure', 'u-2'),
        apiEvent('e-3', 3, { method_name: 'DeleteSSHKey', product_name: 'iam', status_code: 403 }),
        apiEvent('e-4', 4, { principal: undefined, product_name: '' }),
        systemEvent('e-5', 5, 'Secret rotation'),
        systemEvent('e-6', 6, ''),
      ],
      next_page_token: null,
    },
  });

  await expect(activity.listRecent('org-1')).resolves.toEqual([
    { id: 'e-1', at: at(1), kind: 'login', actorId: 'u-1', title: 'Logged in', product: null, result: 'success' },
    { id: 'e-2', at: at(2), kind: 'login', actorId: 'u-2', title: 'Login failed', product: null, result: 'failure' },
    { id: 'e-3', at: at(3), kind: 'api', actorId: 'u-1', title: 'Delete SSH key', product: 'IAM', result: 'failure' },
    { id: 'e-4', at: at(4), kind: 'api', actorId: null, title: 'Stop server', product: null, result: 'success' },
    {
      id: 'e-5',
      at: at(5),
      kind: 'system',
      actorId: null,
      title: 'Secret rotation',
      product: 'Secret Manager',
      result: null,
    },
    { id: 'e-6', at: at(6), kind: 'system', actorId: null, title: 'cron', product: 'Secret Manager', result: null },
  ]);
});

test('activity names products in plain words, the way people know them', async () => {
  const { activity } = setup({
    [eventsPath('fr-par')]: {
      events: [
        apiEvent('e-1', 1, { product_name: 'instance' }),
        apiEvent('e-2', 2, { product_name: 'k8s' }),
        apiEvent('e-3', 3, { product_name: 'rdb' }),
        apiEvent('e-4', 4, { product_name: 'lb' }),
        apiEvent('e-5', 5, { product_name: 'baremetal' }),
        // One the app doesn't know yet: its own name, made readable
        apiEvent('e-6', 6, { product_name: 'quantum-computer' }),
      ],
      next_page_token: null,
    },
  });

  const events = await activity.listRecent('org-1');

  expect(events.map((event) => event.product)).toEqual([
    'Instances',
    'Kubernetes',
    'Databases',
    'Load Balancers',
    'Elastic Metal',
    'Quantum computer',
  ]);
});

test('activity reports forbidden', async () => {
  const { activity } = setup({
    [eventsPath('fr-par')]: new AppError('forbidden', 'Permission denied', 403),
    [eventsPath('nl-ams')]: { events: [apiEvent('e-1', 1)], next_page_token: null },
  });

  await expect(activity.listRecent('org-1')).rejects.toMatchObject({ kind: 'forbidden', status: 403 });
});
