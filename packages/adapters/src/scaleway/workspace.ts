import type { WorkspacePort } from '@scaleway-manager/core';

import type { ScalewayHttp } from './http';
import { PAGE_SIZE, paginate } from './paginate';

type OrganizationResponse = { id: string; name: string };

type ProjectsResponse = {
  projects: { id: string; name: string; organization_id: string }[];
  total_count: number;
};

export const createScalewayWorkspace = (deps: { http: ScalewayHttp }): WorkspacePort => ({
  async getOrganization(id) {
    const organization = await deps.http.request<OrganizationResponse>('GET', `/iam/v1alpha1/organizations/${encodeURIComponent(id)}`);

    return { id: organization.id, name: organization.name };
  },

  listProjects(organizationId) {
    return paginate(async (page) => {
      const data = await deps.http.request<ProjectsResponse>(
        'GET',
        `/account/v3/projects?organization_id=${organizationId}&page_size=${PAGE_SIZE}&page=${page}`,
      );

      return {
        items: data.projects.map((project) => ({
          id: project.id,
          name: project.name,
          organizationId: project.organization_id,
        })),
        total: data.total_count,
      };
    });
  },
});
