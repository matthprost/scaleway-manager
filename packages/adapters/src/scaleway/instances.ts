import type { InstanceServer, InstanceState, InstancesPort } from '@scaleway-manager/core';

import { forEachLocality } from './forEachLocality';
import type { ScalewayHttp } from './http';
import { INSTANCE_ZONES } from './localities';
import { PAGE_SIZE, paginate } from './paginate';

type ServerResponse = {
  id: string;
  name: string;
  state: string;
  commercial_type: string;
  image: { name: string } | null;
  public_ips: { address: string; family: 'inet' | 'inet6'; dynamic: boolean }[] | null;
  private_ip: string | null;
  // Keyed '0', '1', …; Block Storage volumes may come without a name or size.
  volumes: Record<string, { name?: string | null; size?: number | null; volume_type: string }> | null;
  creation_date: string;
  modification_date: string;
  allowed_actions: string[];
};

// Scaleway's 6 states today; a new one becomes 'unknown'.
const STATES = new Map<string, InstanceState>([
  ['running', 'running'],
  ['stopped', 'stopped'],
  ['stopped in place', 'standby'],
  ['starting', 'starting'],
  ['stopping', 'stopping'],
  ['locked', 'locked'],
]);

// Field by field: nothing else from Scaleway's object is kept.
const toServer = (zone: string, server: ServerResponse): InstanceServer => {
  const publicIps = server.public_ips ?? [];

  return {
    id: server.id,
    zone,
    name: server.name,
    state: STATES.get(server.state) ?? 'unknown',
    commercialType: server.commercial_type,
    imageName: server.image?.name ?? null,
    publicIpv4: publicIps.filter((ip) => ip.family === 'inet').map((ip) => ip.address),
    publicIpv6: publicIps.filter((ip) => ip.family === 'inet6').map((ip) => ip.address),
    hasDynamicPublicIp: publicIps.some((ip) => ip.dynamic),
    privateIp: server.private_ip ?? null,
    volumes: Object.values(server.volumes ?? {}).map((volume) => ({
      name: volume.name ?? null,
      sizeBytes: volume.size ?? null,
      type: volume.volume_type,
    })),
    createdAt: server.creation_date,
    updatedAt: server.modification_date,
    allowedActions: [...server.allowed_actions],
  };
};

// Zone and id can come from a link: encoded so they stay one path segment each.
const serverPath = (zone: string, id: string) =>
  `/instance/v1/zones/${encodeURIComponent(zone)}/servers/${encodeURIComponent(id)}`;

export const createScalewayInstances = (deps: { http: ScalewayHttp }): InstancesPort => ({
  list(projectId) {
    return forEachLocality(INSTANCE_ZONES, (zone) =>
      // No total in the body (it's in a header): paginate stops on a short page.
      paginate(async (page) => {
        const data = await deps.http.request<{ servers: ServerResponse[] }>(
          'GET',
          `/instance/v1/zones/${zone}/servers?project=${projectId}&per_page=${PAGE_SIZE}&page=${page}`,
        );

        return { items: data.servers.map((server) => toServer(zone, server)) };
      }),
    );
  },

  async get(zone, id) {
    const data = await deps.http.request<{ server: ServerResponse }>('GET', serverPath(zone, id));

    return toServer(zone, data.server);
  },

  async act(zone, id, action, backupName) {
    // Only a backup takes a name.
    const body = action === 'backup' ? { action, name: backupName } : { action };
    await deps.http.request('POST', `${serverPath(zone, id)}/action`, body);
  },
});
