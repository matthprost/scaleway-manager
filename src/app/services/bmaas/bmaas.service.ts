import {Injectable} from '@angular/core';
import {ApiService} from '../api/api.service';
import {Storage} from '@ionic/storage';

@Injectable({
  providedIn: 'root'
})
export class BmaasService {

  constructor(private api: ApiService, private storage: Storage) {

  }

  public async getAllServer(nbr = 100) {
    const apiUrl = `${this.api.getBmaasUrl()}fr-par-2`;
    const organizationId = await this.storage.get('currentOrganization');

    const result = await this.api.get<any>(`${apiUrl}/servers?organization_id=${organizationId}&per_page=${nbr}&page=1`);

    return result.servers;
  }
}
