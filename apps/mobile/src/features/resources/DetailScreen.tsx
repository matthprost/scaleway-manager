import { AppError } from '@scaleway-manager/core';
import type { Health, ProductKey, ResourceSummary } from '@scaleway-manager/core';
import { EmptyState, Screen, ScreenHeader, Section, Stack } from '@scaleway-manager/ui';
import type { ScreenRows } from '@scaleway-manager/ui';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

import { useServices } from '../../wiring/ServicesProvider';
import { useIsOnline } from '../connectivity/useIsOnline';
import { ActionFailed } from '../errors/ActionFailed';
import { LoadFailed } from '../errors/LoadFailed';
import { queryFailure } from '../errors/queryFailure';
import { useWorkspace } from '../workspace/useWorkspace';
import { PRODUCTS, resourceKey, sourceKey } from './products';
import type { ProductItem } from './products';
import { usePins } from './usePins';
import { usePullToRefresh } from './usePullToRefresh';

// While it changes, the screen asks again every 3 s, for 2 minutes at most
const POLL_EVERY = 3_000;
const POLL_FOR = 2 * 60_000;

type Round = {
  since: number;
  // The health before the action; null when the resource was found busy on its own
  before: Health | null;
  sawBusy: boolean;
  // 2 minutes passed while it was still busy: no more asking until it settles
  ended: boolean;
};

// Decides after each answer whether to ask again in 3 s: while the resource is busy, and after an action until its
// change shows (Scaleway may still answer the old state for a moment). `onActionOver` runs when an action's round ends.
const createPolling = (onActionOver: () => void) => {
  let round: Round | null = null;

  return {
    follow(before: Health) {
      round = { since: Date.now(), before, sawBusy: false, ended: false };
    },
    // Safe to call more than once for the same answer
    next(health: Health): number | false {
      const now = Date.now();

      if (round?.ended && health !== 'busy') {
        round = null;
      }
      if (round === null && health === 'busy') {
        round = { since: now, before: null, sawBusy: true, ended: false };
      }
      if (round === null || round.ended) {
        return false;
      }
      const sawBusy = round.sawBusy || health === 'busy';
      // Done once it's no longer busy, and has moved: through busy (a reboot comes back running), or to another health
      const settled = health !== 'busy' && (sawBusy || health !== round.before);

      if (!settled && now - round.since < POLL_FOR) {
        round = { ...round, sawBusy };

        return POLL_EVERY;
      }
      if (round.before !== null) {
        onActionOver();
      }
      round = settled ? null : { ...round, ended: true };

      return false;
    },
  };
};

type ResourceDetail = {
  // An action on this resource worked: refresh it and its list, and follow its change unless there's none to watch
  acted: (options: { follow: boolean }) => void;
  // An action failed: ask the resource again (not its list), since a request that timed out may still have worked
  failed: () => void;
};

const ResourceDetailContext = createContext<ResourceDetail | null>(null);

// The resource whose screen this is (useResourceAction tells it when an action worked).
export function useResourceDetail(): ResourceDetail {
  const detail = useContext(ResourceDetailContext);

  if (detail === null) {
    throw new Error('useResourceDetail must be used inside a DetailScreen');
  }

  return detail;
}

type DetailScreenProps<P extends ProductKey, Row> = {
  product: P;
  locality: string;
  id: string;
  // The content once the resource is known, in this order: the hero, notices, facts and charts, then the actions
  children: (resource: { item: ProductItem[P]; summary: ResourceSummary; pinned: boolean }) => ReactNode;
  // A list that can grow long, last on the screen (a cluster's nodes): the screen draws only the rows near it
  rows?: (resource: { item: ProductItem[P] }) => ScreenRows<Row>;
};

// A resource's screen: its name with Back and the pin, while it loads, fails or no longer exists, and asking again
// while it changes.
export function DetailScreen<P extends ProductKey, Row = never>({
  product,
  locality,
  id,
  children,
  rows,
}: DetailScreenProps<P, Row>) {
  const services = useServices();
  const workspace = useWorkspace();
  const queryClient = useQueryClient();
  const router = useRouter();
  const isOnline = useIsOnline();
  const pins = usePins();
  const spec = PRODUCTS[product];
  const key = `${product}:${locality}:${id}`;
  const queryKey = resourceKey(product, locality, id);
  const listKey = [...sourceKey(spec.source), workspace.project?.id];
  // Home and the product's list catch up once an action's change shows
  const [polling] = useState(() =>
    createPolling(() => void queryClient.invalidateQueries({ queryKey: sourceKey(spec.source) })),
  );
  const query = useQuery({
    queryKey,
    queryFn: async () => {
      try {
        const fresh = await spec.get(services, locality, id);
        const listed = queryClient
          .getQueryData<ProductItem[P][]>(listKey)
          ?.find((item) => spec.toSummary(item).key === key);
        const changed =
          listed !== undefined && JSON.stringify(spec.toSummary(listed)) !== JSON.stringify(spec.toSummary(fresh));

        // Home and the product's list show what this screen learns (no extra call; the list keeps its age)
        if (changed) {
          queryClient.setQueryData<ProductItem[P][]>(
            listKey,
            (items) => items?.map((item) => (item === listed ? fresh : item)),
            { updatedAt: queryClient.getQueryState(listKey)?.dataUpdatedAt },
          );
        }

        return fresh;
      } catch (error) {
        // Deleted on the console: it leaves Home and its list (a pin that can't be saved stays, harmless)
        if (error instanceof AppError && error.kind === 'not_found') {
          await pins.remove(key).catch(() => undefined);
          void queryClient.invalidateQueries({ queryKey: sourceKey(spec.source) });
        }
        throw error;
      }
    },
    // Opens at once (offline too) from its list's item, then refreshes
    initialData: () =>
      queryClient.getQueryData<ProductItem[P][]>(listKey)?.find((item) => spec.toSummary(item).key === key),
    initialDataUpdatedAt: () => queryClient.getQueryState(listKey)?.dataUpdatedAt,
    refetchInterval: (current) => {
      const { data, error } = current.state;
      const deleted = error instanceof AppError && error.kind === 'not_found';

      return data === undefined || deleted ? false : polling.next(spec.toSummary(data).health);
    },
  });
  const { refreshing, refresh } = usePullToRefresh(() => queryClient.refetchQueries({ queryKey }));
  const item = query.data;
  const summary = item === undefined ? null : spec.toSummary(item);
  const gone = query.error instanceof AppError && query.error.kind === 'not_found';
  // A refresh that failed (pulled, polled or after an action) keeps the resource on screen, with the quiet line above
  const refreshFailed = query.isRefetchError && !gone;
  const pinned = pins.pinned.includes(key);
  // Nothing to show: it failed, or it waits for the network with nothing saved
  const failure =
    item !== undefined
      ? null
      : query.fetchStatus === 'paused'
        ? new AppError('offline', 'Waiting for the network')
        : queryFailure(workspace, query.error);

  const acted = ({ follow }: { follow: boolean }) => {
    if (follow && summary !== null) {
      polling.follow(summary.health);
    }
    void queryClient.invalidateQueries({ queryKey: sourceKey(spec.source) });
    void queryClient.invalidateQueries({ queryKey });
  };

  const failed = () => void queryClient.invalidateQueries({ queryKey });

  // Offline, no pull to refresh: it would wait for the network with its spinner up (the offline pill says why)
  return (
    <ResourceDetailContext.Provider value={{ acted, failed }}>
      <Screen
        topInset="belowNotice"
        onRefresh={isOnline && !gone ? refresh : undefined}
        refreshing={refreshing}
        rows={item === undefined || gone ? undefined : rows?.({ item })}
      >
        <Stack>
          <ScreenHeader
            title={summary?.name ?? spec.title}
            onBack={router.back}
            action={
              summary === null || gone
                ? undefined
                : {
                    icon: pinned ? 'star-filled' : 'star',
                    label: pinned ? 'Unpin from Home' : 'Pin to Home',
                    // Kept on the phone, so offline too; a save that fails leaves the star as it was
                    onPress: () => void pins.toggle(key).catch(() => undefined),
                    selected: pinned,
                    disabled: pins.isLoading,
                  }
            }
          />

          {refreshFailed ? <ActionFailed /> : null}

          {gone ? (
            <EmptyState
              icon="info"
              title="This resource no longer exists"
              action={{ label: 'Go back', onPress: router.back }}
            />
          ) : item !== undefined && summary !== null ? (
            children({ item, summary, pinned })
          ) : failure?.kind === 'forbidden' ? (
            <EmptyState
              icon="server"
              title="Resources aren't available"
              message="You don't have access to resources in this project."
            />
          ) : failure !== null ? (
            <LoadFailed title="Couldn't load this resource" onRetry={() => void query.refetch()} />
          ) : (
            <Section loading />
          )}
        </Stack>
      </Screen>
    </ResourceDetailContext.Provider>
  );
}
