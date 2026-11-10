import { AppError } from '@scaleway-manager/core';
import type { ProductKey, ResourceSummary } from '@scaleway-manager/core';
import { useQueries } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';

import { useServices } from '../../wiring/ServicesProvider';
import { useWorkspace } from '../workspace/useWorkspace';
import { PRODUCT_KEYS, PRODUCTS, SOURCE_KEYS, sourceList } from './products';

export type ResourceSummaries = {
  summaries: ResourceSummary[];
  // The (product, place) pairs in use: Scaleway status matches a product only on its own zones and regions
  inUse: { product: ProductKey; locality: string }[];
  // Until every product has answered (or failed), and while the project isn't known yet
  isLoading: boolean;
  // A product failed (or waits for the network) for another reason than permission: what's in use may be missing
  incomplete: boolean;
  // Those products, in the Resources tab's order (containers and functions fail together)
  failedProducts: ProductKey[];
  // Nothing came back and a product is incomplete: not the same as "nothing running"
  failed: boolean;
  // Every product refused (403): nothing to show, nothing to retry
  forbidden: boolean;
  // A product's last refresh failed, pulled or not (what was shown stays); a later one that works clears it
  refreshFailed: boolean;
  // Asks again what failed
  retry: () => void;
  // Pull to refresh: asks every product again
  refresh: () => Promise<void>;
};

// The chosen project's resources, one query per product. A product that fails is left out of the summaries (its
// name is in failedProducts); one that refuses (403) is simply not in use.
export function useResourceSummaries(): ResourceSummaries {
  const services = useServices();
  const workspace = useWorkspace();
  const projectId = workspace.project?.id;
  const results = useQueries({ queries: SOURCE_KEYS.map((source) => sourceList(services, source, projectId)) });
  // No answer: it failed, or it waits for the network (offline, nothing saved)
  const unanswered = (result: UseQueryResult<ResourceSummary[]>) =>
    result.data === undefined && (result.isError || result.fetchStatus === 'paused');
  // A 403: the project's resources of that product aren't this user's to see
  const refused = (result: UseQueryResult<ResourceSummary[]>) =>
    result.data === undefined && result.error instanceof AppError && result.error.kind === 'forbidden';
  const settled = projectId !== undefined && results.every((result) => result.data !== undefined || unanswered(result));
  const failedSources = SOURCE_KEYS.filter((_source, index) => {
    const result = results[index];

    return result !== undefined && unanswered(result) && !refused(result);
  });
  const incomplete = failedSources.length > 0;
  const summaries = results.flatMap((result) => result.data ?? []);
  const nothing = settled && summaries.length === 0;
  const pairs = new Map(summaries.map(({ product, locality }) => [`${product}:${locality}`, { product, locality }]));

  return {
    summaries,
    inUse: [...pairs.values()],
    isLoading: !settled,
    incomplete,
    failedProducts: PRODUCT_KEYS.filter((product) => failedSources.includes(PRODUCTS[product].source)),
    failed: nothing && incomplete,
    forbidden: nothing && results.every(refused),
    refreshFailed: results.some((result) => result.isRefetchError),
    retry: () => {
      workspace.retry();
      for (const result of results) {
        if (result.isError) {
          void result.refetch();
        }
      }
    },
    refresh: async () => {
      workspace.retry();
      if (projectId !== undefined) {
        await Promise.all(results.map((result) => result.refetch()));
      }
    },
  };
}
