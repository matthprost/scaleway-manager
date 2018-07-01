import {Injectable} from '@angular/core';
import {Storage} from '@ionic/storage';
import {LoadingController, MenuController} from 'ionic-angular';


@Injectable()
export class LogoutProvider {

  constructor(private storage: Storage, public loadingCtrl: LoadingController, public menu: MenuController) {
  }

  logout(): Promise<any> {

    const loader = this.loadingCtrl.create({
      content: "Please wait...",
    });

    loader.present();

    return new Promise((resolve, reject) => {
      this.storage.remove('token')
        .then(result => {
          this.menu.swipeEnable(false);
          loader.dismissAll();

          resolve(result);
        })
        .catch(error => {
          this.menu.swipeEnable(false);
          loader.dismissAll();

          reject(error);
        })
    });
  }

}
