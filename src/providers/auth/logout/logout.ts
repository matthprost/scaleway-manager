import {Injectable} from '@angular/core';
import {Storage} from '@ionic/storage';
import {MenuController} from 'ionic-angular';


@Injectable()
export class LogoutProvider {

  constructor(private storage: Storage, public menu: MenuController) {
  }

  public logout(): Promise<any> {

    return new Promise((resolve, reject) => {
      this.storage.remove('token')
        .then(result => {
          this.menu.swipeEnable(false);

          resolve(result);
        })
        .catch(error => {
          this.menu.swipeEnable(false);

          reject(error);
        })
    });
  }

}
