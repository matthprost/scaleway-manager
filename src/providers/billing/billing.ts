import { Injectable } from '@angular/core';
import {ApiProvider} from "../api/api";
import {BillingDto} from "./billing.dto";
import {ErrorsProvider} from "../errors/errors";

@Injectable()
export class BillingProvider {

  constructor(private api: ApiProvider, private errorsProvider: ErrorsProvider) {
  }

  public getAllBilling(token: string): Promise<any> {
    const ApiUrl = this.api.getBillingApiUrl();

    return new Promise((resolve, reject) => {

      this.api.get<BillingDto>(ApiUrl + '/invoices', token)
        .then(result => {
          resolve(result);
        })
        .catch(error => {
          this.errorsProvider.apiError(error);
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
          this.errorsProvider.apiError(error);
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
          this.errorsProvider.apiError(error);
          reject(error);
        })
    });
  }

}
