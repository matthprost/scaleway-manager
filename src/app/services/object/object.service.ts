import {Injectable} from '@angular/core';
import {ApiService} from '../api/api.service';
import * as aws4 from '../../../../node_modules/aws4';
import {HttpClient} from '@angular/common/http';
import {Storage} from '@ionic/storage';
import {AuthService} from '../user/auth/auth.service';
import * as xml2js from '../../../../node_modules/xml2js';

@Injectable({
  providedIn: 'root'
})
export class ObjectService {

  constructor(private api: ApiService, private httpClient: HttpClient, private storage: Storage, private authService: AuthService) {
  }

  public async request(country: 'nl-ams' | 'fr-par', path?: string, subHost?: string) {
    const opts = {
      service: 's3',
      region: country,
      host: subHost ? subHost : '' + 's3.' + country + '.scw.cloud',
      path: path ? path : '',
      headers: undefined
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

      // Create AWS Signature
      aws4.sign(opts, {accessKeyId: awsToken.token.access_key, secretAccessKey: awsToken.token.secret_key});
      console.log(opts);

      const value = await this.httpClient.request('GET', country === 'nl-ams' ? '/s3ams' : '/s3par', {
        headers: opts.headers,
        responseType: 'text'
      }).toPromise();

      // Convert XML into JSON
      try {
        return await xml2js.parseStringPromise(value);
      } catch (e) {
        throw e;
      }
    } catch (e) {
      // We remove access_token from storage and retry
      await this.storage.remove('awsToken');
      return this.request(country);
    }
  }

  public async getAllBuckets() {
    try {
      const s3par = await this.request('fr-par');
      const s3ams = await this.request('nl-ams');

      return {
        s3par: s3par.ListAllMyBucketsResult.Buckets[0].Bucket,
        s3ams: s3ams.ListAllMyBucketsResult.Buckets[0].Bucket,
      };
    } catch (e) {
      throw e;
    }
  }
}
