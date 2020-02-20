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
  private readonly parisObject: string = '/paris-object';
  private readonly amsObject: string = '/ams-object';

  constructor(private storage: Storage, private httpClient: HttpClient, private navCtrl: NavController,
              private platform: Platform, private router: Router) {
    if (this.platform.is('cordova') === true) {
      this.apiUrl = 'https://account.scaleway.com';
      this.billing = 'https://billing.scaleway.com';
      this.paris1 = 'https://api.scaleway.com/instance/v1/zones/fr-par-1';
      this.amsterdam1 = 'https://api.scaleway.com/instance/v1/zones/nl-ams-1';

      // OBJECT STORAGE
      this.parisObject = 'https://s3.fr-par.scw.cloud';
      this.amsObject = 'https://s3.nl-ams.scw.cloud';

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
          .catch((err) => {
            console.log(err);
            if (err && err.status && err.status === 401 && err.error.type === 'invalid_auth') {
              console.warn('ERROR 401: Token might be not valid anymore, trying to renew');

              this.renewJWT().then(() => {
                this.router.navigate([this.router.getCurrentNavigation()]);
              }).catch(error => {
                console.warn('DELETE JWT IN STORAGE');
                this.storage.remove('token').then(() => {
                  this.navCtrl.navigateRoot(['/login']);
                });
              });
            } else if (err && err.status && err.status === 404) {
              this.navCtrl.navigateRoot(['/error/404']);
            } else if (err && err.status && err.status === 504) {
              this.navCtrl.navigateRoot(['/error/504']);
            } else if (err && err.status && err.status === 500) {
              this.navCtrl.navigateRoot(['/error/504']);
            }
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
    return (this.parisObject);
  }

  public getAmsObjectApiUrl() {
    return (this.amsObject);
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
