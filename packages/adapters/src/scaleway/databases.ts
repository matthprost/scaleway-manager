import type { DatabaseInstance, DatabasesPort, MetricSeries } from '@scaleway-manager/core';

import { forEachLocality } from './forEachLocality';
import type { ScalewayHttp } from './http';
import { RDB_REGIONS } from './localities';
import { PAGE_SIZE, paginate } from './paginate';

type EndpointResponse = {
  // One of the two is set.
  ip?: string | null;
  hostname?: string | null;
  port: number;
  // Set (to `{}`) only on the public endpoint.
  load_balancer?: object | null;
};

type InstanceResponse = {
  id: string;
  name: string;
  engine: string;
  status: string;
  node_type: string;
  is_ha_cluster: boolean;
  endpoints: EndpointResponse[] | null;
};

type BackupResponse = {
  id: string;
  name: string;
  database_name: string;
  status: string;
  size: number | null;
  created_at: string;
  expires_at: string | null;
};

// A series is kept when its name says `percent` (the API gives no unit) and holds one of these words.
// Matched by word until T16 logs Scaleway's real names; then map exact names (`cpu_iowait_percent` isn't CPU use).
const METRIC_WORDS: [string, MetricSeries['metric']][] = [
  ['cpu', 'cpu'],
  ['mem', 'memory'],
  ['disk', 'disk'],
];

// Field by field: nothing else from Scaleway's object is kept.
const toInstance = (region: string, instance: InstanceResponse): DatabaseInstance => {
  const endpoints = instance.endpoints ?? [];
  // The public endpoint first, else the first one (a Private Network address).
  const endpoint = endpoints.find((item) => item.load_balancer) ?? endpoints[0];

  return {
    id: instance.id,
    region,
    name: instance.name,
    engine: instance.engine,
    status: instance.status,
    nodeType: instance.node_type,
    endpoint: endpoint === undefined ? null : `${endpoint.ip ?? endpoint.hostname}:${endpoint.port}`,
    isHa: instance.is_ha_cluster,
  };
};

// Region and id can come from a link: encoded so they stay one path segment each.
const regionPath = (region: string) => `/rdb/v1/regions/${encodeURIComponent(region)}`;

const instancePath = (region: string, id: string) => `${regionPath(region)}/instances/${encodeURIComponent(id)}`;

export const createScalewayDatabases = (deps: { http: ScalewayHttp }): DatabasesPort => ({
  list(projectId) {
    return forEachLocality(RDB_REGIONS, (region) =>
      paginate(async (page) => {
        const data = await deps.http.request<{ instances: InstanceResponse[]; total_count: number }>(
          'GET',
          `${regionPath(region)}/instances?project_id=${projectId}&page_size=${PAGE_SIZE}&page=${page}`,
        );

        return { items: data.instances.map((instance) => toInstance(region, instance)), total: data.total_count };
      }),
    );
  },

  async get(region, id) {
    // This answer is the instance itself, not wrapped.
    return toInstance(region, await deps.http.request<InstanceResponse>('GET', instancePath(region, id)));
  },

  // Scaleway marks this call deprecated: the screen hides the charts if it fails.
  async metrics(region, id, since, until) {
    const data = await deps.http.request<{ timeseries: { name: string; points: [string, number][] | null }[] | null }>(
      'GET',
      `${instancePath(region, id)}/metrics?start_date=${since.toISOString()}&end_date=${until.toISOString()}`,
    );

    // One series per metric: with one per node (a highly available instance), the first is kept.
    const kept = new Map<MetricSeries['metric'], MetricSeries>();
    for (const series of data.timeseries ?? []) {
      const metric = series.name.includes('percent')
        ? METRIC_WORDS.find(([word]) => series.name.includes(word))?.[1]
        : undefined;
      if (metric !== undefined && !kept.has(metric)) {
        kept.set(metric, { metric, unit: '%', points: (series.points ?? []).map(([at, value]) => ({ at, value })) });
      }
    }

    return [...kept.values()];
  },

  async backups(region, id) {
    // The newest 20 only: the screen lists the latest ones.
    const data = await deps.http.request<{ database_backups: BackupResponse[] }>(
      'GET',
      `${regionPath(region)}/backups?instance_id=${encodeURIComponent(id)}&order_by=created_at_desc&page_size=20`,
    );

    return data.database_backups.map((backup) => ({
      id: backup.id,
      name: backup.name,
      databaseName: backup.database_name,
      status: backup.status,
      sizeBytes: backup.size ?? null,
      createdAt: backup.created_at,
      expiresAt: backup.expires_at ?? null,
    }));
  },

  // Every database, `managed` ones included (they're the user's own). Sizes are slow to compute and unused.
  databaseNames(region, id) {
    return paginate(async (page) => {
      const data = await deps.http.request<{ databases: { name: string }[]; total_count: number }>(
        'GET',
        `${instancePath(region, id)}/databases?skip_size_retrieval=true&page_size=${PAGE_SIZE}&page=${page}`,
      );

      return { items: data.databases.map((database) => database.name), total: data.total_count };
    });
  },

  async restart(region, id) {
    await deps.http.request('POST', `${instancePath(region, id)}/restart`, {});
  },

  async backup(region, id, input) {
    await deps.http.request('POST', `${regionPath(region)}/backups`, {
      instance_id: id,
      database_name: input.databaseName,
      name: input.name,
      expires_at: input.expiresAt,
    });
  },
});
