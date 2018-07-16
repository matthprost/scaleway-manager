import {Component} from '@angular/core';
import {LoadingController, NavController, PopoverController} from 'ionic-angular';
import {AccountPopoverPage} from "./account-popover/account-popover";
import {LogoutProvider} from "../../providers/auth/logout/logout";
import {LoginPage} from "../auth/login/login";

@Component({
  selector: 'page-home',
  templateUrl: 'home.html'
})
export class HomePage {

  constructor(public navCtrl: NavController, private popoverCtrl: PopoverController,
              private logoutService: LogoutProvider, private loadingCtrl: LoadingController) {
  }

  account(ev: UIEvent) {
    let popover = this.popoverCtrl.create(AccountPopoverPage);

    popover.present({
      ev: ev
    });
    popover.onDidDismiss(result => {
      if (result && result.logout) {
        const loader = this.loadingCtrl.create({
          content: "Please wait...",
        });

        loader.present();
        this.logoutService.logout().then(() => {
          loader.dismiss();
          this.navCtrl.setRoot(LoginPage);
        });
      }
    });
  }

}
