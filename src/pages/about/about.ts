import { Component } from '@angular/core';
import {AlertController} from "ionic-angular";
import {InAppBrowser} from "@ionic-native/in-app-browser/ngx";
import {StatusBar} from "@ionic-native/status-bar/ngx";
import {InAppBrowserOptions} from "@ionic-native/in-app-browser";

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
    this.statusBar.styleLightContent();
  }

  public openWebSite() {
    const options: InAppBrowserOptions = {
      zoom: 'no',
      location: 'no',
      toolbarposition: 'top'
    };

    const browser = this.iab.create('https://github.com/F4OST/Scaleway-Manager',
      '_blank', options);
  }
}
