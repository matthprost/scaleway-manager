import type { ServiceIncident } from '../domain/status';

export type StatusPort = {
  listOpenIncidents(): Promise<ServiceIncident[]>;
};
