import {Injectable} from '@angular/core';
import {ApiProvider} from "../api/api";
import {ServerDto} from "./server.dto";
import {ActionDto} from "./action.dto";

@Injectable()
export class ServersProvider {

  constructor(private api: ApiProvider) {
  }

  public getAllServers(country: string, token: string): Promise<any> {
    let ApiUrl: string = null;
    country === 'Paris' ? ApiUrl = this.api.getParisApiUrl() : ApiUrl = this.api.getAmsterdamApiUrl();

    return new Promise((resolve, reject) => {
      this.api.get<ServerDto[]>(ApiUrl + '/servers', token)
        .then(result => {
          resolve(result);
        })
        .catch(error => {
          reject(error);
        })
    });
  }

  public getSpecificServer(country: string, token: string, serverId: string): Promise<any> {
    let ApiUrl: string = null;
    country === 'Paris' ? ApiUrl = this.api.getParisApiUrl() : ApiUrl = this.api.getAmsterdamApiUrl();

    return new Promise((resolve, reject) => {
      this.api.get<ServerDto>(ApiUrl + '/servers/' + serverId, token)
        .then(result => {
          resolve(result);
        })
        .catch(error => {
          reject(error);
        })
    });
  }

  public sendServerAction(country: string, serverId: string, token: string, action: string): Promise<any> {
    let ApiUrl: string = null;
    country === 'Paris' ? ApiUrl = this.api.getParisApiUrl() : ApiUrl = this.api.getAmsterdamApiUrl();

    return new Promise((resolve, reject) => {
      this.api.post<ActionDto>(ApiUrl + '/servers/' + serverId + '/action', token, {
        "action": action
      })
        .then(result => {
          resolve(result);
        })
        .catch(error => {
          reject(error);
        })
    });
  }

}
