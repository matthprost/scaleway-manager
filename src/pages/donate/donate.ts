import {Component} from '@angular/core';
import {AlertController, NavController, NavParams, Platform} from 'ionic-angular';
import {StatusBar} from "@ionic-native/status-bar/ngx";
import {InAppBrowser} from "@ionic-native/in-app-browser/ngx";
import {InAppBrowserOptions} from "@ionic-native/in-app-browser";
import {InAppPurchase} from "@ionic-native/in-app-purchase/ngx";

@Component({
  selector: 'page-donate',
  templateUrl: 'donate.html',
})
export class DonatePage {

  products = [];
  public isIos: boolean = false;

  constructor(public navCtrl: NavController, public navParams: NavParams, public statusBar: StatusBar,
              public alertCtrl: AlertController, private iab: InAppBrowser, private iap: InAppPurchase,
              public platform: Platform) {
    this.platform.ready().then( () => {
      if (this.platform.is('ios')) {
        this.isIos = true;
      }
    });

    this.iap.getProducts(['baguette_donate']).then(products => {
      this.products = products;
    })
      .catch((err) => {
        console.log(err);
      });
  }

  ionViewDidEnter() {
    this.statusBar.styleLightContent();
  }

  public donate(product) {
    this.iap.buy(product).then(result => {
      const alert = this.alertCtrl.create({
        title: 'Thank you!',
        message: 'Thank you for your donation :D',
        buttons: ['Your welcome']
      });

      alert.present();
    })
  }

  public openPayPal() {
    const options: InAppBrowserOptions = {
      zoom: 'no'
    };

    const browser = this.iab.create('https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=ZYSVPKAYSM2QC&source=url',
      '_self', options);
  }

}
