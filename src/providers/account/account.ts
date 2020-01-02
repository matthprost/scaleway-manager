import {Injectable} from '@angular/core';
import {Storage} from "@ionic/storage";
import {ApiProvider} from "../api/api";
import {UserDto, UsersDto} from "./account.dto";

@Injectable()
export class AccountProvider {


  constructor(private api: ApiProvider, private storage: Storage) {
    //
  }

  public getUserData(): Promise<UserDto> {

    return new Promise((resolve, reject) => {
      this.storage.get('token').then(result => {
        this.api.get<UsersDto>(this.api.getApiUrl() + '/users/' + result.jwt.issuer, result.auth.jwt_key)
          .then(result => {
            resolve(result.user);
          })
          .catch(error => {
            reject(error);
          });
      });
    });
  }

  public patchSshKeys(keys: Array<{"key": string}>): Promise<UserDto> {
    return new Promise((resolve, reject) => {
      this.storage.get('token').then(result => {
        this.api.patch<UsersDto>(this.api.getApiUrl() + '/users/' + result.jwt.issuer, result.auth.jwt_key, {
          "ssh_public_keys": keys
        })
          .then(result => {
            resolve(result.user);
          })
          .catch(error => {
            reject(error);
          });
      });
    });
  }

}
