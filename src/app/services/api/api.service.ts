import {Injectable} from '@angular/core';
import {Storage} from '@ionic/storage';
import {HttpClient} from '@angular/common/http';
import {NavController, Platform} from '@ionic/angular';
import {Router} from '@angular/router';


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

  // OBJECT STORAGE
  private readonly s3par: string = '/s3par';
  private readonly s3ams: string = '/s3ams';

  constructor(private storage: Storage, private httpClient: HttpClient, private navCtrl: NavController,
              private platform: Platform, private router: Router) {
    if (this.platform.is('cordova') === true) {
      this.apiUrl = 'https://account.scaleway.com';
      this.billing = 'https://billing.scaleway.com';
      this.paris1 = 'https://api.scaleway.com/instance/v1/zones/fr-par-1';
      this.amsterdam1 = 'https://api.scaleway.com/instance/v1/zones/nl-ams-1';

      // OBJECT STORAGE
      this.s3par = 'https://s3.fr-par.scw.cloud';
      this.s3ams = 'https://s3.nl-ams.scw.cloud';

    }
  }

  private async request<T>(method: HttpMethods, url: string, data: {} = {}): Promise<T> {

    const token = await this.storage.get('token');
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
            await this.storage.remove('token');
            await this.navCtrl.navigateRoot(['/login']);
            return;
          }
        } else {
          return e;
        }
      }
    }
  }

  private renewJWT(): Promise<any> {
    return new Promise((resolve, reject) => {
      this.storage.get('token').then(token => {
        if (token) {
          this.httpClient.request('POST', this.apiUrl + '/jwt/' + token.jwt.jti + '/renew', {
            body: {jwt_renew: token.auth.jwt_renew}
          }).toPromise().then(result => {
            this.storage.set('token', result).then(() => {
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

  public getApiUrl() {
    return (this.apiUrl);
  }

  public getParisApiUrl() {
    return (this.paris1);
  }

  public getAmsterdamApiUrl() {
    return (this.amsterdam1);
  }

  public getParisObjectApiUrl() {
    return (this.s3par);
  }

  public getAmsObjectApiUrl() {
    return (this.s3ams);
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
