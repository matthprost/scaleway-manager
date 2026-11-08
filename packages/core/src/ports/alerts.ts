import type { MonitoringAlert } from '../domain/alerts';

export type AlertsPort = {
  listFiring(projectId: string): Promise<MonitoringAlert[]>;
};
