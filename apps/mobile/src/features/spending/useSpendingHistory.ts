import { monthKeyOf, monthRange } from '@scaleway-manager/core';
import type { AppError, MonthKey, MonthSpending, SpendingPort } from '@scaleway-manager/core';
import { queryOptions, skipToken, useQueries } from '@tanstack/react-query';

import { useServices } from '../../wiring/ServicesProvider';
import { queryFailure } from '../errors/queryFailure';
import { useWorkspace } from '../workspace/useWorkspace';

// Late charges still land on this month and the last, so they refresh; older months are final
const RECENT_STALE_MS = 5 * 60 * 1000;

export type SpendingHistory = {
  // Oldest first, this month last; empty until every month is in (the chart needs them all)
  months: MonthSpending[];
  // Every month already in (on the phone or just loaded): the amount and its card show a month as soon as it's here
  loaded: MonthSpending[];
  isLoading: boolean;
  error: AppError | null;
  // Loads again what failed
  retry: () => void;
};

// One month of the whole organization's spending: one query for every project (its byProject splits it).
export function monthQuery(spending: SpendingPort, organizationId: string | undefined, month: MonthKey, now: Date) {
  const recent = monthRange(monthKeyOf(now), 6).slice(-2);

  return queryOptions({
    queryKey: ['spending', organizationId, month],
    queryFn: organizationId === undefined ? skipToken : () => spending.getMonth(organizationId, month),
    staleTime: recent.includes(month) ? RECENT_STALE_MS : Infinity,
  });
}

// The organization's spending for the last 6 or 12 months, one cached query per month.
export function useSpendingHistory(range: 6 | 12): SpendingHistory {
  const { spending, clock } = useServices();
  const workspace = useWorkspace();
  const now = clock.now();
  const results = useQueries({
    queries: monthRange(monthKeyOf(now), range).map((month) =>
      monthQuery(spending, workspace.user?.organizationId, month, now),
    ),
  });
  const loaded = results.flatMap((result) => (result.data === undefined ? [] : [result.data]));
  const error = queryFailure(
    workspace,
    results.find((result) => result.data === undefined && result.error !== null)?.error ?? null,
  );
  const complete = loaded.length === results.length;

  return {
    months: complete ? loaded : [],
    loaded,
    isLoading: !complete && error === null,
    error,
    retry: () => {
      workspace.retry();
      for (const result of results) {
        if (result.isError) {
          void result.refetch();
        }
      }
    },
  };
}
