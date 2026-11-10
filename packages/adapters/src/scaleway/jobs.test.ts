import { AppError } from '@scaleway-manager/core';

import { createScalewayJobs } from './jobs';
import { fakeHttp } from './testing/fakeHttp';

const REGIONS = ['fr-par', 'nl-ams', 'pl-waw'];

const definitionsPath = (region: string, page = 1) =>
  `/serverless-jobs/v1alpha2/regions/${region}/job-definitions?project_id=p-1&page_size=100&page=${page}`;

// The project's newest 100 runs in a region.
const projectRunsPath = (region: string) =>
  `/serverless-jobs/v1alpha2/regions/${region}/job-runs?project_id=p-1&order_by=created_at_desc&page_size=100`;

const jobRunsPath = (region: string, definitionId: string, count: number) =>
  `/serverless-jobs/v1alpha2/regions/${region}/job-runs` +
  `?job_definition_id=${definitionId}&order_by=created_at_desc&page_size=${count}`;

// The Jobs API's definition, with fields the app never keeps.
const definition = (id: string, fields: Record<string, unknown> = {}) => ({
  id,
  srn: `srn://serverless-jobs.scaleway.com/regions/fr-par/job-definitions/${id}`,
  name: `job-${id}`,
  project_id: 'p-1',
  created_at: '2026-09-01T08:00:00Z',
  updated_at: '2026-11-01T10:00:00Z',
  cpu_limit: 1000,
  memory_limit: 2048,
  local_storage_capacity: 1000,
  image_uri: 'rg.fr-par.scw.cloud/acme/report:latest',
  environment_variables: { REPORT_BUCKET: 'acme-reports' },
  job_timeout: '3600s',
  description: '',
  cron_schedule: null,
  startup_command: ['/bin/report'],
  args: [],
  retry_policy: { max_retries: 0 },
  region: 'fr-par',
  ...fields,
});

// The API's run, with fields the app never keeps.
const run = (id: string, definitionId: string, state: string, fields: Record<string, unknown> = {}) => ({
  id,
  srn: `srn://serverless-jobs.scaleway.com/regions/fr-par/job-runs/${id}`,
  job_definition_id: definitionId,
  created_at: '2026-11-07T03:00:00Z',
  updated_at: '2026-11-07T03:04:00Z',
  started_at: '2026-11-07T03:00:05Z',
  terminated_at: null,
  run_duration: null,
  state,
  reason: null,
  exit_code: null,
  error_message: null,
  cpu_limit: 1000,
  memory_limit: 2048,
  local_storage_capacity: 1000,
  environment_variables: { REPORT_BUCKET: 'acme-reports' },
  startup_command: ['/bin/report'],
  args: [],
  attempts: 1,
  region: 'fr-par',
  ...fields,
});

// Answers by path; anything left out answers with an empty list.
const setup = (answers: Record<string, unknown>) => {
  const { request, http } = fakeHttp(answers, { job_definitions: [], job_runs: [], total_count: 0 });

  return { request, jobs: createScalewayJobs({ http }) };
};

test('each job gets its latest run', async () => {
  const { request, jobs } = setup({
    [definitionsPath('fr-par')]: {
      job_definitions: [
        definition('j-1', {
          name: 'nightly-report',
          cron_schedule: { schedule: '0 3 * * *', timezone: 'Europe/Paris' },
        }),
        definition('j-2'),
        definition('j-3'),
      ],
      total_count: 3,
    },
    // Newest first: the first run of a job is its latest.
    [projectRunsPath('fr-par')]: {
      job_runs: [
        run('r-3', 'j-1', 'running'),
        run('r-2', 'j-2', 'failed', {
          started_at: '2026-11-06T12:00:00Z',
          terminated_at: '2026-11-06T12:02:00Z',
          exit_code: 1,
          error_message: 'exit status 1',
        }),
        run('r-1', 'j-1', 'succeeded', { terminated_at: '2026-11-06T03:04:00Z', exit_code: 0 }),
      ],
      total_count: 3,
    },
  });

  const list = await jobs.list('p-1');

  expect(list).toEqual([
    {
      id: 'j-1',
      region: 'fr-par',
      name: 'nightly-report',
      cronSchedule: '0 3 * * *',
      cronTimezone: 'Europe/Paris',
      lastRun: {
        id: 'r-3',
        definitionId: 'j-1',
        state: 'running',
        startedAt: '2026-11-07T03:00:05Z',
        finishedAt: null,
        exitCode: null,
        errorMessage: null,
      },
    },
    {
      id: 'j-2',
      region: 'fr-par',
      name: 'job-j-2',
      cronSchedule: null,
      cronTimezone: null,
      lastRun: {
        id: 'r-2',
        definitionId: 'j-2',
        state: 'failed',
        startedAt: '2026-11-06T12:00:00Z',
        finishedAt: '2026-11-06T12:02:00Z',
        exitCode: 1,
        errorMessage: 'exit status 1',
      },
    },
    // The page held every run of the project: this job never ran.
    { id: 'j-3', region: 'fr-par', name: 'job-j-3', cronSchedule: null, cronTimezone: null, lastRun: null },
  ]);
  // Regions with no job don't ask for runs.
  const calls = [...REGIONS.map((region) => ['GET', definitionsPath(region)]), ['GET', projectRunsPath('fr-par')]];
  expect(request.mock.calls).toEqual(expect.arrayContaining(calls));
  expect(request.mock.calls).toHaveLength(calls.length);
});

test("a definition whose last run is older than the project's latest 100 still gets it", async () => {
  const { request, jobs } = setup({
    [definitionsPath('fr-par')]: {
      job_definitions: [definition('j-1'), definition('j-2'), definition('j-3')],
      total_count: 3,
    },
    // One busy job fills the page.
    [projectRunsPath('fr-par')]: {
      job_runs: Array.from({ length: 100 }, (_, i) => run(`r-${i}`, 'j-1', 'succeeded')),
      total_count: 250,
    },
    [jobRunsPath('fr-par', 'j-2', 1)]: { job_runs: [run('r-old', 'j-2', 'succeeded')], total_count: 40 },
  });

  const list = await jobs.list('p-1');

  expect(list.map((item) => [item.id, item.lastRun])).toEqual([
    ['j-1', expect.objectContaining({ id: 'r-0' })],
    ['j-2', expect.objectContaining({ id: 'r-old' })],
    ['j-3', null],
  ]);
  expect(request.mock.calls.filter(([, path]) => path.includes('job_definition_id'))).toEqual(
    expect.arrayContaining([
      ['GET', jobRunsPath('fr-par', 'j-2', 1)],
      ['GET', jobRunsPath('fr-par', 'j-3', 1)],
    ]),
  );
  expect(request.mock.calls.filter(([, path]) => path.includes('job_definition_id'))).toHaveLength(2);
});

test('every job of a region is loaded', async () => {
  const { request, jobs } = setup({
    [definitionsPath('fr-par', 1)]: {
      job_definitions: Array.from({ length: 100 }, (_, i) => definition(`j-${i}`)),
      total_count: 101,
    },
    [definitionsPath('fr-par', 2)]: { job_definitions: [definition('j-100')], total_count: 101 },
  });

  const list = await jobs.list('p-1');

  expect(list).toHaveLength(101);
  expect(request.mock.calls.filter(([, path]) => path.includes('fr-par/job-definitions'))).toEqual([
    ['GET', definitionsPath('fr-par', 1)],
    ['GET', definitionsPath('fr-par', 2)],
  ]);
});

test('regions whose jobs fail to load are left out', async () => {
  const { jobs } = setup({
    [definitionsPath('fr-par')]: new AppError('forbidden', 'Forbidden', 403),
    [definitionsPath('nl-ams')]: new AppError('server', 'Internal error', 500),
    [definitionsPath('pl-waw')]: { job_definitions: [definition('j-3', { region: 'pl-waw' })], total_count: 1 },
  });

  const list = await jobs.list('p-1');

  expect(list.map((item) => [item.region, item.id])).toEqual([['pl-waw', 'j-3']]);
});

test('jobs whose runs fail to load are still listed, their last run unavailable', async () => {
  // Never "Never run": that would be false.
  const { request, jobs } = setup({
    [definitionsPath('nl-ams')]: { job_definitions: [definition('j-2', { region: 'nl-ams' })], total_count: 1 },
    [projectRunsPath('nl-ams')]: new AppError('server', 'Internal error', 500),
    [definitionsPath('pl-waw')]: {
      job_definitions: [definition('j-3', { region: 'pl-waw' }), definition('j-4', { region: 'pl-waw' })],
      total_count: 2,
    },
    [projectRunsPath('pl-waw')]: {
      job_runs: Array.from({ length: 100 }, (_, i) => run(`r-${i}`, 'j-3', 'succeeded')),
      total_count: 150,
    },
    [jobRunsPath('pl-waw', 'j-4', 1)]: new AppError('server', 'Internal error', 500),
    '/serverless-jobs/v1alpha2/regions/nl-ams/job-definitions/j-2': definition('j-2', { region: 'nl-ams' }),
    [jobRunsPath('nl-ams', 'j-2', 1)]: new AppError('server', 'Internal error', 500),
  });

  const list = await jobs.list('p-1');
  const item = await jobs.get('nl-ams', 'j-2');

  expect(list.map((entry) => [entry.region, entry.id, entry.lastRun])).toEqual([
    ['nl-ams', 'j-2', 'unavailable'],
    ['pl-waw', 'j-3', expect.objectContaining({ id: 'r-0' })],
    ['pl-waw', 'j-4', 'unavailable'],
  ]);
  expect(item).toMatchObject({ id: 'j-2', lastRun: 'unavailable' });
  // A runs page that failed isn't asked again job by job.
  expect(request.mock.calls.filter(([, path]) => path.includes('nl-ams/job-runs?job_definition_id'))).toEqual([
    ['GET', jobRunsPath('nl-ams', 'j-2', 1)],
  ]);
});

test('run states Scaleway adds later become unknown', async () => {
  const states = [
    'initialized',
    'validated',
    'queued',
    'running',
    'succeeded',
    'failed',
    'interrupting',
    'interrupted',
    'retrying',
    'unknown_state',
    'paused',
  ];
  const { jobs } = setup({
    [jobRunsPath('fr-par', 'j-1', 20)]: {
      job_runs: states.map((state, i) => run(`r-${i}`, 'j-1', state)),
      total_count: states.length,
    },
  });

  const runs = await jobs.runs('fr-par', 'j-1');

  expect(runs.map((item) => item.state)).toEqual([...states.slice(0, -1), 'unknown_state']);
});

test('a job is read with its last run', async () => {
  // The definition is read first, so a deleted job answers not found.
  const { request, jobs } = setup({
    '/serverless-jobs/v1alpha2/regions/nl-ams/job-definitions/j-9': definition('j-9', {
      region: 'nl-ams',
      cron_schedule: { schedule: '*/15 * * * *', timezone: 'UTC' },
    }),
    [jobRunsPath('nl-ams', 'j-9', 1)]: { job_runs: [run('r-9', 'j-9', 'queued')], total_count: 12 },
  });

  const item = await jobs.get('nl-ams', 'j-9');

  expect(item).toEqual({
    id: 'j-9',
    region: 'nl-ams',
    name: 'job-j-9',
    cronSchedule: '*/15 * * * *',
    cronTimezone: 'UTC',
    lastRun: expect.objectContaining({ id: 'r-9', state: 'queued' }),
  });
  expect(request.mock.calls).toEqual([
    ['GET', '/serverless-jobs/v1alpha2/regions/nl-ams/job-definitions/j-9'],
    ['GET', jobRunsPath('nl-ams', 'j-9', 1)],
  ]);
});

test('an empty time zone is kept as none', async () => {
  const { jobs } = setup({
    '/serverless-jobs/v1alpha2/regions/fr-par/job-definitions/j-1': definition('j-1', {
      cron_schedule: { schedule: '0 3 * * *', timezone: '' },
    }),
  });

  const item = await jobs.get('fr-par', 'j-1');

  expect(item.cronTimezone).toBeNull();
});

test('runs are the newest 20 of a job', async () => {
  const { request, jobs } = setup({
    [jobRunsPath('fr-par', 'j-1', 20)]: {
      job_runs: [run('r-2', 'j-1', 'running'), run('r-1', 'j-1', 'interrupted')],
      total_count: 2,
    },
  });

  const runs = await jobs.runs('fr-par', 'j-1');

  expect(runs.map((item) => [item.id, item.state])).toEqual([
    ['r-2', 'running'],
    ['r-1', 'interrupted'],
  ]);
  expect(request.mock.calls).toEqual([['GET', jobRunsPath('fr-par', 'j-1', 20)]]);
});

test('a job is started from its definition', async () => {
  const { request, jobs } = setup({});

  await jobs.start('fr-par', 'j-1');

  expect(request.mock.calls).toStrictEqual([
    ['POST', '/serverless-jobs/v1alpha2/regions/fr-par/job-definitions/j-1/start', {}],
  ]);
});

test('a job run can be stopped', async () => {
  const { request, jobs } = setup({});

  await jobs.stopRun('fr-par', 'r-1');

  expect(request.mock.calls).toStrictEqual([
    ['POST', '/serverless-jobs/v1alpha2/regions/fr-par/job-runs/r-1/stop', {}],
  ]);
});

test('ids from a link stay one path segment', async () => {
  // A crafted link can't walk the path or add query parameters.
  const { request, jobs } = setup({});

  await jobs.stopRun('fr-par', '../job-definitions/j-1');
  await jobs.runs('fr-par', 'j-1&project_id=p-2');

  expect(request.mock.calls).toStrictEqual([
    ['POST', '/serverless-jobs/v1alpha2/regions/fr-par/job-runs/..%2Fjob-definitions%2Fj-1/stop', {}],
    ['GET', jobRunsPath('fr-par', 'j-1%26project_id%3Dp-2', 20)],
  ]);
});
