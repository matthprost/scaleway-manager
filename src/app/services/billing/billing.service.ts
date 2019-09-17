import { Injectable } from '@angular/core';
import {ApiService} from '../api/api.service';
import {BillingDto} from './billing.dto';

@Injectable({
  providedIn: 'root'
})
export class BillingService {

  constructor(private api: ApiService) { }

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

  public getBilling(value: number): Promise<any> {
    const ApiUrl = this.api.getBillingApiUrl();

    return new Promise((resolve, reject) => {

      this.api.get<BillingDto>(ApiUrl + '/invoices?page=1&per_page=' + value)
        .then(result => {
          resolve(result.invoices);
        })
        .catch(error => {
          reject(error);
        });
    });
  }
}
