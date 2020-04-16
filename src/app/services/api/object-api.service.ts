import {Injectable} from '@angular/core';
import * as aws4 from '../../../../node_modules/aws4';
import {HttpClient} from '@angular/common/http';
import {Storage} from '@ionic/storage';
import {AuthService} from '../user/auth/auth.service';
import * as xml2js from '../../../../node_modules/xml2js';
import { Platform, ToastController} from '@ionic/angular';

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
              private toastController: ToastController, private platform: Platform) {
  }

  public async request(method: HttpMethods, country: 'nl-ams' | 'fr-par', subHost?: string, path?: string) {
    const opts = {
      service: 's3',
      region: country,
      host: subHost ? subHost + '.s3.' + country + '.scw.cloud' : 's3.' + country + '.scw.cloud',
      path,
      headers: {},
      method: HttpMethods[method.toString()]
    };

    console.log('OPTS:', opts);

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

      // Create AWS Signature
      aws4.sign(opts, {accessKeyId: awsToken.token.access_key, secretAccessKey: awsToken.token.secret_key});
      console.log(opts);

      let myHeaders = {...opts.headers, ...{subHost}};

      if (path) {
        myHeaders = {...opts.headers, ...{subHost}, ...{path}};
      }

      let url = country === 'fr-par' ? '/s3par' : '/s3ams';
      if (this.platform.is('cordova')) {
        url = subHost ? 'https://' + subHost + '.s3.' + country + '.scw.cloud' : 'https://s3.' + country +
          '.scw.cloud';
        if (path) {
          url += path;
        }
      }

      const value = await this.httpClient.request(HttpMethods[method.toString()], url, {
        body: null,
        headers: subHost ? myHeaders : opts.headers,
        responseType: 'text'
      }).toPromise();

      // Convert XML into JSON
      if (value) {
        return await xml2js.parseStringPromise(value);
      } else {
        return 'ok';
      }

    } catch (e) {

      // We remove access_token from storage and retry if token not found
      if (e.status === 404) {
        await this.storage.remove('awsToken');
        return this.request(method, country, subHost, path);
      } else {
        const errorMessage = await xml2js.parseStringPromise(e.error);
        console.log(errorMessage.Error.Message[0]);

        const alert = await this.toastController.create({
          position: 'top',
          showCloseButton: true,
          duration: 8000,
          color: 'danger',
          message: errorMessage.Error.Message[0] ? errorMessage.Error.Message[0] : 'An error occurred'
        });

        await alert.present();
        throw e;
      }
    }
  }

  public get(country: 'nl-ams' | 'fr-par', subHost?: string, path?: string) {
    return this.request(HttpMethods.GET, country, subHost, path);
  }

  public post(country: 'nl-ams' | 'fr-par', subHost?: string, path?: string) {
    return this.request(HttpMethods.POST, country, subHost, path);
  }

  public put(country: 'nl-ams' | 'fr-par', subHost?: string, path?: string) {
    return this.request(HttpMethods.PUT, country, subHost, path);
  }

  public patch(country: 'nl-ams' | 'fr-par', subHost?: string, path?: string) {
    return this.request(HttpMethods.PATCH, country, subHost, path);
  }

  public options(country: 'nl-ams' | 'fr-par', subHost?: string, path?: string) {
    return this.request(HttpMethods.OPTIONS, country, subHost, path);
  }

  public delete(country: 'nl-ams' | 'fr-par', subHost?: string, path?: string) {
    return this.request(HttpMethods.DELETE, country, subHost, path);
  }
}
