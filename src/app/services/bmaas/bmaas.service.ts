import { Injectable } from "@angular/core";
import { Storage } from "@ionic/storage";

import {mergeZones} from '../../helpers/mergeZones';
import { ApiService } from "../api/api.service";
import {ProjectService} from '../user/project/project.service';

import {BmaasDto} from './bmaas.dto';
import {areas} from './config';

@Injectable({
  providedIn: "root",
})
export class BmaasService {
  constructor(private api: ApiService, private storage: Storage, private projectService: ProjectService) {}

  private static sortServers(servers: BmaasDto[]): BmaasDto[] {
    const runningServers = servers.filter((obj) => obj.state === 'running');
    const startAndStopServers = servers.filter(
      (obj) => obj.state === 'starting' || obj.state === 'stopping'
    );
    const stoppedServers = servers.filter((obj) => obj.state === 'stopped');
    const stoppedInPlaceServers = servers.filter(
      (obj) => obj.state === 'stopped in place'
    );

    return runningServers.concat(
      startAndStopServers,
      stoppedInPlaceServers,
      stoppedServers
    );
  }

  public async getAllServerByArea(
    area: string,
    perPage = 100,
    page = 1,
  ): Promise<any> {
    const apiUrl = `${this.api.getBmaasUrl()}${area}`;
    const projectId = await this.projectService.getCurrentProjectId();

    const result = await this.api.get<{ servers: BmaasDto[] }>(
      `${apiUrl}/servers?project=${projectId}&per_page=${perPage}&page=${page}`
    );

    return result.servers.map((value) => ({
      ...value, area
    }));
  }

  public async getAllServer(perPage = 100, page = 1): Promise<BmaasDto[]> {
    const promises = areas.map((area) => this.getAllServerByArea(area, perPage, page));
    const result = await Promise.all(promises);

    return BmaasService.sortServers(mergeZones(result)).slice(0, perPage);
  }
}
