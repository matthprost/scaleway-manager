import { Injectable } from '@angular/core';
import {Storage} from '@ionic/storage';
import {HttpClient} from '@angular/common/http';
import {Router} from '@angular/router';
import {Platform} from '@ionic/angular';


enum HttpMethods {
  GET,
  POST,
  DELETE,
  PATCH
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  private readonly apiUrl: string = '/account';
  private readonly billing: string = '/billing';
  private readonly paris1: string = '/paris';
  private readonly amsterdam1: string = '/netherlands';

  constructor(private storage: Storage, private httpClient: HttpClient, private router: Router, private platform: Platform) {
    if (this.platform.is('cordova') === true) {
      this.apiUrl = 'https://account.scaleway.com';
      this.billing = 'https://billing.scaleway.com';
      this.paris1 = 'https://api.scaleway.com/instance/v1/zones/fr-par-1';
      this.amsterdam1 = 'https://api.scaleway.com/instance/v1/zones/nl-ams-1';
    }
  }

  private request<T>(method: HttpMethods, url: string, data: {} = {}): Promise<T> {

    return new Promise((resolve, reject) => {
      this.storage.get('token').then(token => {

        this.httpClient.request<T>(HttpMethods[method.toString()], url, {
          headers: token ?
            {
              'x-auth-token': token.token.id
            } : {},
          body: data
        }).toPromise().then(result => {
          resolve(result);
        })
          .catch((err) => {
            if (err && err.status && err.status === 401) {
              /*this.storage.remove('token').then(() => {
                console.log('Error 401: Token might be not valid anymore');
                this.router.navigate(['/login']);
              });*/
            }
            reject(err);
          });
      });
    });
  }

  public getApiUrl() {
    return (this.apiUrl);
  }

  public getParisApiUrl() {
    return (this.paris1);
  }

  public getAmsterdamApiUrl() {
    return (this.amsterdam1);
  }

  public getBillingApiUrl() {
    return (this.billing);
  }

  public get<T>(url: string): Promise<T> {
    return this.request<T>(HttpMethods.GET, url);
  }

  public post<T>(url: string, data?: {}): Promise<T> {
    return this.request<T>(HttpMethods.POST, url, data);
  }

  public patch<T>(url: string, data?: {}): Promise<T> {
    return this.request<T>(HttpMethods.PATCH, url, data);
  }

  public delete<T>(url: string): Promise<T> {
    return this.request<T>(HttpMethods.DELETE, url);
  }
}
