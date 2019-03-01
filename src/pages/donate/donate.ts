import {Component} from '@angular/core';
import {AlertController, NavController, NavParams} from 'ionic-angular';
import {StatusBar} from "@ionic-native/status-bar/ngx";
import {InAppBrowser} from "@ionic-native/in-app-browser/ngx";
import {InAppBrowserOptions} from "@ionic-native/in-app-browser";

@Component({
  selector: 'page-donate',
  templateUrl: 'donate.html',
})
export class DonatePage {

  constructor(public navCtrl: NavController, public navParams: NavParams, public statusBar: StatusBar,
              public alertCtrl: AlertController, private iab: InAppBrowser) {
  }

  ionViewDidLoad() {
    //
  }

  ionViewDidEnter() {
    this.statusBar.styleLightContent();
  }

  public openPayPal() {
    const options: InAppBrowserOptions = {
      zoom: 'no'
    };

    const browser = this.iab.create('https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=ZYSVPKAYSM2QC&source=url',
      '_self', options);
  }

}
