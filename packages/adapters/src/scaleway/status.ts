import type { StatusPort } from '@scaleway-manager/core';

import { SCALEWAY_STATUS_URL } from './constants';
import { errorFromResponse, readJson, safeFetch } from './http';

type UnresolvedResponse = {
  incidents: {
    id: string;
    name: string;
    status: string;
    impact: string;
    updated_at: string;
    // Newest first.
    incident_updates: { body: string }[];
    components: { name: string }[];
  }[];
};

// The public status page needs no session, so it skips ScalewayHttp but keeps its time limit.
export const createScalewayStatus = (deps: { fetch: typeof fetch }): StatusPort => ({
  async listOpenIncidents() {
    const response = await safeFetch(deps.fetch, `${SCALEWAY_STATUS_URL}/api/v2/incidents/unresolved.json`, {
      method: 'GET',
    });
    if (!response.ok) {
      throw await errorFromResponse(response);
    }
    const data = (await readJson(response)) as UnresolvedResponse;

    return data.incidents.map((incident) => ({
      id: incident.id,
      name: incident.name,
      status: incident.status,
      impact: incident.impact,
      components: incident.components.map((component) => component.name),
      latestUpdate: incident.incident_updates[0]?.body ?? null,
      updatedAt: incident.updated_at,
      // The page itself, not the `shortlink` on a third-party host.
      url: `${SCALEWAY_STATUS_URL}/incidents/${incident.id}`,
    }));
  },
});
