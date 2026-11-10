import {
  availableInstanceActions,
  clusterStatus,
  databaseStatus,
  elasticMetalStatus,
  instanceStatus,
  jobDefinitionStatus,
  loadBalancerStatus,
  serverlessStatus,
} from '@scaleway-manager/core';
import type { ClockPort } from '@scaleway-manager/core';

import {
  createDemoDatabases,
  createDemoElasticMetal,
  createDemoInstances,
  createDemoJobs,
  createDemoKubernetes,
  createDemoLoadBalancers,
  createDemoServerless,
} from './index';

const START = Date.UTC(2026, 10, 14, 12, 0, 0);

const makeClock = () => {
  let time = START;
  const clock: ClockPort = { now: () => new Date(time) };

  return {
    clock,
    advance: (ms: number) => {
      time += ms;
    },
  };
};

test('demo production has every product', async () => {
  const { clock } = makeClock();
  const instances = await createDemoInstances(clock).list('demo-prod');
  const metal = await createDemoElasticMetal(clock).list('demo-prod');
  const clusters = await createDemoKubernetes(clock).list('demo-prod');
  const databases = await createDemoDatabases(clock).list('demo-prod');
  const apps = await createDemoServerless(clock).list('demo-prod');
  const jobs = await createDemoJobs(clock).list('demo-prod');
  const balancers = await createDemoLoadBalancers(clock).list('demo-prod');

  expect(instances.map((i) => [i.name, i.state, i.zone, i.imageName, i.publicIpv4[0]])).toEqual([
    ['web-prod-1', 'running', 'fr-par-1', 'Ubuntu', '203.0.113.34'],
    ['api-prod-2', 'running', 'nl-ams-1', 'Debian', '203.0.113.21'],
    ['worker-1', 'standby', 'pl-waw-1', 'Alpine', undefined],
  ]);
  expect(metal).toHaveLength(1);
  expect(metal[0]).toMatchObject({
    name: 'em-storage-1',
    zone: 'fr-par-2',
    status: 'ready',
    ping: 'up',
    offerName: 'EM-A315X-SSD',
    ips: ['198.51.100.5'],
  });
  expect(clusters[0]).toMatchObject({ name: 'k8s-main', region: 'fr-par', version: '1.33', upgradeAvailable: true });
  expect(clusters[0]?.nodes?.filter((n) => n.status === 'ready')).toHaveLength(3);
  expect(clusterStatus(clusters[0] ?? { status: 'unknown', nodes: [] }).label).toBe('Healthy');
  expect(databases[0]).toMatchObject({ name: 'db-main', engine: 'PostgreSQL-16', region: 'fr-par', status: 'ready' });
  expect(apps.map((a) => [a.kind, a.name, a.status, a.errorMessage, a.domainName])).toEqual([
    ['container', 'frontend', 'ready', null, 'frontend-acme.functions.fnc.fr-par.scw.cloud'],
    ['function', 'resize-images', 'error', 'Build failed: missing handler', null],
  ]);
  expect(jobs[0]).toMatchObject({
    name: 'nightly-report',
    cronSchedule: '0 3 * * *',
    cronTimezone: 'UTC',
    lastRun: { state: 'succeeded' },
  });
  expect(balancers[0]).toMatchObject({ name: 'lb-web', ip: '198.51.100.10' });
  expect(balancers[0]?.backends).toHaveLength(3);
  expect(balancers[0]?.backends?.filter((b) => b.state === 'down')).toHaveLength(1);
  expect(loadBalancerStatus(balancers[0] ?? { status: 'ready', backends: [] }).health).toBe('warning');
});

test('demo staging only has staging-1', async () => {
  const { clock } = makeClock();
  const instances = await createDemoInstances(clock).list('demo-staging');

  expect(instances.map((i) => [i.name, i.state])).toEqual([['staging-1', 'running']]);
  expect(await createDemoElasticMetal(clock).list('demo-staging')).toEqual([]);
  expect(await createDemoKubernetes(clock).list('demo-staging')).toEqual([]);
  expect(await createDemoDatabases(clock).list('demo-staging')).toEqual([]);
  expect(await createDemoServerless(clock).list('demo-staging')).toEqual([]);
  expect(await createDemoJobs(clock).list('demo-staging')).toEqual([]);
  expect(await createDemoLoadBalancers(clock).list('demo-staging')).toEqual([]);
});

test('demo poweroff goes through stopping to stopped', async () => {
  const { clock, advance } = makeClock();
  const instances = createDemoInstances(clock);

  await instances.act('fr-par-1', 'demo-web-prod-1', 'poweroff');

  const first = await instances.get('fr-par-1', 'demo-web-prod-1');

  advance(3_000);
  const second = await instances.get('fr-par-1', 'demo-web-prod-1');

  advance(3_000);
  const third = await instances.get('fr-par-1', 'demo-web-prod-1');

  expect(first.state).toBe('stopping');
  expect(instanceStatus(first.state).health).toBe('busy');
  expect(second.state).toBe('stopping');
  expect(third.state).toBe('stopped');
  expect(availableInstanceActions(third)).toEqual(['poweron', 'backup']);
});

test('demo poweron goes through starting to running, and each factory starts clean', async () => {
  const { clock, advance } = makeClock();
  const instances = createDemoInstances(clock);

  await instances.act('pl-waw-1', 'demo-worker-1', 'poweron');

  expect((await instances.get('pl-waw-1', 'demo-worker-1')).state).toBe('starting');
  advance(6_000);
  expect((await instances.get('pl-waw-1', 'demo-worker-1')).state).toBe('running');
  expect((await createDemoInstances(clock).get('pl-waw-1', 'demo-worker-1')).state).toBe('standby');
});

test('demo instance list shows the busy state too', async () => {
  const { clock } = makeClock();
  const instances = createDemoInstances(clock);

  await instances.act('nl-ams-1', 'demo-api-prod-2', 'reboot');

  const list = await instances.list('demo-prod');

  expect(list.find((i) => i.id === 'demo-api-prod-2')?.state).toBe('starting');
});

test('demo unknown resources are not found', async () => {
  const { clock } = makeClock();

  await expect(createDemoInstances(clock).get('fr-par-1', 'nope')).rejects.toMatchObject({ kind: 'not_found' });
  await expect(createDemoDatabases(clock).restart('fr-par', 'nope')).rejects.toMatchObject({ kind: 'not_found' });
});

test('demo elastic metal stops and starts again', async () => {
  const { clock, advance } = makeClock();
  const metal = createDemoElasticMetal(clock);

  await metal.act('fr-par-2', 'demo-em-storage-1', 'stop');
  expect(elasticMetalStatus(await metal.get('fr-par-2', 'demo-em-storage-1')).health).toBe('busy');
  advance(6_000);
  expect((await metal.get('fr-par-2', 'demo-em-storage-1')).status).toBe('stopped');

  await metal.act('fr-par-2', 'demo-em-storage-1', 'start');
  advance(6_000);
  expect((await metal.get('fr-par-2', 'demo-em-storage-1')).status).toBe('ready');
});

test('demo elastic metal has 24 hours of pings with a 20-minute outage 6 hours ago', async () => {
  const { clock } = makeClock();
  const pings = await createDemoElasticMetal(clock).pings('fr-par-2', 'demo-em-storage-1');
  const down = pings.filter((p) => !p.up);
  const now = clock.now().getTime();
  const sixHoursAgo = now - 6 * 3_600_000;

  expect(pings).toHaveLength(1_440);
  expect(down).toHaveLength(20);
  expect(new Date(down[0]?.at ?? 0).getTime()).toBe(sixHoursAgo);
  expect(new Date(down[19]?.at ?? 0).getTime()).toBe(sixHoursAgo + 19 * 60_000);
  expect(pings[pings.length - 1]?.up).toBe(true);
  expect(new Date(pings[pings.length - 1]?.at ?? 0).getTime()).toBe(now);
});

test('demo kubernetes has the default pool and reboots a node', async () => {
  const { clock, advance } = makeClock();
  const kubernetes = createDemoKubernetes(clock);
  const pools = await kubernetes.pools('fr-par', 'demo-k8s-main');

  expect(pools).toHaveLength(1);
  expect(pools[0]).toMatchObject({ name: 'default', nodeType: 'PRO2-S', size: 3 });

  await kubernetes.actOnNode('fr-par', 'demo-node-1', 'reboot');
  const during = await kubernetes.get('fr-par', 'demo-k8s-main');

  expect(during.nodes?.[0]?.status).toBe('rebooting');
  expect(during.nodes?.[1]?.status).toBe('ready');
  advance(6_000);
  expect((await kubernetes.get('fr-par', 'demo-k8s-main')).nodes?.[0]?.status).toBe('ready');
});

test('demo database restarts and takes a backup', async () => {
  const { clock, advance } = makeClock();
  const databases = createDemoDatabases(clock);

  expect(await databases.databaseNames('fr-par', 'demo-db-main')).toEqual(['app', 'analytics']);
  expect(await databases.backups('fr-par', 'demo-db-main')).toHaveLength(3);

  await databases.restart('fr-par', 'demo-db-main');
  expect(databaseStatus(await databases.get('fr-par', 'demo-db-main')).health).toBe('busy');
  advance(6_000);
  expect((await databases.get('fr-par', 'demo-db-main')).status).toBe('ready');

  await databases.backup('fr-par', 'demo-db-main', {
    databaseName: 'app',
    name: 'app-2026-11-14',
    expiresAt: '2026-11-21T12:00:00.000Z',
  });
  const backups = await databases.backups('fr-par', 'demo-db-main');

  expect(backups).toHaveLength(4);
  expect(backups[0]).toMatchObject({ name: 'app-2026-11-14', status: 'creating' });
  advance(6_000);
  expect((await databases.backups('fr-par', 'demo-db-main'))[0]?.status).toBe('ready');
});

test('demo database CPU ends at 92 and has a point every 5 minutes', async () => {
  const { clock } = makeClock();
  const until = clock.now();
  const since = new Date(until.getTime() - 3_600_000);
  const series = await createDemoDatabases(clock).metrics('fr-par', 'demo-db-main', since, until);
  const cpu = series.find((s) => s.metric === 'cpu');

  expect(series.map((s) => s.metric)).toEqual(['cpu', 'memory', 'disk']);
  expect(cpu?.points).toHaveLength(13);
  expect(cpu?.points[cpu.points.length - 1]?.value).toBe(92);
  expect(Math.max(...(cpu?.points.map((p) => p.value) ?? []))).toBe(92);
});

test('demo redeploy turns the failing function into a ready one', async () => {
  const { clock, advance } = makeClock();
  const serverless = createDemoServerless(clock);

  await serverless.redeploy('fr-par', 'function', 'demo-resize-images');
  const during = await serverless.get('fr-par', 'function', 'demo-resize-images');

  expect(serverlessStatus(during).health).toBe('busy');
  expect(during.errorMessage).toBeNull();
  advance(6_000);
  expect((await serverless.get('fr-par', 'function', 'demo-resize-images')).status).toBe('ready');
});

test('demo jobs start a run, then stop it', async () => {
  const { clock, advance } = makeClock();
  const jobs = createDemoJobs(clock);

  expect((await jobs.runs('fr-par', 'demo-nightly-report'))[0]?.state).toBe('succeeded');

  await jobs.start('fr-par', 'demo-nightly-report');
  const running = (await jobs.runs('fr-par', 'demo-nightly-report'))[0];

  expect(running).toMatchObject({ state: 'running', finishedAt: null });
  expect(jobDefinitionStatus(await jobs.get('fr-par', 'demo-nightly-report')).health).toBe('busy');

  await jobs.stopRun('fr-par', running?.id ?? '');
  expect((await jobs.runs('fr-par', 'demo-nightly-report'))[0]?.state).toBe('interrupting');
  advance(6_000);
  expect((await jobs.runs('fr-par', 'demo-nightly-report'))[0]?.state).toBe('interrupted');
});

test('demo job run finishes by itself', async () => {
  const { clock, advance } = makeClock();
  const jobs = createDemoJobs(clock);

  await jobs.start('fr-par', 'demo-nightly-report');
  advance(30_000);

  expect((await jobs.get('fr-par', 'demo-nightly-report')).lastRun).toMatchObject({ state: 'succeeded' });
});

test('no demo product adapter uses fetch', async () => {
  const spy = jest.spyOn(globalThis, 'fetch').mockImplementation(() => {
    throw new Error('network');
  });
  const { clock } = makeClock();

  await createDemoInstances(clock).list('demo-prod');
  await createDemoElasticMetal(clock).pings('fr-par-2', 'demo-em-storage-1');
  await createDemoKubernetes(clock).list('demo-prod');
  await createDemoDatabases(clock).list('demo-prod');
  await createDemoServerless(clock).list('demo-prod');
  await createDemoJobs(clock).list('demo-prod');
  await createDemoLoadBalancers(clock).list('demo-prod');

  expect(spy).not.toHaveBeenCalled();
  spy.mockRestore();
});

test('demo staging-1 keeps its zone and address', async () => {
  const { clock } = makeClock();
  const [server] = await createDemoInstances(clock).list('demo-staging');

  expect(server).toMatchObject({ zone: 'fr-par-2', publicIpv4: ['203.0.113.7'] });
});

test('demo staging-1 has a dynamic public IP', async () => {
  // So the demo can show Power off's "Its public IP is released" sentence.
  const { clock } = makeClock();
  const [server] = await createDemoInstances(clock).list('demo-staging');

  expect(server?.hasDynamicPublicIp).toBe(true);
});

test('demo stop in place ends on standby and backup changes nothing', async () => {
  const { clock, advance } = makeClock();
  const instances = createDemoInstances(clock);

  await instances.act('nl-ams-1', 'demo-api-prod-2', 'backup', 'copy');
  expect((await instances.get('nl-ams-1', 'demo-api-prod-2')).state).toBe('running');

  await instances.act('nl-ams-1', 'demo-api-prod-2', 'stop_in_place');
  expect((await instances.get('nl-ams-1', 'demo-api-prod-2')).state).toBe('stopping');
  advance(6_000);
  expect((await instances.get('nl-ams-1', 'demo-api-prod-2')).state).toBe('standby');
});

test('demo elastic metal reboot goes through resetting', async () => {
  const { clock, advance } = makeClock();
  const metal = createDemoElasticMetal(clock);

  await metal.act('fr-par-2', 'demo-em-storage-1', 'reboot');
  expect((await metal.get('fr-par-2', 'demo-em-storage-1')).status).toBe('resetting');
  advance(6_000);
  expect((await metal.get('fr-par-2', 'demo-em-storage-1')).status).toBe('ready');
});

test('demo kubernetes replace goes through creating', async () => {
  const { clock, advance } = makeClock();
  const kubernetes = createDemoKubernetes(clock);

  await kubernetes.actOnNode('fr-par', 'demo-node-2', 'replace');
  expect((await kubernetes.get('fr-par', 'demo-k8s-main')).nodes?.[1]?.status).toBe('creating');
  advance(6_000);
  expect((await kubernetes.get('fr-par', 'demo-k8s-main')).nodes?.[1]?.status).toBe('ready');
});

test('demo stopping a finished run does nothing, and an unknown run is not found', async () => {
  const { clock, advance } = makeClock();
  const jobs = createDemoJobs(clock);

  await jobs.start('fr-par', 'demo-nightly-report');
  advance(30_000);
  await jobs.stopRun('fr-par', 'demo-run-manual-1');

  expect((await jobs.runs('fr-par', 'demo-nightly-report'))[0]?.state).toBe('succeeded');
  await expect(jobs.stopRun('fr-par', 'nope')).rejects.toMatchObject({ kind: 'not_found' });
});

test('demo stopping a run twice keeps the first stop time', async () => {
  const { clock, advance } = makeClock();
  const jobs = createDemoJobs(clock);

  await jobs.start('fr-par', 'demo-nightly-report');
  await jobs.stopRun('fr-par', 'demo-run-manual-1');
  advance(4_000);
  await jobs.stopRun('fr-par', 'demo-run-manual-1');
  advance(2_000);

  expect((await jobs.runs('fr-par', 'demo-nightly-report'))[0]?.state).toBe('interrupted');
});
