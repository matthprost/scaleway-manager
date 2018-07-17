import {Component} from '@angular/core';
import {LoadingController, NavController, PopoverController} from 'ionic-angular';
import {AccountPopoverPage} from "./account-popover/account-popover";
import {LogoutProvider} from "../../providers/auth/logout/logout";
import {LoginPage} from "../auth/login/login";
import {ServerPage} from "../server/server";

@Component({
  selector: 'page-home',
  templateUrl: 'home.html'
})
export class HomePage {

  public classAppear: string = 'card-cont';
  public rect: string = '';

  constructor(public navCtrl: NavController, private popoverCtrl: PopoverController,
              private logoutService: LogoutProvider, private loadingCtrl: LoadingController) {
  }

  ionViewDidLoad() {
    this.rect = 'background-rect rect-scale';
    setTimeout(() => {
      this.classAppear = 'card-appear';
    }, 500);
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

  navigate(location: string) {
    switch (location) {
      case 'paris' :
        this.navCtrl.setRoot(ServerPage, {server: 'Paris'});
        break;
      case 'netherlands' :
        this.navCtrl.setRoot(ServerPage, {server: 'Netherlands'});
        break;
    }
  }

}
