import type { JobDefinition, JobRun } from '../domain/jobs';

export type JobsPort = {
  list(projectId: string): Promise<JobDefinition[]>;
  get(region: string, id: string): Promise<JobDefinition>;
  runs(region: string, definitionId: string): Promise<JobRun[]>;
  start(region: string, definitionId: string): Promise<void>;
  stopRun(region: string, runId: string): Promise<void>;
};
