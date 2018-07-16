import {Component} from '@angular/core';
import {AlertController, ViewController} from "ionic-angular";

@Component({
  selector: 'page-account-popover',
  templateUrl: 'account-popover.html',
})
export class AccountPopoverPage {

  constructor(private alertCtrl: AlertController, public viewCtrl: ViewController) {
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

}
