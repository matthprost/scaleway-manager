import { pickProject } from './workspace';
import type { Project } from './workspace';

const project = (id: string, name: string): Project => ({ id, name, organizationId: 'org' });

const projects = [project('a', 'Staging'), project('b', 'default'), project('c', 'Production')];

describe('pickProject', () => {
  it('keeps the saved project', () => {
    expect(pickProject(projects, 'c')?.id).toBe('c');
  });

  it('falls back when the saved project is gone', () => {
    expect(pickProject(projects, 'gone')?.id).toBe('b');
    expect(pickProject([project('a', 'Staging'), project('c', 'Production')], 'gone')?.id).toBe('a');
    expect(pickProject(projects, null)?.id).toBe('b');
  });

  it('returns null when there are no projects', () => {
    expect(pickProject([], 'a')).toBeNull();
  });
});
