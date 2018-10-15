import {Injectable} from '@angular/core';
import {ApiProvider} from "../api/api";
import {AuthTokenDto} from "./auth-tokens.dto";
import {Storage} from '@ionic/storage';

@Injectable()
export class AuthProvider {

  constructor(private api: ApiProvider, private storage: Storage) {
  }

  public login(email: string, password: string, code?: string): Promise<any> {

    return new Promise((resolve, reject) => {
      this.api.post<AuthTokenDto>(this.api.getApiUrl() + '/tokens', null, {
        "email": email,
        "password": password,
        "expires": false,
        "2FA_token": code,
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

  public getToken(token: string): Promise<any> {

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

}
