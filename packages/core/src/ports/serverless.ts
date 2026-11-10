import type { ServerlessApp } from '../domain/serverless';

export type ServerlessPort = {
  list(projectId: string): Promise<ServerlessApp[]>;
  get(region: string, kind: ServerlessApp['kind'], id: string): Promise<ServerlessApp>;
  redeploy(region: string, kind: ServerlessApp['kind'], id: string): Promise<void>;
};
