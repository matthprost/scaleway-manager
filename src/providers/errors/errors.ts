import {Injectable} from '@angular/core';
import {App} from "ionic-angular";
import {LoginPage} from "../../pages/auth/login/login";
import { Storage } from '@ionic/storage';

@Injectable()
export class ErrorsProvider {

  constructor(private app: App, private storage: Storage) {
    //
  }

  public apiError(error) {
    this.storage.remove('token').then(() => {
      this.app.getActiveNav().setRoot(LoginPage).catch(error => {
        console.log(error);
      });
    })
      .catch(error => {
        console.log(error);
        this.app.getActiveNav().setRoot(LoginPage).catch(error => {
          console.log(error);
        });
      });
  }
}
