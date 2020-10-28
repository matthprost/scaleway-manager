export interface ProjectsDto {
  projects: Array<ProjectDto>;
}

export interface ProjectDto {
  created_at: string;
  description: string;
  id: string;
  name: string;
  organization_id: string;
  updated_at: string;
}
