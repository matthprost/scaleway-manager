import {Injectable} from '@angular/core';
import {Platform} from 'ionic-angular';
import {Storage} from '@ionic/storage';
import {HttpClient} from '@angular/common/http';
import {ErrorsProvider} from '../errors/errors';

enum HttpMethods {
  GET,
  POST,
  DELETE,
  PATCH
}

@Injectable()
export class ApiProvider {

  private readonly apiUrl: string = '/account';
  private readonly billing: string = '/billing';
  private readonly paris1: string = '/paris';
  private readonly amsterdam1: string = '/netherlands';

  constructor(private platform: Platform, private storage: Storage, private httpClient: HttpClient) {

    if (this.platform.is('cordova') == true) {
      this.apiUrl = 'https://account.scaleway.com';
      this.billing = 'https://billing.scaleway.com';
      this.paris1 = 'https://cp-par1.scaleway.com';
      this.amsterdam1 = 'https://cp-ams1.scaleway.com';
    }
  }

  private request<T>(method: HttpMethods, url: string, data: {} = {}): Promise<T> {

    return new Promise((resolve, reject) => {
      this.storage.get('token').then(token => {

        this.httpClient.request<T>(HttpMethods[method.toString()], url, {
          headers: token ?
            {
              'X-Session-Token': token.auth.jwt_key
            } : {},
          body: data
        }).toPromise().then(result => {
          resolve(result);
        })
          /* AN ERROR OCCURRED WE TRY TO RENEW TOKEN */
          .catch((err) => {
            this.renewJWT().then(value => {
              this.httpClient.request<T>(HttpMethods[method.toString()], url, {
                headers: value ?
                  {
                    'X-Session-Token': value.auth.jwt_key
                  } : {},
                body: data
              }).toPromise().then(result => {
                resolve(result);
              })
                /* EVEN AFTER RENEWING TOKEN REQUEST STILL FAIL */
                .catch(error => {
                  reject(error);
                });
            })
              /* RENEWING TOKEN FAILED REJECT ERROR */
              .catch(error => {
                reject(error);
              });
            reject(err);
          });
      });
    });
  }

  private renewJWT(): Promise<any> {
    return new Promise((resolve, reject) => {
      this.storage.get('token').then(token => {
        if (token) {
          this.httpClient.request('POST', this.apiUrl + '/jwt/' + token.jwt.jti + '/renew', {
            body: {jwt_renew: token.auth.jwt_renew}
          }).toPromise().then(result => {
            this.storage.set('token', result).then(() => {
              resolve(result);
            });
          })
            .catch(error => {
              reject(error);
            });
        } else {
          reject('error');
        }
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

  public get<T>(url: string, token?: string): Promise<T> {
    return this.request<T>(HttpMethods.GET, url);
  }

  public post<T>(url: string, token?: string, data?: object): Promise<T> {
    return this.request<T>(HttpMethods.POST, url, data);
  }

  public patch<T>(url: string, token?: string, data?: object): Promise<T> {
    return this.request<T>(HttpMethods.PATCH, url, data);
  }

  public delete<T>(url: string, token?: string): Promise<T> {
    return this.request<T>(HttpMethods.DELETE, url);
  }
}
