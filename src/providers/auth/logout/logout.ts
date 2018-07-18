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
        this.api.delete(this.api.getApiUrl() + '/tokens/' + token.token.id, token.token.id).then(() => {
          this.storage.remove('token')
            .then(result => {
              this.menu.swipeEnable(false);

              resolve(result);
            })
            .catch(error => {
              this.menu.swipeEnable(false);

              reject(error);
            })
        }).catch(() => {
          this.storage.remove('token').then(result => {
            resolve(result);
          }).catch(error => {
            reject(error);
          });
        });
      }).catch(error => {
        reject(error);
      })
    });
  }

}
