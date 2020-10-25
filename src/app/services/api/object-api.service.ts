import {Injectable} from '@angular/core';
import * as aws4 from '../../../../node_modules/aws4';
import {HttpClient} from '@angular/common/http';
import {Storage} from '@ionic/storage';
import {AuthService} from '../user/auth/auth.service';
import * as xml2js from '../../../../node_modules/xml2js';
import {Platform, ToastController} from '@ionic/angular';
import {TokensService} from '../user/project/tokens/tokens.service';

enum HttpMethods {
  GET,
  POST,
  DELETE,
  PATCH,
  OPTIONS,
  PUT
}

@Injectable({
  providedIn: 'root'
})

export class ObjectApiService {

  constructor(private httpClient: HttpClient, private storage: Storage, private authService: AuthService,
              private toastController: ToastController, private platform: Platform, private tokensService: TokensService) {
  }

  private async renewToken() {
    console.warn('RENEWING TOKEN FOR S3');
    const newToken = await this.tokensService.addToken();
    await this.storage.set('apiToken', newToken);

    return newToken;
  }

  public async request(method: HttpMethods, country: string, subHost?: string, path?: string, customHeader?: {}) {

    const opts = {
      service: 's3',
      region: country,
      host: subHost ? subHost + '.s3.' + country + '.scw.cloud' : 's3.' + country + '.scw.cloud',
      path,
      headers: customHeader ? customHeader : {},
      method: HttpMethods[method.toString()]
    };

    // We get token in storage
    let apiToken = await this.storage.get('apiToken');
    const currentOrganizationId = await this.storage.get('currentOrganization');

    // If aws token doesn't exist we create new and store it
    if (!apiToken || apiToken.token.organization_id !== currentOrganizationId) {
      apiToken = await this.renewToken();
    }

    console.log('AWS-TOKEN', apiToken);

    /*    try {
          // We check if access_token is still working
          await this.tokensService.getToken(apiToken.token.access_key);
        } catch (e) {
          if (e.status === 404 || e.status === 410) {
            setTimeout(async () => {
              await this.tokensService.deleteToken(apiToken.token.access_key);
              await this.storage.remove('apiToken');
            }, 3000);
            apiToken = await this.renewToken();
          } else {
            return;
          }
        }*/

    try {
      // Create AWS Signature
      aws4.sign(opts, {accessKeyId: apiToken.token.access_key, secretAccessKey: apiToken.token.secret_key});
      console.log('AWS-OPTIONS', opts);

      let myHeaders = {...opts.headers, ...{subHost}, ...customHeader};
      let url;

      if (this.platform.is('cordova')) {
        url = 'https://' + (subHost ? subHost + '.' : '') + 's3.' + country + '.scw.cloud' + (path ? path : '');
      } else {
        if (path) {
          myHeaders = {...opts.headers, ...{subHost}, ...{path}, ...customHeader, ...{zone: country}};
        }
        url = '/s3';
      }

      const value = await this.httpClient.request(HttpMethods[method.toString()], url, {
        body: null,
        headers: subHost ? myHeaders : {...opts.headers, ...customHeader, ...{zone: country}},
        responseType: 'text'
      }).toPromise();


      // Convert XML into JSON
      if (value && value.indexOf('xml') > 0) {
        return await xml2js.parseStringPromise(value);
      } else {
        return 'ok';
      }

    } catch (e) {
      console.log('AN ERROR OCCURRED:', e);

      let errorMessage = null;
      if (e.error.indexOf('<?xml') === 0) {
        errorMessage = await xml2js.parseStringPromise(e.error);
        console.log(errorMessage.Error.Message[0]);
      }

      await this.storage.remove('apiToken');

      if (e.status === 403 && e.statusText === 'Forbidden') {
        await this.renewToken();
        return this.request(method, country, subHost, path, customHeader);
      }

      const toast = await this.toastController.create({
        position: 'top',
        showCloseButton: true,
        duration: 8000,
        color: 'danger',
        mode: 'ios',
        message: errorMessage ? errorMessage.Error.Message[0] : 'An error occurred'
      });

      await toast.present();

      throw e;
    }
  }

  public get(country: string, subHost?: string, path?: string, customHeader?: {}) {
    return this.request(HttpMethods.GET, country, subHost, path, customHeader);
  }

  public post(country: string, subHost?: string, path?: string, customHeader?: {}) {
    return this.request(HttpMethods.POST, country, subHost, path, customHeader);
  }

  public put(country: string, subHost?: string, path?: string, customHeader?: {}) {
    return this.request(HttpMethods.PUT, country, subHost, path, customHeader);
  }

  public patch(country: string, subHost?: string, path?: string, customHeader?: {}) {
    return this.request(HttpMethods.PATCH, country, subHost, path, customHeader);
  }

  public options(country: string, subHost?: string, path?: string, customHeader?: {}) {
    return this.request(HttpMethods.OPTIONS, country, subHost, path, customHeader);
  }

  public delete(country: string, subHost?: string, path?: string, customHeader?: {}) {
    return this.request(HttpMethods.DELETE, country, subHost, path, customHeader);
  }
}
