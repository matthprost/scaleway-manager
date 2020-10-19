import {Injectable} from '@angular/core';
import {Storage} from '@ionic/storage';
import {HttpClient} from '@angular/common/http';
import {NavController, Platform, ToastController} from '@ionic/angular';


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

  // Those routes are for proxy
  // GENERAL API
  private readonly api: string = '/api';

  // ACCOUNT API
  private readonly accountApiUrl: string = '/account';

  // BILLING API
  private readonly billing: string = '/billing';

  private createToastError = async (e) => await this.toastCtrl.create({
    message: `Error: ${e.error.message || 'Unknown Error'}`,
    duration: 5000,
    position: 'top',
    mode: 'ios',
    color: 'danger',
    showCloseButton: true
  });

  constructor(private storage: Storage, private httpClient: HttpClient, private navCtrl: NavController,
              private platform: Platform, private toastCtrl: ToastController) {
    // If we are running on Android / iOS then lets use real routes
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

    try {
      return await this.httpClient.request<T>(HttpMethods[method.toString()], url, {
        headers: token && token.auth && token.auth.jwt_key ?
          {
            'X-Session-Token': token.auth.jwt_key
          } : {},
        body: data
      }).toPromise();
    } catch (e) {
      console.log(e);

      const toast = await this.createToastError(e);
      await toast.present();

      if (e && e.status && e.status === 401 && e.error.type === 'invalid_auth') {
        console.warn('ERROR 401: Token is be not valid anymore, trying to renew it.');

        try {
          console.log('Token in storage:', token);
          await this.renewJWT(token);

          return this.request<T>(method, url, data);
        } catch (e) {
          console.warn('DELETE JWT IN STORAGE');
          await this.storage.remove('jwt');
          await this.navCtrl.navigateRoot(['/login']);
          throw e;
        }
      } else {
        throw e;
      }
    }
  }

  private async renewJWT(token): Promise<any> {
    if (token) {
      try {
        const result = this.httpClient.request<any>('POST', this.accountApiUrl + '/jwt/' + token.jwt.jti + '/renew', {
          body: {jwt_renew: token.auth.jwt_renew}
        }).toPromise();

        await this.storage.set('jwt', result);
        console.log('JWT RENEWED!');

        return result;
      } catch (e) {
        console.log('Error while trying to renew token:', e);
        throw e;
      }
    } else {
      console.warn('No token found in storage.');
      throw TypeError('No token found in storage.');
    }
  }

  public getAccountApiUrl() {
    return (this.accountApiUrl);
  }

  public getInstanceUrl() {
    return (this.api + '/instance/v1/zones/');
  }

  public getBmaasUrl() {
    return (this.api + '/baremetal/v1alpha1/zones/');
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
