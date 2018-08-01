import { Injectable } from '@angular/core';
import {ApiProvider} from "../api/api";
import {BillingDto} from "./billing.dto";

@Injectable()
export class BillingProvider {

  constructor(private api: ApiProvider) {
  }

  public getAllBilling(token: string): Promise<any> {
    const ApiUrl = this.api.getBillingApiUrl();

    return new Promise((resolve, reject) => {

      this.api.get<BillingDto>(ApiUrl + '/invoices', token)
        .then(result => {
          resolve(result);
        })
        .catch(error => {
          reject(error);
        })
    });
  }

  public getTwoLastBilling(token: string): Promise<any> {
    const ApiUrl = this.api.getBillingApiUrl();

    return new Promise((resolve, reject) => {

      this.api.get<BillingDto>(ApiUrl + '/invoices?page=1&per_page=2', token)
        .then(result => {
          resolve(result.invoices);
        })
        .catch(error => {
          reject(error);
        })
    });
  }

  public getBilling(token: string, value: number): Promise<any> {
    const ApiUrl = this.api.getBillingApiUrl();

    return new Promise((resolve, reject) => {

      this.api.get<BillingDto>(ApiUrl + '/invoices?page=1&per_page=' + value, token)
        .then(result => {
          resolve(result.invoices);
        })
        .catch(error => {
          reject(error);
        })
    });
  }

}
