import {Component} from '@angular/core';
import {AlertController, App, NavController, ViewController} from "ionic-angular";
import {BillingPage} from "../../billing/billing";

@Component({
  selector: 'page-account-popover',
  templateUrl: 'account-popover.html',
})
export class AccountPopoverPage {

  constructor(private alertCtrl: AlertController, public viewCtrl: ViewController, public navCtrl: NavController, public app: App) {
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

  navigate(location: string) {
    switch (location) {
      case 'billing' :
        this.viewCtrl.dismiss();
        this.app.getRootNav().push(BillingPage).then(() => {
        });
        break;
    }
  }

}
