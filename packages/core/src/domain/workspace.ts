export type Organization = { id: string; name: string };

export type Project = { id: string; name: string; organizationId: string };

// Saved project, else the one named "default", else the first, else null.
export function pickProject(projects: Project[], savedId: string | null): Project | null {
  return (
    projects.find((project) => project.id === savedId) ??
    projects.find((project) => project.name === 'default') ??
    projects[0] ??
    null
  );
}
