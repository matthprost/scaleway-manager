import { Injectable } from '@angular/core';
import {ApiProvider} from "../api/api";
import {BillingDto} from "./billing.dto";

@Injectable()
export class BillingProvider {

  constructor(private api: ApiProvider) {
    //
  }

  getAllBilling(token: string): Promise<any> {
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

  getTwoLastBilling(token: string): Promise<any> {
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

  getBilling(token: string, value: number): Promise<any> {
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
