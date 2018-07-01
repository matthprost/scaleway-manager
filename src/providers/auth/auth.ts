import {Injectable} from '@angular/core';
import {ApiProvider} from "../api/api";
import {AuthTokenDto} from "./auth-tokens.dto";
import { Storage } from '@ionic/storage';

@Injectable()
export class AuthProvider {

  constructor(private api: ApiProvider, private storage: Storage) {
  }

  public login(email: string, password: string): Promise<any> {

    return new Promise((resolve, reject) => {

      this.api.post<AuthTokenDto>(this.api.getApiUrl() + '/tokens', null, {
        "email": email,
        "password": password,
        "expires": false
      })
        .then(result => {
        this.storage.set('token', result);
        resolve('ok');
      })
        .catch(error => {
        reject(error);
      });

    });
  }

}
