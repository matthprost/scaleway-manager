import {Injectable} from '@angular/core';

import {mergeZones} from '../../helpers/mergeZones';
// biome-ignore lint/style/useImportType: <explanation>
import {ApiService} from '../api/api.service';
// biome-ignore lint/style/useImportType: <explanation>
import {ProjectService} from '../user/project/project.service';

import {ActionsDto} from './actions.dto';
import {areas} from './config';
import {ServerDto} from './server.dto';

@Injectable({
  providedIn: 'root',
})
export class ServersService {
  constructor(private api: ApiService, private projectService: ProjectService) {
  }

  private static sortServers(servers: ServerDto[]): ServerDto[] {
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

  public async getAllServer(perPage = 6, page = 1): Promise<ServerDto[]> {
    const promises = areas.map((area) => this.getAllServerByArea(area, perPage, page));
    const result = await Promise.all(promises);

    return ServersService.sortServers(mergeZones(result)).slice(0, perPage);
  }

  public async getAllServerByArea(
    area: string,
    perPage = 100,
    page = 1,
  ): Promise<any> {
    const apiUrl = `${this.api.getInstanceUrl()}${area}`;
    const projectId = await this.projectService.getCurrentProjectId();

    const result = await this.api.get<{ servers: ServerDto[] }>(
      `${apiUrl}/servers?project=${projectId}&per_page=${perPage}&page=${page}`
    );

    return result.servers.map((value) => ({
      ...value, area
    }));
  }

  public getServerById(area: string, serverId: string): Promise<any> {
    const apiUrl = `${this.api.getInstanceUrl()}${area}`;

    return this.api.get<ServerDto>(`${apiUrl}/servers/${serverId}`);
  }

  public sendServerAction(
    area: string,
    serverId: string,
    action: string
  ): Promise<any> {
    const apiUrl = `${this.api.getInstanceUrl()}${area}`;

    return this.api.post<ActionsDto>(`${apiUrl}/servers/${serverId}/action`, {action});
  }

  public async serverDelete(
    area: string,
    serverId: string,
    serverIp?: string
  ): Promise<void> {
    const apiUrl = `${this.api.getInstanceUrl()}${area}`;

    await this.api.post<ActionsDto>(`${apiUrl}/servers/${serverId}/action`, {
      action: 'terminate',
    });
    if (serverIp) {
      await this.api.delete(`${apiUrl}/ips/${serverIp}`);
    }
  }
}
