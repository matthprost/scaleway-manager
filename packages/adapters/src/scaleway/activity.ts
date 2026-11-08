import { humanizeMethod } from '@scaleway-manager/core';
import type { ActivityEvent, ActivityPort } from '@scaleway-manager/core';

import type { ScalewayHttp } from './http';
import { AUDIT_TRAIL_REGIONS } from './localities';

// Newest events kept, across every region.
const MAX_EVENTS = 50;

// Audit Trail's product names, as people know them. One it doesn't know is made readable ('quantum-computer' ->
// 'Quantum computer').
const PRODUCT_LABELS: Partial<Record<string, string>> = {
  instance: 'Instances',
  baremetal: 'Elastic Metal',
  'elastic-metal': 'Elastic Metal',
  'apple-silicon': 'Apple silicon',
  k8s: 'Kubernetes',
  kubernetes: 'Kubernetes',
  rdb: 'Databases',
  mongodb: 'MongoDB',
  redis: 'Redis',
  lb: 'Load Balancers',
  container: 'Serverless Containers',
  function: 'Serverless Functions',
  jobs: 'Serverless Jobs',
  registry: 'Container Registry',
  block: 'Block Storage',
  s3: 'Object Storage',
  'object-storage': 'Object Storage',
  vpc: 'Private Networks',
  'vpc-gw': 'Public Gateways',
  ipam: 'IP addresses',
  domain: 'Domains and DNS',
  tem: 'Transactional Email',
  webhosting: 'Web Hosting',
  'edge-services': 'Edge Services',
  cockpit: 'Cockpit',
  iam: 'IAM',
  'secret-manager': 'Secret Manager',
  'key-manager': 'Key Manager',
  'audit-trail': 'Audit Trail',
  account: 'Account',
  billing: 'Billing',
};

const productLabel = (name: string): string | null => {
  if (name === '') {
    return null;
  }
  const words = name.replace(/[-_]+/g, ' ');

  return PRODUCT_LABELS[name] ?? words.charAt(0).toUpperCase() + words.slice(1);
};

// Each event sets exactly one of `api`, `auth` or `system`.
type CombinedEventsResponse = {
  events: {
    api?: {
      id: string;
      recorded_at: string;
      principal?: { id: string } | null;
      product_name: string;
      method_name: string;
      status_code: number;
    };
    auth?: {
      id: string;
      recorded_at: string;
      result: 'unknown_result' | 'success' | 'failure';
      resources: { id: string; type: string }[];
    };
    system?: { id: string; recorded_at: string; product_name: string; system_name: string; kind: string };
  }[];
};

export const createScalewayActivity = (deps: { http: ScalewayHttp }): ActivityPort => ({
  async listRecent(organizationId) {
    // Any failure, a 403 included, rejects the whole list.
    const regions = await Promise.all(
      AUDIT_TRAIL_REGIONS.map((region) =>
        deps.http.request<CombinedEventsResponse>(
          'GET',
          `/audit-trail/v1alpha1/regions/${region}/combined-events?organization_id=${organizationId}&order_by=recorded_at_desc&page_size=${MAX_EVENTS}`,
        ),
      ),
    );

    return regions
      .flatMap((region) => region.events)
      .flatMap(({ api, auth, system }): ActivityEvent[] => {
        if (api) {
          return [
            {
              id: api.id,
              at: api.recorded_at,
              kind: 'api',
              actorId: api.principal?.id ?? null,
              title: humanizeMethod(api.method_name),
              product: productLabel(api.product_name),
              result: api.status_code < 400 ? 'success' : 'failure',
            },
          ];
        }
        if (auth) {
          const failed = auth.result === 'failure';

          return [
            {
              id: auth.id,
              at: auth.recorded_at,
              kind: 'login',
              // A login has no principal: the user is its attached resource.
              actorId: auth.resources.find((resource) => resource.type === 'account_user')?.id ?? null,
              title: failed ? 'Login failed' : 'Logged in',
              product: null,
              result: failed ? 'failure' : 'success',
            },
          ];
        }
        if (system) {
          return [
            {
              id: system.id,
              at: system.recorded_at,
              kind: 'system',
              actorId: null,
              title: system.system_name || humanizeMethod(system.kind),
              product: productLabel(system.product_name),
              result: null,
            },
          ];
        }

        return [];
      })
      .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
      .slice(0, MAX_EVENTS);
  },
});
