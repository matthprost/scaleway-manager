import { monthKeyOf, monthRange } from '@scaleway-manager/core';
import type { ClockPort } from '@scaleway-manager/core';

import { createDemoActivity } from './activity';
import { createDemoAlerts } from './alerts';
import { createDemoApiKeys } from './apiKeys';
import { createDemoBilling } from './billing';
import { DEMO_PROJECTS, DEMO_USER } from './data';
import { createDemoFiles } from './files';
import { createDemoInstances } from './instances';
import { createDemoSshKeys } from './sshKeys';
import { createDemoStatus } from './status';
import { createDemoWorkspace } from './workspace';

const clock: ClockPort = { now: () => new Date(Date.UTC(2026, 10, 14, 12, 0, 0)) };
const MONTHS = monthRange(monthKeyOf(clock.now()), 12);

test('demo billing totals match the chart story', async () => {
  const billing = createDemoBilling(clock);
  const current = await billing.getMonth('demo-org', MONTHS[11] ?? '');
  const last = await billing.getMonth('demo-org', MONTHS[10] ?? '');

  expect(current.total).toEqual({ minor: 8460, currency: 'EUR' });
  expect(last.total).toEqual({ minor: 14120, currency: 'EUR' });
});

test('demo product parts add up to each month\'s total', async () => {
  const billing = createDemoBilling(clock);

  for (const month of MONTHS) {
    const spending = await billing.getMonth('demo-org', month);
    const sum = spending.byProduct.reduce((total, part) => total + part.amount.minor, 0);

    expect(sum).toBe(spending.total.minor);
    expect(spending.byProduct.map((part) => part.product)).toEqual([
      'Instances',
      'Kubernetes',
      'Databases',
      'Object Storage',
      'Load Balancer',
    ]);
  }
});

test("demo projects add up to the products every month, each product split between the workspace's projects", async () => {
  const billing = createDemoBilling(clock);
  const sum = (parts: { amount: { minor: number } }[]) => parts.reduce((total, part) => total + part.amount.minor, 0);

  for (const month of MONTHS) {
    const spending = await billing.getMonth('demo-org', month);

    // No discount in the demo: the projects add up to the total too
    expect(spending.discount).toEqual({ minor: 0, currency: 'EUR' });
    expect(sum(spending.byProject)).toBe(sum(spending.byProduct));
    expect(spending.byProject.map((project) => project.projectId)).toEqual(DEMO_PROJECTS.map((project) => project.id));
    for (const project of spending.byProject) {
      expect(sum(project.byProduct)).toBe(project.amount.minor);
      // Largest first, nothing at €0.00
      expect(project.byProduct.map((part) => part.amount.minor)).toEqual(
        project.byProduct.map((part) => part.amount.minor).sort((a, b) => b - a),
      );
      expect(project.byProduct.every((part) => part.amount.minor > 0)).toBe(true);
    }
    for (const product of spending.byProduct) {
      const inProjects = spending.byProject.flatMap((project) =>
        project.byProduct.filter((part) => part.product === product.product),
      );

      expect(sum(inProjects)).toBe(product.amount.minor);
    }
  }
});

test("demo November: Production is most of it, Staging the rest", async () => {
  const billing = createDemoBilling(clock);
  const current = await billing.getMonth('demo-org', MONTHS[11] ?? '');

  expect(current.byProject.map((project) => [project.projectId, project.amount.minor])).toEqual([
    ['demo-prod', 6506],
    ['demo-staging', 1954],
  ]);
  expect(current.byProject[1]?.byProduct.map((part) => part.product)).toEqual([
    'Instances',
    'Kubernetes',
    'Object Storage',
  ]);
});

test('demo invoices are one per past month and download a pdf', async () => {
  const billing = createDemoBilling(clock);
  const invoices = await billing.list('demo-org');
  const pdf = await billing.downloadPdf(invoices[0]?.id ?? '');

  expect(invoices).toHaveLength(11);
  expect(pdf.fileName).toMatch(/\.pdf$/);
  expect(atob(pdf.base64).startsWith('%PDF')).toBe(true);
});

test('demo projects are Production and Staging', async () => {
  const workspace = createDemoWorkspace();

  expect(await workspace.getOrganization('demo-org')).toEqual({ id: 'demo-org', name: 'Acme' });
  expect((await workspace.listProjects('demo-org')).map((p) => [p.id, p.name])).toEqual([
    ['demo-prod', 'Production'],
    ['demo-staging', 'Staging'],
  ]);
});

test('demo alerts only fire in Production', async () => {
  const alerts = createDemoAlerts();

  expect(await alerts.listFiring('demo-prod')).toEqual([
    expect.objectContaining({ name: 'High CPU on db-main', region: 'fr-par' }),
  ]);
  expect(await alerts.listFiring('demo-staging')).toEqual([]);
});

test('demo status has one open incident', async () => {
  const [incident, ...others] = await createDemoStatus(clock).listOpenIncidents();

  expect(others).toEqual([]);
  expect(incident).toMatchObject({
    name: 'Slower block storage in fr-par-1',
    status: 'investigating',
    components: ['Instances', 'fr-par-1'],
  });
});

test('demo activity has 12 recent events with the demo user and others', async () => {
  const events = await createDemoActivity(clock).listRecent('demo-org');
  const oldest = clock.now().getTime() - 3 * 86_400_000;

  expect(events).toHaveLength(12);
  expect(events.every((e) => new Date(e.at).getTime() >= oldest)).toBe(true);
  expect(events.some((e) => e.actorId === DEMO_USER.id)).toBe(true);
  expect(events.some((e) => e.actorId !== null && e.actorId !== DEMO_USER.id)).toBe(true);
  expect(events.some((e) => e.kind === 'system')).toBe(true);
  expect(events.some((e) => e.result === 'failure')).toBe(true);
});

test("demo activity reads like Scaleway's: logins say how they went and name no product, system events have no result", async () => {
  const events = await createDemoActivity(clock).listRecent('demo-org');
  const logins = events.filter((e) => e.kind === 'login');

  expect(logins.map((e) => [e.title, e.result])).toEqual([
    ['Logged in', 'success'],
    ['Login failed', 'failure'],
    ['Logged in', 'success'],
  ]);
  expect(logins.every((e) => e.product === null)).toBe(true);
  expect(events.filter((e) => e.kind === 'system').every((e) => e.result === null)).toBe(true);
});

test('demo instances follow the project', async () => {
  const instances = createDemoInstances(clock);
  const prod = await instances.list('demo-prod');
  const staging = await instances.list('demo-staging');

  expect(prod.map((r) => r.name)).toEqual(['web-prod-1', 'api-prod-2', 'worker-1']);
  expect(staging.map((r) => r.name)).toEqual(['staging-1']);
});

test('demo ssh keys can be added and removed', async () => {
  const keys = createDemoSshKeys(clock);
  const before = await keys.list('demo-prod');
  const added = await keys.create({ name: 'ci', publicKey: 'ssh-ed25519 AAAA', projectId: 'demo-prod' });

  expect(before).toHaveLength(2);
  expect(await keys.list('demo-prod')).toHaveLength(3);
  expect([...before, added].map((key) => key.disabled)).toEqual([false, false, false]);

  expect(added.createdAt).toBe(clock.now().toISOString());

  await keys.remove(added.id);

  expect(await keys.list('demo-prod')).toHaveLength(2);
});

test('demo api keys: one cannot be deleted, new ones get a fake secret', async () => {
  const keys = createDemoApiKeys(clock);
  const before = await keys.list(DEMO_USER.id);

  expect(before).toHaveLength(2);
  expect(before.filter((k) => !k.deletable)).toHaveLength(1);

  const created = await keys.create({
    userId: DEMO_USER.id,
    description: 'Terraform',
    defaultProjectId: 'demo-prod',
    expiry: '30d',
  });

  expect(created.secretKey).toBe('demo-secret-xxxxxxxx');
  expect(await keys.list(DEMO_USER.id)).toHaveLength(3);
  expect(created.apiKey.createdAt).toBe(clock.now().toISOString());
  expect(created.apiKey.expiresAt).toBe(new Date(clock.now().getTime() + 30 * 86_400_000).toISOString());

  await keys.remove(created.apiKey.accessKey);

  expect(await keys.list(DEMO_USER.id)).toHaveLength(2);
});

test('no demo adapter uses fetch', async () => {
  const spy = jest.spyOn(globalThis, 'fetch').mockImplementation(() => {
    throw new Error('network');
  });
  const billing = createDemoBilling(clock);
  const sshKeys = createDemoSshKeys(clock);
  const apiKeys = createDemoApiKeys(clock);
  const workspace = createDemoWorkspace();

  await billing.getMonth('demo-org', MONTHS[0] ?? '');
  await billing.list('demo-org');
  await billing.downloadPdf('x');
  await workspace.getOrganization('demo-org');
  await workspace.listProjects('demo-org');
  await createDemoAlerts().listFiring('demo-prod');
  await createDemoStatus(clock).listOpenIncidents();
  await createDemoActivity(clock).listRecent('demo-org');
  await createDemoInstances(clock).list('demo-prod');
  const key = await sshKeys.create({ name: 'k', publicKey: 'ssh-ed25519 AAAA', projectId: 'demo-prod' });
  await sshKeys.list('demo-prod');
  await sshKeys.remove(key.id);
  const api = await apiKeys.create({
    userId: DEMO_USER.id,
    description: 'k',
    defaultProjectId: 'demo-prod',
    expiry: 'never',
  });
  await apiKeys.list(DEMO_USER.id);
  await apiKeys.remove(api.apiKey.accessKey);
  await createDemoFiles().sharePdf('a.pdf', 'JVBER');
  await createDemoFiles().clear();

  expect(spy).not.toHaveBeenCalled();
  spy.mockRestore();
});
