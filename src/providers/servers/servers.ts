import {Injectable} from '@angular/core';
import {ApiProvider} from "../api/api";

@Injectable()
export class ServersProvider {

  constructor(private api: ApiProvider) {
  }

  getAllServers(country: string, token: string): Promise<any> {
    let ApiUrl: string = null;
    country === 'Paris' ? ApiUrl = this.api.getParisApiUrl() : ApiUrl = this.api.getAmsterdamApiUrl();

    return new Promise((resolve, reject) => {

      this.api.get<any>(ApiUrl + '/servers', token)
        .then(result => {
          resolve(result);
        })
        .catch(error => {
          reject(error);
        })

    });
  }

}
