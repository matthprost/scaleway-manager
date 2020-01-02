import {Injectable} from '@angular/core';
import {Storage} from '@ionic/storage';
import {MenuController} from 'ionic-angular';
import {ApiProvider} from "../../api/api";


@Injectable()
export class LogoutProvider {

  constructor(private storage: Storage, public menu: MenuController, private api: ApiProvider) {
  }

  public logout(): Promise<any> {

    return new Promise((resolve, reject) => {

      this.storage.get('token').then(token => {
        this.storage.remove('token')
          .then(result => {
            this.menu.swipeEnable(false);
          })
          .catch(error => {
            this.menu.swipeEnable(false);

            reject(error);
          });
        this.api.delete(this.api.getApiUrl() + '/tokens/' + token.auth.jwt_key, token.token.auth.jwt_key);
        resolve('ok');
      }).catch(error => {
        reject(error);
      })
    });
  }

}
