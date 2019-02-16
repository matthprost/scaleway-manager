import { Component } from '@angular/core';
import { NavController, NavParams } from 'ionic-angular';
import {StatusBar} from "@ionic-native/status-bar/ngx";

@Component({
  selector: 'page-account',
  templateUrl: 'account.html',
})
export class AccountPage {

  constructor(public navCtrl: NavController, public navParams: NavParams,
              public statusBar: StatusBar) {
  }

  ionViewDidEnter() {
    this.statusBar.styleLightContent();
  }

  ionViewDidLoad() {
    //
  }

}
