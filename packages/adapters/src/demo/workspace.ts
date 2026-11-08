import type { WorkspacePort } from '@scaleway-manager/core';

import { DEMO_ORGANIZATION, DEMO_PROJECTS } from './data';

export const createDemoWorkspace = (): WorkspacePort => ({
  getOrganization: async () => DEMO_ORGANIZATION,
  listProjects: async () => [...DEMO_PROJECTS],
});
