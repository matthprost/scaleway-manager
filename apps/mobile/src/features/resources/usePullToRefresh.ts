import { useState } from 'react';

// Pull to refresh: the spinner stays while `refetch` runs.
export function usePullToRefresh(refetch: () => Promise<unknown>) {
  const [refreshing, setRefreshing] = useState(false);

  const refresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  };

  return { refreshing, refresh };
}
