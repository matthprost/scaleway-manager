import { AppError } from '@scaleway-manager/core';
import type { ProductKey, ResourceSummary } from '@scaleway-manager/core';
import { useQuery } from '@tanstack/react-query';

import { useServices } from '../../wiring/ServicesProvider';
import { queryFailure } from '../errors/queryFailure';
import { useWorkspace } from '../workspace/useWorkspace';
import { PRODUCTS, sourceList } from './products';
import { usePins } from './usePins';

export type ProductList = {
  // Pinned first, then by name
  summaries: ResourceSummary[];
  // The project's pinned keys (a row's star)
  pinned: string[];
  // Until the list and the pins are on the phone
  isLoading: boolean;
  // Only while there's nothing to show: a saved list stays when a refresh fails
  error: AppError | null;
  // The last refresh failed, pulled or not (the list shown stays); a later one that works clears it
  refreshFailed: boolean;
  // Asks again (Try again, pull to refresh)
  refetch: () => Promise<void>;
};

// One product's resources in the chosen project, from the same cached list as Home and the Resources tab.
export function useProductList(product: ProductKey): ProductList {
  const services = useServices();
  const workspace = useWorkspace();
  const pins = usePins();
  const projectId = workspace.project?.id;
  const query = useQuery(sourceList(services, PRODUCTS[product].source, projectId));
  const pinned = pins.pinned;
  const summaries = (query.data ?? [])
    .filter((summary) => summary.product === product)
    .sort(
      (a, b) =>
        Number(pinned.includes(b.key)) - Number(pinned.includes(a.key)) || a.name.localeCompare(b.name, 'en'),
    );
  // The projects couldn't be loaded: there's no project to ask about
  const noProject = workspace.project === null && workspace.status === 'error';
  const error =
    query.data !== undefined
      ? null
      : noProject
        ? new AppError('unknown', "The project couldn't be loaded")
        : // Waiting for the network with nothing saved: it can't load until then
          query.fetchStatus === 'paused'
          ? new AppError('offline', 'Waiting for the network')
          : queryFailure(workspace, query.error);

  return {
    summaries,
    pinned,
    isLoading: error === null && (query.data === undefined || pins.isLoading),
    error,
    refreshFailed: query.isRefetchError,
    refetch: async () => {
      workspace.retry();
      if (projectId !== undefined) {
        await query.refetch();
      }
    },
  };
}
