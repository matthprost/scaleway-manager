import { pickProject } from '@scaleway-manager/core';
import type { Organization, Project, User } from '@scaleway-manager/core';
import { skipToken, useQuery } from '@tanstack/react-query';
import { useCallback, useContext, useEffect, useSyncExternalStore } from 'react';

import { useServices } from '../../wiring/ServicesProvider';
import { isRefused } from '../errors/queryFailure';
import { SavedProjectsContext } from './WorkspaceProvider';

export type Workspace = {
  status: 'loading' | 'ready' | 'error';
  user: User | null;
  organization: Organization | null;
  projects: Project[];
  // Scaleway refused the project list (403): this user can't see the organization's projects
  projectsRefused: boolean;
  project: Project | null;
  setProject: (id: string) => Promise<void>;
  // Loads again what failed
  retry: () => void;
};

const NO_PROJECTS: Project[] = [];

// The user, their organization and the chosen project (resources, alerts and status follow it).
export function useWorkspace(): Workspace {
  const { account, workspace } = useServices();
  const saved = useContext(SavedProjectsContext);

  if (saved === null) {
    throw new Error('useWorkspace must be used inside a WorkspaceProvider');
  }

  const projectIdByOrg = useSyncExternalStore(saved.subscribe, saved.get);
  const { save } = saved;
  const userQuery = useQuery({ queryKey: ['account', 'me'], queryFn: () => account.getCurrentUser() });
  const organizationId = userQuery.data?.organizationId;
  const organizationQuery = useQuery({
    queryKey: ['workspace', 'org', organizationId],
    queryFn: organizationId === undefined ? skipToken : () => workspace.getOrganization(organizationId),
  });
  const projectsQuery = useQuery({
    queryKey: ['workspace', 'projects', organizationId],
    queryFn: organizationId === undefined ? skipToken : () => workspace.listProjects(organizationId),
  });

  const projects = projectsQuery.data ?? NO_PROJECTS;
  const savedId = organizationId === undefined ? null : (projectIdByOrg?.[organizationId] ?? null);
  // The saved one, else "default", else the first: a deleted or unreachable project falls back silently
  const project = projectIdByOrg === null ? null : pickProject(projects, savedId);
  const pickedId = project?.id;

  // The pick is saved, so it stays the same until the user chooses another.
  useEffect(() => {
    if (organizationId === undefined || pickedId === undefined || pickedId === savedId) {
      return;
    }

    save(organizationId, pickedId).catch(() => {
      // Picked the same way next time.
    });
  }, [organizationId, pickedId, savedId, save]);

  const setProject = useCallback(
    async (id: string) => {
      if (organizationId !== undefined) {
        await save(organizationId, id);
      }
    },
    [organizationId, save],
  );

  const retry = () => {
    for (const query of [userQuery, organizationQuery, projectsQuery]) {
      if (query.isError) {
        void query.refetch();
      }
    }
  };

  const loaded =
    userQuery.data !== undefined &&
    organizationQuery.data !== undefined &&
    projectsQuery.data !== undefined &&
    projectIdByOrg !== null;
  const failed = userQuery.isError || organizationQuery.isError || projectsQuery.isError;

  return {
    status: loaded ? 'ready' : failed ? 'error' : 'loading',
    user: userQuery.data ?? null,
    organization: organizationQuery.data ?? null,
    projects,
    projectsRefused: isRefused(projectsQuery.error),
    project,
    setProject,
    retry,
  };
}
