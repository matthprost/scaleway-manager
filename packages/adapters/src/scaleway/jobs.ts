import type { JobDefinition, JobRun, JobRunState, JobsPort } from '@scaleway-manager/core';

import { forEachLocality } from './forEachLocality';
import type { ScalewayHttp } from './http';
import { JOBS_REGIONS } from './localities';
import { PAGE_SIZE, paginate } from './paginate';

type DefinitionResponse = {
  id: string;
  name: string;
  cron_schedule?: { schedule: string; timezone: string } | null;
};

type RunResponse = {
  id: string;
  job_definition_id: string;
  state: string;
  started_at?: string | null;
  terminated_at?: string | null;
  exit_code?: number | null;
  error_message?: string | null;
};

// Scaleway's states today; a new one becomes 'unknown_state'.
const RUN_STATES: JobRunState[] = [
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
];

// Field by field: environment variables are never kept.
const toRun = (run: RunResponse): JobRun => ({
  id: run.id,
  definitionId: run.job_definition_id,
  state: RUN_STATES.find((state) => state === run.state) ?? 'unknown_state',
  startedAt: run.started_at ?? null,
  finishedAt: run.terminated_at ?? null,
  exitCode: run.exit_code ?? null,
  errorMessage: run.error_message ?? null,
});

const toDefinition = (
  region: string,
  definition: DefinitionResponse,
  lastRun: JobDefinition['lastRun'],
): JobDefinition => ({
  id: definition.id,
  region,
  name: definition.name,
  cronSchedule: definition.cron_schedule?.schedule ?? null,
  // Scaleway may send "" for no time zone
  cronTimezone: definition.cron_schedule?.timezone || null,
  lastRun,
});

// Region and ids can come from a link: encoded so they stay one path segment (or one query value) each.
const regionPath = (region: string) => `/serverless-jobs/v1alpha2/regions/${encodeURIComponent(region)}`;

const definitionPath = (region: string, id: string) =>
  `${regionPath(region)}/job-definitions/${encodeURIComponent(id)}`;

export const createScalewayJobs = (deps: { http: ScalewayHttp }): JobsPort => {
  // The newest `count` runs of one job.
  const runsOf = async (region: string, definitionId: string, count: number) => {
    const data = await deps.http.request<{ job_runs: RunResponse[] }>(
      'GET',
      `${regionPath(region)}/job-runs` +
        `?job_definition_id=${encodeURIComponent(definitionId)}&order_by=created_at_desc&page_size=${count}`,
    );

    return data.job_runs.map(toRun);
  };

  // A job's last run; 'unavailable' when it can't load, so the job still shows.
  const lastRunOf = (region: string, definitionId: string): Promise<JobDefinition['lastRun']> =>
    runsOf(region, definitionId, 1).then(
      (runs) => runs[0] ?? null,
      () => 'unavailable',
    );

  return {
    list(projectId) {
      return forEachLocality(JOBS_REGIONS, async (region) => {
        const definitions = await paginate(async (page) => {
          const data = await deps.http.request<{ job_definitions: DefinitionResponse[]; total_count: number }>(
            'GET',
            `${regionPath(region)}/job-definitions?project_id=${projectId}&page_size=${PAGE_SIZE}&page=${page}`,
          );

          return { items: data.job_definitions, total: data.total_count };
        });
        if (definitions.length === 0) {
          return [];
        }

        // The project's newest runs, newest first: a job's first run there is its last one.
        const data = await deps.http
          .request<{ job_runs: RunResponse[]; total_count: number }>(
            'GET',
            `${regionPath(region)}/job-runs?project_id=${projectId}&order_by=created_at_desc&page_size=${PAGE_SIZE}`,
          )
          .catch(() => null);
        if (data === null) {
          // The jobs still show, their last run unavailable.
          return definitions.map((definition) => toDefinition(region, definition, 'unavailable'));
        }
        const lastRuns = new Map<string, JobRun>();
        for (const run of data.job_runs) {
          if (!lastRuns.has(run.job_definition_id)) {
            lastRuns.set(run.job_definition_id, toRun(run));
          }
        }
        // A job missing from a page that didn't hold every run asks for its own last run.
        const hasEveryRun = data.job_runs.length >= data.total_count;

        return Promise.all(
          definitions.map(async (definition) =>
            toDefinition(
              region,
              definition,
              lastRuns.get(definition.id) ?? (hasEveryRun ? null : await lastRunOf(region, definition.id)),
            ),
          ),
        );
      });
    },

    async get(region, id) {
      // The definition first, so a deleted job answers not found. Its answer isn't wrapped.
      const definition = await deps.http.request<DefinitionResponse>('GET', definitionPath(region, id));

      return toDefinition(region, definition, await lastRunOf(region, id));
    },

    // The newest 20 only: the screen lists the latest ones.
    runs(region, definitionId) {
      return runsOf(region, definitionId, 20);
    },

    async start(region, definitionId) {
      await deps.http.request('POST', `${definitionPath(region, definitionId)}/start`, {});
    },

    async stopRun(region, runId) {
      await deps.http.request('POST', `${regionPath(region)}/job-runs/${encodeURIComponent(runId)}/stop`, {});
    },
  };
};
