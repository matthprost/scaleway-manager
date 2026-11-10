import type { ProductKey } from './resources';

export type ServiceIncident = {
  id: string;
  name: string;
  status: string;
  impact: string;
  components: string[];
  latestUpdate: string | null;
  updatedAt: string;
  url: string;
};

export const STATUS_COMPONENT_BY_PRODUCT: Record<ProductKey, string> = {
  instances: 'Instances',
  'elastic-metal': 'Elastic Metal',
  kubernetes: 'Kubernetes Kapsule',
  databases: 'Databases',
  containers: 'Serverless Container',
  functions: 'Serverless Functions',
  jobs: 'Jobs',
  'load-balancers': 'Load Balancer',
};

export const ALWAYS_RELEVANT_COMPONENTS = ['APIs', 'Account', 'IAM', 'Billing'];

// A zone or a region, e.g. 'fr-par-1' or 'fr-par'.
const LOCALITY = /^[a-z]{2}-[a-z]{3}(-\d+)?$/;

// 'fr-par' and 'fr-par-1' overlap, whichever side names the region.
function overlaps(incidentLocalities: string[], usedLocality: string): boolean {
  return incidentLocalities.some(
    (locality) =>
      locality === usedLocality ||
      locality.startsWith(`${usedLocality}-`) ||
      usedLocality.startsWith(`${locality}-`),
  );
}

// Keeps incidents on shared services (any locality), and on used products in a used zone or region when the incident
// names any. An incident naming only zones or regions is kept when one of them is in use.
// `used` holds (product, locality) pairs, so a product only matches its own places.
export function incidentsAffecting(
  incidents: ServiceIncident[],
  used: { product: ProductKey; locality: string }[],
): ServiceIncident[] {
  return incidents.filter((incident) => {
    if (incident.components.some((component) => ALWAYS_RELEVANT_COMPONENTS.includes(component))) {
      return true;
    }
    const localities = incident.components.filter((component) => LOCALITY.test(component));
    const services = incident.components.filter((component) => !LOCALITY.test(component));
    if (services.length === 0) {
      return used.some(({ locality }) => overlaps(localities, locality));
    }

    return used.some(
      ({ product, locality }) =>
        services.includes(STATUS_COMPONENT_BY_PRODUCT[product]) &&
        (localities.length === 0 || overlaps(localities, locality)),
    );
  });
}
