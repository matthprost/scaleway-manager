import type { InstanceAction, InstanceServer } from '../domain/instances';

export type InstancesPort = {
  list(projectId: string): Promise<InstanceServer[]>;
  get(zone: string, id: string): Promise<InstanceServer>;
  act(zone: string, id: string, action: InstanceAction, backupName?: string): Promise<void>;
};
