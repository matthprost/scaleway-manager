import {Injectable} from '@angular/core';
import {ApiProvider} from "../api/api";
import {ServerDto} from "./server.dto";
import {ActionDto} from "./action.dto";
import {ErrorsProvider} from "../errors/errors";

@Injectable()
export class ServersProvider {

  private parisServers: Array<ServerDto> = null;
  private netherlandsServers: Array<ServerDto> = null;

  constructor(private api: ApiProvider, private errorsProvider: ErrorsProvider) {
  }

  public getAllServer(token: string): Promise<any> {
    return new Promise((resolve, reject) => {
      // Get all servers from PARIS
      const paris = this.getAllServerByCountry('Paris', token).then(result => {
        this.parisServers = result;
      }).catch(error => {
        this.errorsProvider.apiError(error);
        reject(error);
      });

      // Get all servers from NETHERLANDS
      const netherlands = this.getAllServerByCountry('Netherlands', token).then(result => {
        this.netherlandsServers = result;
      }).catch(error => {
        this.errorsProvider.apiError(error);
        reject(error);
      });

      // Sync all promises, when they all finished, we display the information
      Promise.all([paris, netherlands]).then(() => {
        if (this.parisServers && this.netherlandsServers) {
          resolve({'paris': this.parisServers, 'netherlands': this.netherlandsServers});
        } else {
          reject('error');
        }
      }).catch(error => {
        this.errorsProvider.apiError(error);
        reject(error);
      });
    });
  }

  public getAllServerByCountry(country: string, token: string): Promise<any> {
    let ApiUrl: string = null;
    country === 'Paris' ? ApiUrl = this.api.getParisApiUrl() : ApiUrl = this.api.getAmsterdamApiUrl();

    return new Promise((resolve, reject) => {
      this.api.get<ServerDto[]>(ApiUrl + '/servers', token)
        .then(result => {
          resolve(result);
        })
        .catch(error => {
          this.errorsProvider.apiError(error);
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
          this.errorsProvider.apiError(error);
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
          this.errorsProvider.apiError(error);
          reject(error);
        })
    });
  }

}
