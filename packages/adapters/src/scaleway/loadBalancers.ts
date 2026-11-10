import { backendState } from '@scaleway-manager/core';
import type { BackendHealth, LoadBalancer, LoadBalancersPort } from '@scaleway-manager/core';

import { forEachLocality } from './forEachLocality';
import type { ScalewayHttp } from './http';
import { LB_ZONES } from './localities';
import { PAGE_SIZE, paginate } from './paginate';

type LoadBalancerResponse = {
  id: string;
  name: string;
  status: string;
  ip: { ip_address: string }[] | null;
};

// One load balancer node's view of one backend server.
type StatResponse = {
  backend_id: string;
  ip: string;
  server_state: string;
  server_state_changed_at?: string | null;
  last_health_check_status: string;
};

// The worse state wins when load balancer nodes disagree.
const SEVERITY: Record<BackendHealth['state'], number> = { up: 0, checking: 1, down: 2 };

// Zone and id can come from a link: encoded so they stay one path segment each.
const lbPath = (zone: string, id: string) => `/lb/v1/zones/${encodeURIComponent(zone)}/lbs/${encodeURIComponent(id)}`;

export const createScalewayLoadBalancers = (deps: { http: ScalewayHttp }): LoadBalancersPort => {
  // Field by field, with the health of every backend server.
  const withBackends = async (zone: string, lb: LoadBalancerResponse): Promise<LoadBalancer> => {
    const base = { id: lb.id, zone, name: lb.name, status: lb.status, ip: lb.ip?.[0]?.ip_address ?? null };
    const loaded = await Promise.all([
      paginate(async (page) => {
        const data = await deps.http.request<{ backends: { id: string; name: string }[]; total_count: number }>(
          'GET',
          `${lbPath(zone, lb.id)}/backends?page_size=${PAGE_SIZE}&page=${page}`,
        );

        return { items: data.backends, total: data.total_count };
      }),
      paginate(async (page) => {
        const data = await deps.http.request<{ backend_servers_stats: StatResponse[]; total_count: number }>(
          'GET',
          `${lbPath(zone, lb.id)}/backend-stats?page_size=${PAGE_SIZE}&page=${page}`,
        );

        return { items: data.backend_servers_stats, total: data.total_count };
      }),
    ]).catch(() => null);
    if (loaded === null) {
      // Health that can't load keeps the load balancer, its backends unknown (null).
      return { ...base, backends: null };
    }
    const [backends, stats] = loaded;
    const names = new Map(backends.map((backend) => [backend.id, backend.name]));

    // Each load balancer node reports every server: one row per backend and IP, the worst state, else the latest.
    const rows = new Map<string, BackendHealth>();
    for (const stat of stats) {
      const row: BackendHealth = {
        backendId: stat.backend_id,
        // A backend removed between the two calls keeps its id as its name.
        backendName: names.get(stat.backend_id) ?? stat.backend_id,
        ip: stat.ip,
        state: backendState({ serverState: stat.server_state, healthCheck: stat.last_health_check_status }),
        changedAt: stat.server_state_changed_at ?? null,
      };
      const key = `${row.backendId} ${row.ip}`;
      const kept = rows.get(key);
      if (
        kept === undefined ||
        SEVERITY[row.state] > SEVERITY[kept.state] ||
        (SEVERITY[row.state] === SEVERITY[kept.state] &&
          new Date(row.changedAt ?? 0).getTime() > new Date(kept.changedAt ?? 0).getTime())
      ) {
        rows.set(key, row);
      }
    }

    return { ...base, backends: [...rows.values()] };
  };

  return {
    list(projectId) {
      return forEachLocality(LB_ZONES, async (zone) => {
        const lbs = await paginate(async (page) => {
          const data = await deps.http.request<{ lbs: LoadBalancerResponse[]; total_count: number }>(
            'GET',
            `/lb/v1/zones/${zone}/lbs?project_id=${projectId}&page_size=${PAGE_SIZE}&page=${page}`,
          );

          return { items: data.lbs, total: data.total_count };
        });

        return Promise.all(lbs.map((lb) => withBackends(zone, lb)));
      });
    },

    async get(zone, id) {
      // This answer is the load balancer itself, not wrapped.
      return withBackends(zone, await deps.http.request<LoadBalancerResponse>('GET', lbPath(zone, id)));
    },
  };
};
