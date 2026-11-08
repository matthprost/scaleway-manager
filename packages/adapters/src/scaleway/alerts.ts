import { AppError } from '@scaleway-manager/core';
import type { AlertsPort } from '@scaleway-manager/core';

import type { ScalewayHttp } from './http';
import { COCKPIT_REGIONS } from './localities';

// Cockpit sends every alert in one answer: this endpoint has no pages.
type AlertsResponse = {
  alerts: {
    name: string;
    state: 'unknown_state' | 'inactive' | 'pending' | 'firing' | null;
    annotations: Record<string, string> | null;
    // Only on preconfigured alerts.
    preconfigured_data: { display_name: string } | null;
  }[];
};

export const createScalewayAlerts = (deps: { http: ScalewayHttp }): AlertsPort => ({
  async listFiring(projectId) {
    const regions = await Promise.all(
      COCKPIT_REGIONS.map(async (region) => {
        const data = await deps.http
          .request<AlertsResponse>('GET', `/cockpit/v1/regions/${region}/alerts?project_id=${projectId}&state=firing`)
          .catch((error: unknown) => {
            // Cockpit isn't set up (or allowed) in this region: no alerts there.
            if (error instanceof AppError && (error.kind === 'not_found' || error.kind === 'forbidden')) {
              return { alerts: [] };
            }
            throw error;
          });

        return data.alerts
          .filter((alert) => alert.state === 'firing')
          .map((alert) => ({
            id: `${region}:${alert.name}`,
            name: alert.preconfigured_data?.display_name || alert.name,
            region,
            summary: alert.annotations?.summary ?? alert.annotations?.description ?? null,
          }));
      }),
    );

    return regions.flat();
  },
});
