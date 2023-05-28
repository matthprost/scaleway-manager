import { Injectable } from "@angular/core";

import { ApiService } from "../../../api/api.service";
import { ProjectService } from "../project.service";

import { SshKeysDto } from "./ssh-keys.dto";

@Injectable({
  providedIn: "root",
})
export class SshKeysService {
  constructor(
    private api: ApiService,
    private projectService: ProjectService
  ) {}

  public async getSShKeys() {
    try {
      const currentProject = await this.projectService.getCurrentProject();
      const result = await this.api.get<SshKeysDto>(
        `${this.api.getApiUrl()}/iam/v1alpha1/ssh-keys/?project_id=${
          currentProject.id
        }`
      );

      return result.ssh_keys;
    } catch (e) {
      throw e;
    }
  }

  public async addSShKey(sshKey: string) {
    try {
      const currentProject = await this.projectService.getCurrentProject();
      await this.api.post(`${this.api.getApiUrl()}/iam/v1alpha1/ssh-keys`, {
        project_id: currentProject.id,
        public_key: sshKey,
      });
    } catch (e) {
      throw e;
    }
  }

  public async deleteSShKey(sshKeyId: string) {
    try {
      await this.api.delete(
        `${this.api.getApiUrl()}/iam/v1alpha1/ssh-key/${sshKeyId}`
      );
    } catch (e) {
      throw e;
    }
  }
}
