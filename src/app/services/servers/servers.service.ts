import { Injectable } from '@angular/core';
import {ServerDto} from './server.dto';
import {ApiService} from '../api/api.service';
import {ActionDto} from './action.dto';

@Injectable({
  providedIn: 'root'
})
export class ServersService {

  private parisServers: Array<ServerDto> = null;
  private netherlandsServers: Array<ServerDto> = null;

  constructor(private api: ApiService) { }

  public getAllServer(): Promise<any> {
    return new Promise((resolve, reject) => {
      // Get all servers from PARIS
      const paris = this.getAllServerByCountry('Paris').then(result => {
        this.parisServers = result;
      }).catch(error => {
        reject(error);
      });

      // Get all servers from NETHERLANDS
      const netherlands = this.getAllServerByCountry('Netherlands').then(result => {
        this.netherlandsServers = result;
      }).catch(error => {
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
        reject(error);
      });
    });
  }

  public getAllServerByCountry(country: string): Promise<any> {
    let ApiUrl: string = null;
    country === 'Paris' ? ApiUrl = this.api.getParisApiUrl() : ApiUrl = this.api.getAmsterdamApiUrl();

    return new Promise((resolve, reject) => {
      this.api.get<ServerDto[]>(ApiUrl + '/servers')
        .then(result => {
          resolve(result);
        })
        .catch(error => {
          reject(error);
        });
    });
  }

  public getSpecificServer(country: string, serverId: string): Promise<any> {
    let ApiUrl: string = null;
    country === 'Paris' ? ApiUrl = this.api.getParisApiUrl() : ApiUrl = this.api.getAmsterdamApiUrl();

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
    country === 'Paris' ? ApiUrl = this.api.getParisApiUrl() : ApiUrl = this.api.getAmsterdamApiUrl();

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
}
