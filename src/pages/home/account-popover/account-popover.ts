import { Component } from '@angular/core';
import {LoginPage} from "../../auth/login/login";
import {AlertController, NavController} from "ionic-angular";
import {LogoutProvider} from "../../../providers/auth/logout/logout";

@Component({
  selector: 'page-account-popover',
  templateUrl: 'account-popover.html',
})
export class AccountPopoverPage {

  constructor(private alertCtrl: AlertController, private logoutProvider: LogoutProvider,
              public navCtrl: NavController) {
  }

  ionViewDidLoad() {
    //
  }

  logout() {

    const confirm = this.alertCtrl.create({
      title: 'Logout?',
      message: 'Are you sure you want to logout?',
      buttons: [
        {
          text: 'No',
        },
        {
          text: 'Yes',
          handler: () => {
            this.logoutProvider.logout().then(() => {
              this.navCtrl.setRoot(LoginPage);
            });
          }
        }
      ]
    });
    confirm.present();
  }

}
