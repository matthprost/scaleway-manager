import { Injectable } from '@angular/core';
import {Storage} from '@ionic/storage';
import {ApiService} from '../../api/api.service';
import {UserDto, UsersDto} from './account.dto';


@Injectable({
  providedIn: 'root'
})
export class AccountService {

  constructor(private api: ApiService, private storage: Storage) { }

  public getUserData(): Promise<UserDto> {

    return new Promise((resolve, reject) => {
      this.storage.get('token').then(result => {
        this.api.get<UsersDto>(this.api.getApiUrl() + '/users/' + result.token.user_id)
        // tslint:disable-next-line:no-shadowed-variable
          .then(result => {
            resolve(result.user);
          })
          .catch(error => {
            reject(error);
          });
      });
    });
  }

  public patchSshKeys(keys: Array<{'key': string}>): Promise<UserDto> {
    return new Promise((resolve, reject) => {
      this.storage.get('token').then(result => {
        this.api.patch<UsersDto>(this.api.getApiUrl() + '/users/' + result.token.user_id, {
          'ssh_public_keys': keys
        })
        // tslint:disable-next-line:no-shadowed-variable
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
