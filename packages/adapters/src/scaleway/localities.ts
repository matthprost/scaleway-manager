// Where each product's API answers (the Go SDK's Zones() / Regions()).
export const INSTANCE_ZONES = [
  'fr-par-1',
  'fr-par-2',
  'fr-par-3',
  'nl-ams-1',
  'nl-ams-2',
  'nl-ams-3',
  'pl-waw-1',
  'pl-waw-2',
  'pl-waw-3',
  'it-mil-1',
] as const;

export const ELASTIC_METAL_ZONES = ['fr-par-1', 'fr-par-2', 'nl-ams-1', 'nl-ams-2', 'pl-waw-2', 'pl-waw-3'] as const;

export const K8S_REGIONS = ['fr-par', 'nl-ams', 'pl-waw', 'it-mil'] as const;

export const RDB_REGIONS = ['fr-par', 'nl-ams', 'pl-waw'] as const;

export const CONTAINER_REGIONS = ['fr-par', 'nl-ams', 'pl-waw', 'it-mil'] as const;

export const FUNCTION_REGIONS = ['fr-par', 'nl-ams', 'pl-waw'] as const;

export const JOBS_REGIONS = ['fr-par', 'nl-ams', 'pl-waw'] as const;

export const LB_ZONES = [
  'fr-par-1',
  'fr-par-2',
  'nl-ams-1',
  'nl-ams-2',
  'nl-ams-3',
  'pl-waw-1',
  'pl-waw-2',
  'pl-waw-3',
] as const;

export const COCKPIT_REGIONS = ['fr-par', 'nl-ams', 'pl-waw', 'it-mil'] as const;

export const AUDIT_TRAIL_REGIONS = ['fr-par', 'nl-ams'] as const;
