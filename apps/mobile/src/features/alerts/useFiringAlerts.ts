import { AppError } from '@scaleway-manager/core';
import type { MonitoringAlert } from '@scaleway-manager/core';
import { skipToken, useQuery, useQueryClient } from '@tanstack/react-query';
import { usePathname } from 'expo-router';
import { useEffect } from 'react';

import { useServices } from '../../wiring/ServicesProvider';
import { useWorkspace } from '../workspace/useWorkspace';

const REFRESH_MS = 60 * 1000;

const NO_ALERTS: MonitoringAlert[] = [];

// The chosen project's firing Cockpit alerts: never more than about a minute old while Home is on screen.
export function useFiringAlerts(): { alerts: MonitoringAlert[]; isLoading: boolean } {
  const { alerts } = useServices();
  const { project } = useWorkspace();
  const queryClient = useQueryClient();
  // Home stays mounted behind the other tabs: only refresh while it's the one shown
  const onHome = usePathname() === '/home';
  const projectId = project?.id;
  const query = useQuery({
    queryKey: ['alerts', projectId],
    queryFn: projectId === undefined ? skipToken : () => alerts.listFiring(projectId),
    staleTime: REFRESH_MS,
    refetchInterval: onHome ? REFRESH_MS : false,
  });

  // Back on Home: alerts older than a minute are asked again at once
  useEffect(() => {
    if (onHome && projectId !== undefined) {
      void queryClient.refetchQueries(
        { queryKey: ['alerts', projectId], stale: true, type: 'active' },
        // Joins a request already on its way
        { cancelRefetch: false },
      );
    }
  }, [onHome, projectId, queryClient]);

  // No Cockpit access (any more): nothing to show
  const forbidden = query.error instanceof AppError && query.error.kind === 'forbidden';

  return { alerts: forbidden ? NO_ALERTS : (query.data ?? NO_ALERTS), isLoading: query.isLoading };
}
