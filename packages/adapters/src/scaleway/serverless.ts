import type { ServerlessApp, ServerlessPort } from '@scaleway-manager/core';

import { forEachLocality, isRefusal } from './forEachLocality';
import type { ScalewayHttp } from './http';
import { CONTAINER_REGIONS, FUNCTION_REGIONS } from './localities';
import { PAGE_SIZE, paginate } from './paginate';

// Containers API v1.
type ContainerResponse = {
  id: string;
  name: string;
  status: string;
  error_message?: string | null;
  image: string;
  // Scaleway's default URL, sometimes with `https://`.
  public_endpoint?: string | null;
  default_public_endpoint_enabled?: boolean;
  updated_at: string;
};

// Functions API v1beta1.
type FunctionResponse = {
  id: string;
  name: string;
  status: string;
  error_message?: string | null;
  runtime: string;
  domain_name?: string | null;
  updated_at: string;
};

// Field by field: environment variables and secrets are never kept. Scaleway gives a container's last error, which
// may be old: the message is only kept while the app is in error.
const toContainer = (region: string, container: ContainerResponse): ServerlessApp => {
  const host = (container.public_endpoint ?? '').replace(/^https?:\/\//, '').split('/')[0] ?? '';

  return {
    id: container.id,
    region,
    kind: 'container',
    name: container.name,
    status: container.status,
    errorMessage: container.status === 'error' ? (container.error_message ?? null) : null,
    // None when the default URL is turned off: it wouldn't open.
    domainName: host === '' || container.default_public_endpoint_enabled === false ? null : host,
    runtimeOrImage: container.image,
    updatedAt: container.updated_at,
  };
};

const toFunction = (region: string, fn: FunctionResponse): ServerlessApp => ({
  id: fn.id,
  region,
  kind: 'function',
  name: fn.name,
  status: fn.status,
  errorMessage: fn.status === 'error' ? (fn.error_message ?? null) : null,
  domainName: fn.domain_name || null,
  runtimeOrImage: fn.runtime,
  updatedAt: fn.updated_at,
});

// Region and id can come from a link: encoded so they stay one path segment each.
const containerPath = (region: string, id: string) =>
  `/containers/v1/regions/${encodeURIComponent(region)}/containers/${encodeURIComponent(id)}`;

const functionPath = (region: string, id: string) =>
  `/functions/v1beta1/regions/${encodeURIComponent(region)}/functions/${encodeURIComponent(id)}`;

export const createScalewayServerless = (deps: { http: ScalewayHttp }): ServerlessPort => ({
  async list(projectId) {
    const query = `project_id=${projectId}&page_size=${PAGE_SIZE}`;
    const containers = forEachLocality(CONTAINER_REGIONS, (region) =>
      paginate(async (page) => {
        const data = await deps.http.request<{ containers: ContainerResponse[]; total_count: number }>(
          'GET',
          `/containers/v1/regions/${region}/containers?${query}&page=${page}`,
        );

        return { items: data.containers.map((item) => toContainer(region, item)), total: data.total_count };
      }),
    );
    const functions = forEachLocality(FUNCTION_REGIONS, (region) =>
      paginate(async (page) => {
        const data = await deps.http.request<{ functions: FunctionResponse[]; total_count: number }>(
          'GET',
          `/functions/v1beta1/regions/${region}/functions?${query}&page=${page}`,
        );

        return { items: data.functions.map((item) => toFunction(region, item)), total: data.total_count };
      }),
    );
    // Two APIs, shown as two products. One refused everywhere (no access to containers, say) is left out; one that
    // fails everywhere for another reason fails the list, so the Resources tab names it instead of hiding it.
    const kinds = await Promise.allSettled([containers, functions]);
    const reasons: unknown[] = kinds.flatMap((kind) => (kind.status === 'rejected' ? [kind.reason] : []));
    const failure =
      reasons.find((reason) => !isRefusal(reason)) ?? (reasons.length === kinds.length ? reasons[0] : undefined);

    if (failure !== undefined) {
      throw failure;
    }

    return kinds.flatMap((kind) => (kind.status === 'fulfilled' ? kind.value : []));
  },

  // Both answers are the app itself, not wrapped.
  async get(region, kind, id) {
    return kind === 'container'
      ? toContainer(region, await deps.http.request<ContainerResponse>('GET', containerPath(region, id)))
      : toFunction(region, await deps.http.request<FunctionResponse>('GET', functionPath(region, id)));
  },

  // Containers roll out the latest image again; functions are rebuilt and deployed.
  async redeploy(region, kind, id) {
    await deps.http.request(
      'POST',
      kind === 'container' ? `${containerPath(region, id)}/redeploy` : `${functionPath(region, id)}/deploy`,
      {},
    );
  },
});
