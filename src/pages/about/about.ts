import { Component } from '@angular/core';
import {AlertController} from "ionic-angular";
import {InAppBrowser} from "@ionic-native/in-app-browser/ngx";
import {StatusBar} from "@ionic-native/status-bar/ngx";

@Component({
  selector: 'page-about',
  templateUrl: 'about.html',
})
export class AboutPage {

  constructor(public alertCtrl: AlertController, private iab: InAppBrowser, public statusBar: StatusBar) {
  }

  ionViewDidLoad() {
    //
  }

  ionViewDidEnter() {
    this.statusBar.styleDefault();
  }

  public openWebSite() {
    const confirm = this.alertCtrl.create({
      title: 'Warning',
      message: 'It will open your web browser, are you sure ?',
      buttons: [
        {
          text: 'Cancel',
        },
        {
          text: 'Ok',
          handler: () => {
            const ref = this.iab.create('https://github.com/F4OST/Scaleway-Manager', '_system');
            ref.close();
          }
        }
      ]
    });
    confirm.present();
  }
}
