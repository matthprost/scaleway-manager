import {Injectable} from '@angular/core';
import {ApiService} from '../api/api.service';
import * as aws4 from '../../../../node_modules/aws4';
import {HttpClient} from '@angular/common/http';
import {Storage} from '@ionic/storage';
import {AuthService} from '../user/auth/auth.service';

@Injectable({
  providedIn: 'root'
})
export class ObjectService {

  constructor(private api: ApiService, private httpClient: HttpClient, private storage: Storage, private authService: AuthService) {
  }

  public async request(country: 'nl-ams' | 'fr-par', path?: string) {
    const opts = {
      service: 's3', region: country, host: 's3.' + country + '.scw.cloud', path: path ? path : '', headers: undefined
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
      await this.authService.getToken(awsToken.token.access_key);

      aws4.sign(opts, {accessKeyId: awsToken.token.access_key, secretAccessKey: awsToken.token.secret_key});
      console.log(opts);

      return await this.httpClient.request('GET', '/s3par', {
        headers: opts.headers,
        responseType: 'text'
      }).toPromise();
    } catch (e) {
      await this.storage.remove('awsToken');
      return this.request(country);
    }
  }

  public getBucketsByCountry(country: 'nl-ams' | 'fr-par'): Promise<any> {
    let ApiUrl: string = null;
    country === 'fr-par' ? ApiUrl = this.api.getParisObjectApiUrl() : ApiUrl = this.api.getAmsObjectApiUrl();

    return this.api.get<any>(ApiUrl);
  }
}
