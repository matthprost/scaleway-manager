import {Injectable} from '@angular/core';
import {App} from "ionic-angular";
import {LoginPage} from "../../pages/auth/login/login";

@Injectable()
export class ErrorsProvider {

  constructor(private app: App) {
    //
  }

  public apiError(error) {
    this.app.getActiveNav().setRoot(LoginPage);
  }
}
