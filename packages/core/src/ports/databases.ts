import type { DatabaseBackup, DatabaseInstance, MetricSeries } from '../domain/databases';

export type DatabasesPort = {
  list(projectId: string): Promise<DatabaseInstance[]>;
  get(region: string, id: string): Promise<DatabaseInstance>;
  metrics(region: string, id: string, since: Date, until: Date): Promise<MetricSeries[]>;
  backups(region: string, id: string): Promise<DatabaseBackup[]>;
  databaseNames(region: string, id: string): Promise<string[]>;
  restart(region: string, id: string): Promise<void>;
  backup(
    region: string,
    id: string,
    input: { databaseName: string; name: string; expiresAt: string },
  ): Promise<void>;
};
