import {Injectable} from '@angular/core';
import {ApiService} from '../../api/api.service';
import {AuthTokenDto, TokenDto} from './auth-tokens.dto';
import {Storage} from '@ionic/storage';
import {AccountService} from '../account/account.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  constructor(private api: ApiService, private storage: Storage, private accountService: AccountService) {
  }

  public login(email: string, password: string, code?: string): Promise<any> {

    return new Promise((resolve, reject) => {
      this.api.post<AuthTokenDto>(this.api.getAccountApiUrl() + '/jwt', {
        'email': email,
        'password': password,
        'renewable': true,
        '2FA_token': String(code),
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
      this.api.get<AuthTokenDto>(this.api.getAccountApiUrl() + '/tokens/' + token)
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
      this.api.get<{ 'tokens': Array<TokenDto> }>(this.api.getAccountApiUrl() + '/tokens?valid_forever=&sort=-creation_date')
        .then(val => {
          resolve(val);
        })
        .catch(error => {
          reject(error);
        });
    });
  }

  public addToken(): Promise<TokenDto> {
    return new Promise((resolve, reject) => {
      this.accountService.getUserData().then(userData => {
        this.api.post<TokenDto>(this.api.getAccountApiUrl() + '/tokens', {
          email: userData.email,
          expires: false,
          description: 'AWS_Scaleway_Manager'
        })
          .then(val => {
            resolve(val);
          })
          .catch(error => {
            reject(error);
          });
      });
    });
  }

  public deleteToken(token: string): Promise<any> {

    return new Promise((resolve, reject) => {
      this.api.delete(this.api.getAccountApiUrl() + '/tokens/' + token).then(() => {
        resolve('ok');
      }).catch(error => {
        reject(error);
      });
    });
  }
}
