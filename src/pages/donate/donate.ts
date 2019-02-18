import { Component } from '@angular/core';
import { NavController, NavParams } from 'ionic-angular';
import {StatusBar} from "@ionic-native/status-bar/ngx";

@Component({
  selector: 'page-donate',
  templateUrl: 'donate.html',
})
export class DonatePage {

  constructor(public navCtrl: NavController, public navParams: NavParams, public statusBar: StatusBar) {
  }

  ionViewDidLoad() {
    //
  }

  ionViewDidEnter() {
    this.statusBar.styleLightContent();
  }

}
