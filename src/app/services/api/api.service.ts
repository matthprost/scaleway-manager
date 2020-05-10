import {Injectable} from '@angular/core';
import {Storage} from '@ionic/storage';
import {HttpClient} from '@angular/common/http';
import {NavController, Platform} from '@ionic/angular';
import {Router} from '@angular/router';


enum HttpMethods {
  GET,
  POST,
  DELETE,
  PATCH,
  OPTIONS
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  // GENERAL API
  private readonly api: string = '/api';

  // ACCOUNT API
  private readonly accountApiUrl: string = '/account';

  // BILLING API
  private readonly billing: string = '/billing';

  constructor(private storage: Storage, private httpClient: HttpClient, private navCtrl: NavController,
              private platform: Platform, private router: Router) {
    if (this.platform.is('cordova') === true) {
      // GENERAL API
      this.api = 'https://api.scaleway.com';

      // ACCOUNT API
      this.accountApiUrl = 'https://account.scaleway.com';

      // BILLING API
      this.billing = 'https://billing.scaleway.com';

    }
  }

  private async request<T>(method: HttpMethods, url: string, data: {} = {}): Promise<T> {

    const token = await this.storage.get('jwt');
    if (!token) {
      return this.httpClient.request<T>(HttpMethods[method.toString()], url, {
        headers: token ?
          {
            'X-Session-Token': token.auth.jwt_key
          } : {},
        body: data
      }).toPromise();
    } else {
      try {
        return await this.httpClient.request<T>(HttpMethods[method.toString()], url, {
          headers: token ?
            {
              'X-Session-Token': token.auth.jwt_key
            } : {},
          body: data
        }).toPromise();
      } catch (e) {
        console.log(e);
        if (e && e.status && e.status === 401 && e.error.type === 'invalid_auth') {
          console.warn('ERROR 401: Token might be not valid anymore, trying to renew');

          try {
            await this.renewJWT();
            return this.request<T>(method, url, data);
          } catch (e) {
            console.warn('DELETE JWT IN STORAGE');
            await this.storage.remove('jwt');
            await this.navCtrl.navigateRoot(['/login']);
            throw e;
          }
        } else if (e && e.status && e.status === 504) {
          await this.navCtrl.navigateRoot(['/error/504']);
          throw e;
        } else if (e && e.status && e.status === 500) {
          await this.navCtrl.navigateRoot(['/error/504']);
          throw e;
        } else {
          throw e;
        }
      }
    }
  }

  private renewJWT(): Promise<any> {
    return new Promise((resolve, reject) => {
      this.storage.get('jwt').then(token => {
        if (token) {
          this.httpClient.request('POST', this.accountApiUrl + '/jwt/' + token.jwt.jti + '/renew', {
            body: {jwt_renew: token.auth.jwt_renew}
          }).toPromise().then(result => {
            this.storage.set('jwt', result).then(() => {
              console.log('JWT RENEWED!');
              resolve(result);
            });
          })
            .catch(error => {
              console.error('ERROR: JWT CANNOT BE RENEWED');
              reject(error);
            });
        } else {
          reject('error');
        }
      });
    });
  }

  public getAccountApiUrl() {
    return (this.accountApiUrl);
  }

  public getParisApiUrl() {
    return (this.api + '/instance/v1/zones/fr-par-1');
  }

  public getAmsterdamApiUrl() {
    return (this.api + '/instance/v1/zones/nl-ams-1');
  }

  public getBillingApiUrl() {
    return (this.billing);
  }

  public getApiUrl() {
    return (this.api);
  }

  public get<T>(url: string): Promise<T> {
    return this.request<T>(HttpMethods.GET, url);
  }

  public post<T>(url: string, data?: {}): Promise<T> {
    return this.request<T>(HttpMethods.POST, url, data ? data : null);
  }

  public patch<T>(url: string, data?: {}): Promise<T> {
    return this.request<T>(HttpMethods.PATCH, url, data ? data : null);
  }

  public options<T>(url: string, data?: {}): Promise<T> {
    return this.request<T>(HttpMethods.OPTIONS, url, data ? data : null);
  }

  public delete<T>(url: string): Promise<T> {
    return this.request<T>(HttpMethods.DELETE, url);
  }
}
