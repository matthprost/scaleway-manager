import {Injectable} from '@angular/core';
import {ServerDto} from './server.dto';
import {ApiService} from '../api/api.service';
import {ActionDto} from './action.dto';
import {Storage} from '@ionic/storage';
import {zones} from './config';

@Injectable({
  providedIn: 'root'
})
export class ServersService {

  private parisServers: Array<ServerDto> = null;
  private netherlandsServers: Array<ServerDto> = null;

  constructor(private api: ApiService, private storage: Storage) {
  }

  private mergeZones(zonesValue: Array<any>) {
    const valuesList = zonesValue.map(zone => zone.servers);
    return [].concat(...valuesList);
  }

  private sortServers(servers: Array<ServerDto>): Array<ServerDto> {

    const runningServers = servers.filter(obj => obj.state === 'running');
    const startAndStopServers = servers.filter(obj => obj.state === 'starting' || obj.state === 'stopping');
    const stoppedServers = servers.filter(obj => obj.state === 'stopped');
    const stoppedInPlaceServers = servers.filter(obj => obj.state === 'stopped in place');

    return runningServers.concat(startAndStopServers, stoppedInPlaceServers, stoppedServers);
  }

  public async getAllServer(nbrOfServ = 6) {
    const promises = zones.map(zone => this.getAllServerByCountry(zone));
    const result = await Promise.all(promises);

    return this.sortServers(this.mergeZones(result)).slice(0, nbrOfServ);
  }

  public async getAllServerByCountry(country: string, nbrOfServ = 50): Promise<any> {
    const apiUrl = `${this.api.getInstanceUrl()}${country}`;
    const organizationId = await this.storage.get('currentOrganization');

    const result = await this.api.get<{ servers: ServerDto[] }>(`${apiUrl}/servers?project=${organizationId}&per_page=${nbrOfServ}&page=1`);
    result.servers.forEach(value => {
      value.country = country;
    });

    return result;
  }

  public getServerById(country: string, serverId: string): Promise<any> {
    const apiUrl = `${this.api.getInstanceUrl()}${country}`;

    return new Promise((resolve, reject) => {
      this.api.get<ServerDto>(apiUrl + '/servers/' + serverId)
        .then(result => {
          resolve(result);
        })
        .catch(error => {
          reject(error);
        });
    });
  }

  public sendServerAction(country: string, serverId: string, action: string): Promise<any> {
    const apiUrl = `${this.api.getInstanceUrl()}${country}`;

    return new Promise((resolve, reject) => {
      this.api.post<ActionDto>(apiUrl + '/servers/' + serverId + '/action', {
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

  public async serverDelete(country: string, serverId: string, serverIp?: string) {
    const apiUrl = `${this.api.getInstanceUrl()}${country}`;

    try {
      await this.api.post<ActionDto>(`${apiUrl}/servers/${serverId}/action`, {
        action: 'terminate'
      });
      if (serverIp) {
        await this.api.delete(`${apiUrl}/ips/${serverIp}`);
      }
    } catch (e) {
      throw e;
    }
  }
}
