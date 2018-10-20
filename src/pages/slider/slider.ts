import { Component } from '@angular/core';
import {AlertController, NavController, NavParams} from 'ionic-angular';
import {HomePage} from "../home/home";
import {InAppBrowser} from "@ionic-native/in-app-browser";
import {Storage} from "@ionic/storage";

@Component({
  selector: 'page-slider',
  templateUrl: 'slider.html',
})
export class SliderPage {

  slides = [
    {
      title: "Now Open-Source!",
      description: "Scaleway Manager is now <b>open-source</b> on GitHub!",
      image: "assets/imgs/github.svg",
    },
    {
      title: "Access to all files",
      description: "You can access to all files and see how Scaleway Manager is working and how your data is used.",
      image: "assets/imgs/box.svg",
    }
  ];

  constructor(public navCtrl: NavController, public navParams: NavParams, private alertCtrl: AlertController,
              private iab: InAppBrowser, private storage: Storage) {
  }

  ionViewDidLoad() {
    //
  }

  public navigate() {
    this.storage.set('slider', 'seen').then(() => {
      this.navCtrl.setRoot(HomePage);
    })
      .catch(error => {
        console.log(error);
        this.navCtrl.setRoot(HomePage);
      });
  }

  public github() {
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
