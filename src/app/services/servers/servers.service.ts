import { Injectable } from "@angular/core";
import { Storage } from "@ionic/storage";

import { ApiService } from "../api/api.service";

import { ActionsDto } from "./actions.dto";
import { zones } from "./config";
import { ServerDto } from "./server.dto";

@Injectable({
  providedIn: "root",
})
export class ServersService {
  constructor(private api: ApiService, private storage: Storage) {}

  private mergeZones(zonesValue: any[]) {
    const valuesList = zonesValue.map((zone) => zone.servers);
    return [].concat(...valuesList);
  }

  private sortServers(servers: ServerDto[]): ServerDto[] {
    const runningServers = servers.filter((obj) => obj.state === "running");
    const startAndStopServers = servers.filter(
      (obj) => obj.state === "starting" || obj.state === "stopping"
    );
    const stoppedServers = servers.filter((obj) => obj.state === "stopped");
    const stoppedInPlaceServers = servers.filter(
      (obj) => obj.state === "stopped in place"
    );

    return runningServers.concat(
      startAndStopServers,
      stoppedInPlaceServers,
      stoppedServers
    );
  }

  public async getAllServer(nbrOfServ = 6) {
    const promises = zones.map((zone) => this.getAllServerByCountry(zone));
    const result = await Promise.all(promises);

    return this.sortServers(this.mergeZones(result)).slice(0, nbrOfServ);
  }

  public async getAllServerByCountry(
    country: string,
    nbrOfServ = 50
  ): Promise<any> {
    const apiUrl = `${this.api.getInstanceUrl()}${country}`;
    const currentProject = await this.storage.get("currentProject");

    // tslint:disable-next-line:max-line-length
    const result = await this.api.get<{ servers: ServerDto[] }>(
      `${apiUrl}/servers?project=${currentProject.id}&per_page=${nbrOfServ}&page=1`
    );
    result.servers.forEach((value) => {
      value.country = country;
    });

    return result;
  }

  public getServerById(country: string, serverId: string): Promise<any> {
    const apiUrl = `${this.api.getInstanceUrl()}${country}`;

    return new Promise((resolve, reject) => {
      this.api
        .get<ServerDto>(apiUrl + "/servers/" + serverId)
        .then((result) => {
          resolve(result);
        })
        .catch((error) => {
          reject(error);
        });
    });
  }

  public sendServerAction(
    country: string,
    serverId: string,
    action: string
  ): Promise<any> {
    const apiUrl = `${this.api.getInstanceUrl()}${country}`;

    return new Promise((resolve, reject) => {
      this.api
        .post<ActionsDto>(apiUrl + "/servers/" + serverId + "/action", {
          action,
        })
        .then((result) => {
          resolve(result);
        })
        .catch((error) => {
          reject(error);
        });
    });
  }

  public async serverDelete(
    country: string,
    serverId: string,
    serverIp?: string
  ) {
    const apiUrl = `${this.api.getInstanceUrl()}${country}`;

    try {
      await this.api.post<ActionsDto>(`${apiUrl}/servers/${serverId}/action`, {
        action: "terminate",
      });
      if (serverIp) {
        await this.api.delete(`${apiUrl}/ips/${serverIp}`);
      }
    } catch (e) {
      throw e;
    }
  }
}
