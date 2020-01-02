import {Injectable} from '@angular/core';
import {ApiProvider} from '../api/api';
import {AuthTokenDto, TokenDto} from './auth-tokens.dto';
import {Storage} from '@ionic/storage';

@Injectable()
export class AuthProvider {

  constructor(private api: ApiProvider, private storage: Storage) {
  }

  public login(email: string, password: string, code?: string): Promise<any> {

    return new Promise((resolve, reject) => {
      this.api.post<any>(this.api.getApiUrl() + '/jwt', null, {
        'email': email,
        'password': password,
        'renewable': true,
        '2FA_token': code,
      })
        .then(result => {
          this.storage.set('token', result).then(() => {
            resolve('ok');
          });
        })
        .catch(error => {
          reject(error);
        });
    });
  }

  public getToken(token: string): Promise<AuthTokenDto> {

    return new Promise((resolve, reject) => {
      this.api.get<AuthTokenDto>(this.api.getApiUrl() + '/tokens/' + token, token)
        .then(result => {
          resolve(result);
        })
        .catch(error => {
          reject(error);
        });
    });
  }

  public getAllTokens(): Promise<{ 'tokens': Array<TokenDto> }> {

    return new Promise((resolve, reject) => {
      this.storage.get('token').then(result => {
        this.api.get<{ 'tokens': Array<TokenDto> }>(this.api.getApiUrl() + '/tokens?valid_forever=&sort=-creation_date',
          result.auth.jwt_key)
          .then(result => {
            resolve(result);
          })
          .catch(error => {
            reject(error);
          });
      });
    });
  }

  public deleteToken(token: string): Promise<any> {

    return new Promise((resolve, reject) => {
      this.storage.get('token').then(result => {
        this.api.delete(this.api.getApiUrl() + '/tokens/' + token, result.auth.jwt_key);
        resolve('ok');
      }).catch(error => {
        reject(error);
      });
    });
  }

}
