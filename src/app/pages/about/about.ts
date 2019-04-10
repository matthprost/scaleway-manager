import { Component } from '@angular/core';
import {AlertController} from "@ionic/angular";
import {StatusBar} from "@ionic-native/status-bar/ngx";

@Component({
  selector: 'page-about',
  templateUrl: 'about.html',
})
export class AboutPage {

  constructor(public alertCtrl: AlertController, public statusBar: StatusBar) {
  }

  ionViewDidLoad() {
    //
  }

  ionViewDidEnter() {
    this.statusBar.styleLightContent();
  }
}
