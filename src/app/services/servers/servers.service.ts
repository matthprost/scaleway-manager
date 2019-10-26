import {Injectable} from '@angular/core';
import {ServerDto} from './server.dto';
import {ApiService} from '../api/api.service';
import {ActionDto} from './action.dto';

@Injectable({
  providedIn: 'root'
})
export class ServersService {

  private parisServers: Array<ServerDto> = null;
  private netherlandsServers: Array<ServerDto> = null;

  constructor(private api: ApiService) {
  }

  private sortServers(servers: Array<ServerDto>): Array<ServerDto> {

    const runningServers = servers.filter(obj => obj.state === 'running');
    const startAndStopServers = servers.filter(obj => obj.state === 'starting' || obj.state === 'stopping');
    const stoppedServers = servers.filter(obj => obj.state === 'stopped');
    const stoppedInPlaceServers = servers.filter(obj => obj.state === 'stopped in place');

    return runningServers.concat(startAndStopServers, stoppedInPlaceServers, stoppedServers);
  }

  public getAllServer(nbrOfServ: number): Promise<Array<ServerDto>> {

    return new Promise((resolve, reject) => {
      // Get all servers from PARIS
      const paris = this.getAllServerByCountry('fr-par-1', Math.ceil(nbrOfServ / 2)).then(result => {
        this.parisServers = result.servers;
      }).catch(error => {
        reject(error);
      });

      // Get all servers from NETHERLANDS
      const netherlands = this.getAllServerByCountry('nl-ams-1', Math.ceil(nbrOfServ / 2)).then(result => {
        this.netherlandsServers = result.servers;
      }).catch(error => {
        reject(error);
      });

      // Sync all promises, when they all finished, we display the information
      Promise.all([paris, netherlands]).then(() => {
        if (this.parisServers && this.netherlandsServers) {
          resolve(this.sortServers(this.parisServers.concat(this.netherlandsServers)));
        } else {
          reject('error');
        }
      }).catch(error => {
        reject(error);
      });
    });
  }

  public getAllServerByCountry(country: string, nbrOfServ: number): Promise<any> {
    let ApiUrl: string = null;
    country === 'fr-par-1' ? ApiUrl = this.api.getParisApiUrl() : ApiUrl = this.api.getAmsterdamApiUrl();

    return new Promise((resolve, reject) => {
      this.api.get<{ servers: ServerDto[] }>(ApiUrl + '/servers?per_page=' + nbrOfServ)
        .then(result => {
          result.servers.forEach(value => {
            value.country = country;
          });

          resolve(result);
        })
        .catch(error => {
          reject(error);
        });
    });
  }

  public getServerById(country: string, serverId: string): Promise<any> {
    let ApiUrl: string = null;
    country === 'fr-par-1' ? ApiUrl = this.api.getParisApiUrl() : ApiUrl = this.api.getAmsterdamApiUrl();

    return new Promise((resolve, reject) => {
      this.api.get<ServerDto>(ApiUrl + '/servers/' + serverId)
        .then(result => {
          resolve(result);
        })
        .catch(error => {
          reject(error);
        });
    });
  }

  public sendServerAction(country: string, serverId: string, action: string): Promise<any> {
    let ApiUrl: string = null;
    country === 'fr-par-1' ? ApiUrl = this.api.getParisApiUrl() : ApiUrl = this.api.getAmsterdamApiUrl();

    return new Promise((resolve, reject) => {
      this.api.post<ActionDto>(ApiUrl + '/servers/' + serverId + '/action', {
        'action': action
      })
        .then(result => {
          resolve(result);
        })
        .catch(error => {
          reject(error);
        });
    });
  }

  public serverDelete(country: string, serverId: string, serverIp?: string) {
    let ApiUrl: string = null;
    country === 'fr-par-1' ? ApiUrl = this.api.getParisApiUrl() : ApiUrl = this.api.getAmsterdamApiUrl();

    return new Promise((resolve, reject) => {
      this.api.post<ActionDto>(ApiUrl + '/servers/' + serverId + '/action', {
        'action': 'terminate'
      })
        .then(result => {

          if (serverIp) {
            this.api.delete(ApiUrl + '/ips/' + serverIp)
              .then(() => {
                resolve('ok');
              })
              .catch(error => {
                reject(error);
              });
          } else {
            resolve('ok');
          }
        })
        .catch(error => {
          reject(error);
        });
    });
  }
}
