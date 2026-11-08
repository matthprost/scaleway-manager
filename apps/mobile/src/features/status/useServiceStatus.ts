import { incidentsAffecting } from '@scaleway-manager/core';
import type { ServiceIncident } from '@scaleway-manager/core';
import { useQuery } from '@tanstack/react-query';

import { useServices } from '../../wiring/ServicesProvider';
import { useResourceSummaries } from '../resources/useResourceSummaries';

const NO_INCIDENTS: ServiceIncident[] = [];

export type ServiceStatus = {
  // Open incidents on the products and zones the project uses, and on shared services
  incidents: ServiceIncident[];
  // Until the status page and the project's resources have answered
  isLoading: boolean;
  // Nothing to say: the status page can't be reached, or a product is missing and nothing matched (never a
  // possibly wrong "all good")
  unavailable: boolean;
};

// Scaleway's open incidents that affect the chosen project (from the public status page).
export function useServiceStatus(): ServiceStatus {
  const { status } = useServices();
  const resources = useResourceSummaries();
  const query = useQuery({ queryKey: ['status'], queryFn: () => status.listOpenIncidents() });
  const unreachable = query.data === undefined && (query.isError || query.fetchStatus === 'paused');
  // Matched on the products that answered; shared services (APIs, IAM…) always count
  const incidents =
    query.data === undefined ? NO_INCIDENTS : incidentsAffecting(query.data, resources.inUse);
  // Only once the status page answered: until then, its placeholder
  const unavailable =
    unreachable ||
    (query.data !== undefined && resources.incomplete && !resources.isLoading && incidents.length === 0);

  return {
    incidents,
    isLoading: !unavailable && (query.data === undefined || resources.isLoading),
    unavailable,
  };
}
