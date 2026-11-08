import type { ElasticMetalAction, ElasticMetalServer, PingPoint } from '../domain/elasticMetal';

export type ElasticMetalPort = {
  list(projectId: string): Promise<ElasticMetalServer[]>;
  get(zone: string, id: string): Promise<ElasticMetalServer>;
  act(zone: string, id: string, action: ElasticMetalAction): Promise<void>;
  pings(zone: string, id: string): Promise<PingPoint[]>;
};
