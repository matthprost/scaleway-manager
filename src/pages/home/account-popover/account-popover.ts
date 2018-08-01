import {Component} from '@angular/core';
import {AlertController, App, ViewController} from "ionic-angular";
import {BillingPage} from "../../billing/billing";

@Component({
  selector: 'page-account-popover',
  templateUrl: 'account-popover.html',
})
export class AccountPopoverPage {

  constructor(private alertCtrl: AlertController, private viewCtrl: ViewController, private app: App) {
  }

  ionViewDidLoad() {
    //
  }

  public logout() {
    const confirm = this.alertCtrl.create({
      title: 'Logout?',
      message: 'Are you sure you want to logout?',
      buttons: [
        {
          text: 'No',
          handler: () => {
            this.viewCtrl.dismiss({logout: false});
          }
        },
        {
          text: 'Yes',
          handler: () => {
            this.viewCtrl.dismiss({logout: true});
          }
        }
      ]
    });
    confirm.present();
  }

  public navigate(location: string) {
    switch (location) {
      case 'billing' :
        this.viewCtrl.dismiss();
        this.app.getRootNavs()[0].push(BillingPage).then(() => {
        });
        break;
    }
  }

}
