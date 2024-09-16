import {Injectable} from "@angular/core";
import {Storage} from "@ionic/storage";

import {ApiService} from "../../api/api.service";
import {UserDto, UsersDto} from "../account/account.dto";

import {ProjectDto, ProjectsDto} from "./project.dto";

@Injectable({
  providedIn: "root",
})
export class ProjectService {
  constructor(private api: ApiService, private storage: Storage) {
  }

  public async getProjects(organizationId?: string) {
    if (!organizationId) {
      organizationId = await this.storage.get("currentOrganization");
    }

    // tslint:disable-next-line:max-line-length
    const result = await this.api.get<ProjectsDto>(
      `${this.api.getAccountApiUrlV2()}/projects?organization_id=${organizationId}&page_size=50&page=1`
    );
    return result.projects;
  }

  public setCurrentProject(project: ProjectDto): Promise<any> {
    return this.storage.set("currentProject", project);
  }

  public getCurrentProject(): Promise<ProjectDto> {
    return this.storage.get("currentProject");
  }

  public async getCurrentProjectId(): Promise<string> {
    const currentProject = await this.storage.get("currentProject");
    return currentProject.id;
  }

  public async setDefaultProject(organizationId?: string) {
    if (!organizationId) {
      organizationId = await this.storage.get("currentOrganization");
    }

    const projects = await this.getProjects(organizationId);
    let currentProject = projects.find(
      (project) => project.id === organizationId
    );
    if (!currentProject) {
      currentProject = {
        id: organizationId,
        name: "default",
        organization_id: organizationId,
        created_at: "",
        description: "",
        updated_at: "",
      };
    }
    await this.setCurrentProject(currentProject);
  }

  public async patchSshKeys(keys: { key: string }[]): Promise<UserDto> {
    const iamUser = await this.storage.get("iam");
    const result = await this.api.patch<UsersDto>(
      this.api.getAccountApiUrlV2() + "/users/" + iamUser.account_root_user_id,
      {
        ssh_public_keys: keys,
      }
    );

    return result.user;
  }
}
