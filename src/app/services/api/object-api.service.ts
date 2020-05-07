import {Injectable} from '@angular/core';
import * as aws4 from '../../../../node_modules/aws4';
import {HttpClient} from '@angular/common/http';
import {Storage} from '@ionic/storage';
import {AuthService} from '../user/auth/auth.service';
import * as xml2js from '../../../../node_modules/xml2js';
import {AlertController, Platform, ToastController} from '@ionic/angular';

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
              private toastController: ToastController, private platform: Platform, private alertCtrl: AlertController) {
  }

  public async request(method: HttpMethods, country: 'nl-ams' | 'fr-par', subHost?: string, path?: string, customHeader?: {}) {

    const opts = {
      service: 's3',
      region: country,
      host: subHost ? subHost + '.s3.' + country + '.scw.cloud' : 's3.' + country + '.scw.cloud',
      path,
      headers: customHeader ? customHeader : {},
      method: HttpMethods[method.toString()]
    };

    // We get aws token in storage
    let awsToken = await this.storage.get('awsToken');

    // If aws token doesn't exist we create new and store it
    if (!awsToken) {
      await this.storage.set('awsToken', await this.authService.addToken());
      awsToken = await this.storage.get('awsToken');
    }

    console.log('AWS-TOKEN', awsToken);

    try {
      // We check if access_token is still working
      await this.authService.getToken(awsToken.token.access_key);
    } catch (e) {
      if (e.status === 404) {
        await this.storage.remove('awsToken');
        setTimeout(async () => {
          await this.authService.deleteToken(awsToken.token.access_key);
        }, 3000);
        return this.request(method, country, subHost, path);
      } else {
        return;
      }
    }

    try {
      // Create AWS Signature
      aws4.sign(opts, {accessKeyId: awsToken.token.access_key, secretAccessKey: awsToken.token.secret_key});
      console.log('AWS-OPTIONS', opts);

      let myHeaders = {...opts.headers, ...{subHost}, ...customHeader};
      let url;

      if (this.platform.is('cordova')) {
        url = 'https://' + (subHost ? subHost + '.' : '') + 's3.' + country + '.scw.cloud' + (path ? path : '');
      } else {
        if (path) {
          myHeaders = {...opts.headers, ...{subHost}, ...{path}, ...customHeader};
        }
        url = country === 'fr-par' ? '/s3par' : '/s3ams';
      }

      const value = await this.httpClient.request(HttpMethods[method.toString()], url, {
        body: null,
        headers: subHost ? myHeaders : {...opts.headers, ...customHeader},
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

      const toast = await this.toastController.create({
        position: 'top',
        showCloseButton: true,
        duration: 8000,
        color: 'danger',
        message: errorMessage ? errorMessage.Error.Message[0] : 'An error occurred'
      });

      await toast.present();

      throw e;
    }
  }

  public get(country: 'nl-ams' | 'fr-par', subHost?: string, path?: string, customHeader?: {}) {
    return this.request(HttpMethods.GET, country, subHost, path, customHeader);
  }

  public post(country: 'nl-ams' | 'fr-par', subHost?: string, path?: string, customHeader?: {}) {
    return this.request(HttpMethods.POST, country, subHost, path, customHeader);
  }

  public put(country: 'nl-ams' | 'fr-par', subHost?: string, path?: string, customHeader?: {}) {
    return this.request(HttpMethods.PUT, country, subHost, path, customHeader);
  }

  public patch(country: 'nl-ams' | 'fr-par', subHost?: string, path?: string, customHeader?: {}) {
    return this.request(HttpMethods.PATCH, country, subHost, path, customHeader);
  }

  public options(country: 'nl-ams' | 'fr-par', subHost?: string, path?: string, customHeader?: {}) {
    return this.request(HttpMethods.OPTIONS, country, subHost, path, customHeader);
  }

  public delete(country: 'nl-ams' | 'fr-par', subHost?: string, path?: string, customHeader?: {}) {
    return this.request(HttpMethods.DELETE, country, subHost, path, customHeader);
  }
}
