import type { ScalewayHttp } from './http';
import { createScalewayWorkspace } from './workspace';

const project = (n: number) => ({
  id: `p-${n}`,
  name: `Project ${n}`,
  organization_id: 'org-1',
  description: '',
  created_at: '2026-01-01T00:00:00Z',
});

const projectsPath = (page: number) => `/account/v3/projects?organization_id=org-1&page_size=100&page=${page}`;

test('workspace reads the organization name', async () => {
  const request = jest
    .fn()
    .mockResolvedValueOnce({ id: 'org-1', name: 'Acme', alias: 'acme', login_password_enabled: true });
  const workspace = createScalewayWorkspace({ http: { request } as unknown as ScalewayHttp });

  await expect(workspace.getOrganization('org-1')).resolves.toEqual({ id: 'org-1', name: 'Acme' });
  expect(request.mock.calls).toEqual([['GET', '/iam/v1alpha1/organizations/org-1']]);
});

test('workspace lists every project', async () => {
  const request = jest
    .fn()
    .mockResolvedValueOnce({ total_count: 101, projects: Array.from({ length: 100 }, (_, i) => project(i + 1)) })
    .mockResolvedValueOnce({ total_count: 101, projects: [project(101)] });
  const workspace = createScalewayWorkspace({ http: { request } as unknown as ScalewayHttp });

  const projects = await workspace.listProjects('org-1');

  expect(projects).toHaveLength(101);
  expect(projects[0]).toEqual({ id: 'p-1', name: 'Project 1', organizationId: 'org-1' });
  expect(projects[100]).toEqual({ id: 'p-101', name: 'Project 101', organizationId: 'org-1' });
  expect(request.mock.calls).toEqual([
    ['GET', projectsPath(1)],
    ['GET', projectsPath(2)],
  ]);
});

test('workspace encodes the organization id in the path', async () => {
  const request = jest.fn().mockResolvedValueOnce({ id: 'x', name: 'Acme' });
  const workspace = createScalewayWorkspace({ http: { request } as unknown as ScalewayHttp });

  await workspace.getOrganization('a/../b?x=1');

  expect(request.mock.calls).toEqual([['GET', '/iam/v1alpha1/organizations/a%2F..%2Fb%3Fx%3D1']]);
});
