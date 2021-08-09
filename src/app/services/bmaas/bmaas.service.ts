import { Injectable } from "@angular/core";
import { Storage } from "@ionic/storage";

import { ApiService } from "../api/api.service";
import {ProjectService} from '../user/project/project.service';

@Injectable({
  providedIn: "root",
})
export class BmaasService {
  constructor(private api: ApiService, private storage: Storage, private projectService: ProjectService) {}

  public async getAllServer(nbr = 100) {
    const apiUrl = `${this.api.getBmaasUrl()}fr-par-2`;
    const projectId = await this.projectService.getCurrentProjectId();

    const result = await this.api.get<any>(
      `${apiUrl}/servers?project=${projectId}&per_page=${nbr}&page=1`
    );

    return result.servers;
  }
}
