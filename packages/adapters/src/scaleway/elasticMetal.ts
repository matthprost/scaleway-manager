import type { ElasticMetalPort, ElasticMetalServer, ElasticMetalStatus } from '@scaleway-manager/core';

import { forEachLocality } from './forEachLocality';
import type { ScalewayHttp } from './http';
import { ELASTIC_METAL_ZONES } from './localities';
import { PAGE_SIZE, paginate } from './paginate';

type ServerResponse = {
  id: string;
  name: string;
  status: string;
  ping_status: string;
  offer_name: string;
  ips: { address: string }[];
  created_at: string;
};

// Scaleway's 13 statuses today; a new one becomes 'unknown'.
const STATUSES: ElasticMetalStatus[] = [
  'ready',
  'stopped',
  'starting',
  'stopping',
  'resetting',
  'delivering',
  'ordered',
  'migrating',
  'deleting',
  'error',
  'locked',
  'out_of_stock',
  'unknown',
];

const PINGS = new Map<string, ElasticMetalServer['ping']>([
  ['ping_status_up', 'up'],
  ['ping_status_down', 'down'],
]);

// Field by field: nothing else from Scaleway's object (user_data included) is kept.
const toServer = (zone: string, server: ServerResponse): ElasticMetalServer => ({
  id: server.id,
  zone,
  name: server.name,
  status: STATUSES.find((status) => status === server.status) ?? 'unknown',
  ping: PINGS.get(server.ping_status) ?? 'unknown',
  offerName: server.offer_name,
  ips: server.ips.map((ip) => ip.address),
  createdAt: server.created_at,
});

// Zone and id can come from a link: encoded so they stay one path segment each.
const serverPath = (zone: string, id: string) =>
  `/baremetal/v1/zones/${encodeURIComponent(zone)}/servers/${encodeURIComponent(id)}`;

export const createScalewayElasticMetal = (deps: { http: ScalewayHttp }): ElasticMetalPort => ({
  list(projectId) {
    return forEachLocality(ELASTIC_METAL_ZONES, (zone) =>
      paginate(async (page) => {
        const data = await deps.http.request<{ servers: ServerResponse[]; total_count: number }>(
          'GET',
          `/baremetal/v1/zones/${zone}/servers?project_id=${projectId}&page_size=${PAGE_SIZE}&page=${page}`,
        );

        return { items: data.servers.map((server) => toServer(zone, server)), total: data.total_count };
      }),
    );
  },

  async get(zone, id) {
    return toServer(zone, await deps.http.request<ServerResponse>('GET', serverPath(zone, id)));
  },

  async act(zone, id, action) {
    await deps.http.request('POST', `${serverPath(zone, id)}/${action}`, {});
  },

  async pings(zone, id) {
    // Points are [time, value]: 1 when the server answered, 0 when it didn't.
    const data = await deps.http.request<{ pings: { points: [string, number][] | null } | null }>(
      'GET',
      `${serverPath(zone, id)}/metrics`,
    );

    return (data.pings?.points ?? []).map(([at, value]) => ({ at, up: value > 0 }));
  },
});
