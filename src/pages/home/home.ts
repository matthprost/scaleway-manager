import { Component } from '@angular/core';
import {NavController, PopoverController} from 'ionic-angular';
import {AccountPopoverPage} from "./account-popover/account-popover";

@Component({
  selector: 'page-home',
  templateUrl: 'home.html'
})
export class HomePage {

  constructor(public navCtrl: NavController, private popoverCtrl: PopoverController) {
  }

  account(ev: UIEvent) {
    let popover = this.popoverCtrl.create(AccountPopoverPage);

    popover.present({
      ev: ev
    });
  }

}
