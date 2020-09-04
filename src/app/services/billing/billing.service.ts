import {Injectable} from '@angular/core';
import {ApiService} from '../api/api.service';
import {BillingDto} from './billing.dto';
import {Storage} from '@ionic/storage';

@Injectable({
  providedIn: 'root'
})
export class BillingService {

  constructor(private api: ApiService, private storage: Storage) {
  }

  public getAllBilling(): Promise<any> {
    const ApiUrl = this.api.getBillingApiUrl();

    return new Promise((resolve, reject) => {

      this.api.get<BillingDto>(ApiUrl + '/invoices')
        .then(result => {
          resolve(result);
        })
        .catch(error => {
          reject(error);
        });
    });
  }

  public getTwoLastBilling(): Promise<any> {
    const ApiUrl = this.api.getBillingApiUrl();

    return new Promise((resolve, reject) => {

      this.api.get<BillingDto>(ApiUrl + '/invoices?page=1&per_page=2')
        .then(result => {
          resolve(result.invoices);
        })
        .catch(error => {
          reject(error);
        });
    });
  }

  public async getXMonthsLastBilling(months: number): Promise<any> {
    const ApiUrl = this.api.getBillingApiUrl();

    const organizationId = await this.storage.get('currentOrganization');
    return this.api.get<BillingDto>(ApiUrl + '/invoices?organization_id=' + organizationId + '&page=1&per_page=' + months);
  }

  public async getBilling(value: number): Promise<any> {
    const ApiUrl = this.api.getBillingApiUrl();

    const organizationId = await this.storage.get('currentOrganization');
    return this.api.get<BillingDto>(ApiUrl + '/invoices?organization_id=' + organizationId + '&page=1&per_page=' + value);
  }
}
