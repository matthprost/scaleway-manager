import type { AppError } from '@scaleway-manager/core';
import { formatDayMonth, formatTime } from '@scaleway-manager/core';
import { skipToken, useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { useServices } from '../../wiring/ServicesProvider';
import { queryFailure } from '../errors/queryFailure';
import { useWorkspace } from '../workspace/useWorkspace';

export type ActivityRow = {
  id: string;
  title: string;
  // "You · Instances", "Someone else · Instances · Failed", "Scaleway · Kubernetes"
  subtitle: string;
  // 24-hour, on the phone's clock
  time: string;
  failed: boolean;
};

export type ActivityDay = {
  key: string;
  // "Today", "Yesterday", "16 November"
  title: string;
  rows: ActivityRow[];
};

type Activity = {
  // Newest first; undefined until they're on the phone
  days: ActivityDay[] | undefined;
  // Only while there's nothing to show: saved events stay on screen when a refresh fails
  error: AppError | null;
  // Loads again what failed
  retry: () => void;
  // Pull to refresh
  refresh: () => Promise<void>;
  refreshing: boolean;
  // The last refresh failed, pulled or not (the events shown stay); a later one that works clears it
  refreshFailed: boolean;
};

// One day on the phone's calendar
const dayKey = (date: Date) => `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;

// What happened in the organization lately (logins included), grouped by day; the current user is "You".
export function useActivity(): Activity {
  const { activity, clock } = useServices();
  const workspace = useWorkspace();
  const organizationId = workspace.user?.organizationId;
  const userId = workspace.user?.id;
  const query = useQuery({
    queryKey: ['activity', organizationId],
    queryFn: organizationId === undefined ? skipToken : () => activity.listRecent(organizationId),
  });
  const [refreshing, setRefreshing] = useState(false);

  const now = clock.now();
  const today = dayKey(now);
  const yesterday = dayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
  const days: ActivityDay[] = [];

  for (const event of query.data ?? []) {
    const at = new Date(event.at);
    const key = dayKey(at);
    const who = event.kind === 'system' ? 'Scaleway' : event.actorId !== null && event.actorId === userId ? 'You' : 'Someone else';
    const failed = event.result === 'failure';
    const row = {
      id: event.id,
      title: event.title,
      subtitle: [who, event.product, failed ? 'Failed' : null].filter((part) => part !== null).join(' · '),
      time: formatTime(at),
      failed,
    };
    const last = days[days.length - 1];

    if (last?.key === key) {
      last.rows.push(row);
    } else {
      days.push({
        key,
        title:
          key === today
            ? 'Today'
            : key === yesterday
              ? 'Yesterday'
              : formatDayMonth(at),
        rows: [row],
      });
    }
  }

  const refresh = async () => {
    setRefreshing(true);
    workspace.retry();
    try {
      if (organizationId !== undefined) {
        await query.refetch();
      }
    } finally {
      setRefreshing(false);
    }
  };

  return {
    days: query.data === undefined ? undefined : days,
    error: queryFailure(workspace, query.data === undefined ? query.error : null),
    retry: () => {
      workspace.retry();
      if (query.isError) {
        void query.refetch();
      }
    },
    refresh,
    refreshing,
    refreshFailed: query.isRefetchError,
  };
}
