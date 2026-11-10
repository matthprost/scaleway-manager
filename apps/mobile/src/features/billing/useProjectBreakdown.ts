import type { MonthSpending, ProjectSpend } from '@scaleway-manager/core';
import { useState } from 'react';

import { useWorkspace } from '../workspace/useWorkspace';

export type ProjectBreakdown = {
  // Products or Projects: not saved, Products again next launch
  view: 'products' | 'projects';
  setView: (view: 'products' | 'projects') => void;
  // The switch shows: 2 or more projects spent that month, and the user can see the organization's projects
  switchable: boolean;
  // That month's projects, largest first, with their names; null until the names are in
  rows: (ProjectSpend & { name: string })[] | null;
  // The names couldn't load (not refused): the Projects view says so, with Try again
  failed: boolean;
  retry: () => void;
};

// Billing's Products | Projects choice, and the month's projects with their names.
export function useProjectBreakdown(spending: MonthSpending | undefined): ProjectBreakdown {
  const { projects, projectsRefused, status, retry } = useWorkspace();
  const [view, setView] = useState<'products' | 'projects'>('products');
  // Nothing to name them with (refused, or an empty list): no switch, as with one project
  const unnamed = projectsRefused || (status === 'ready' && projects.length === 0);
  const failed = projects.length === 0 && status === 'error' && !projectsRefused;
  const loading = projects.length === 0 && status === 'loading';

  return {
    view,
    setView,
    switchable: !unnamed && spending !== undefined && spending.byProject.length > 1,
    rows:
      loading || failed
        ? null
        : (spending?.byProject ?? []).map((part) => ({
            ...part,
            // Deleted since, or one this user can't see
            name: projects.find((project) => project.id === part.projectId)?.name ?? 'Unknown project',
          })),
    failed,
    retry,
  };
}
