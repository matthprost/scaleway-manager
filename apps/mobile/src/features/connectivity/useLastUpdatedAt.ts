import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useSyncExternalStore } from 'react';

// When the newest data in the cache was loaded, or null if there is none.
export function useLastUpdatedAt(): Date | null {
  const cache = useQueryClient().getQueryCache();
  const subscribe = useCallback(
    (onChange: () => void) =>
      cache.subscribe((event) => {
        // Only data coming or going can change the time. Queries and their watchers are made while screens render
        // (a new one has no data yet): telling then would update the pill in the middle of that screen's render.
        if (event.type === 'updated' || event.type === 'removed' || (event.type === 'added' && event.query.state.dataUpdatedAt > 0)) {
          onChange();
        }
      }),
    [cache],
  );
  const getSnapshot = useCallback(
    () => Math.max(0, ...cache.getAll().map((query) => query.state.dataUpdatedAt)),
    [cache],
  );
  const latest = useSyncExternalStore(subscribe, getSnapshot);

  return useMemo(() => (latest > 0 ? new Date(latest) : null), [latest]);
}
