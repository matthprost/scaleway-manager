import type { Organization, Project } from '../domain/workspace';

export type WorkspacePort = {
  getOrganization(id: string): Promise<Organization>;
  listProjects(organizationId: string): Promise<Project[]>;
};
