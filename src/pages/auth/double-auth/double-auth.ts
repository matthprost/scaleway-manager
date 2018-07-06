import { Component } from '@angular/core';
import {LoadingController, MenuController, NavController, NavParams, ToastController} from 'ionic-angular';
import {AuthProvider} from "../../../providers/auth/auth";
import {HomePage} from "../../home/home";

@Component({
  selector: 'page-double-auth',
  templateUrl: 'double-auth.html',
})
export class DoubleAuthPage {

  public code: string = null;
  private email: string = null;
  private password: string = null;

  constructor(public navCtrl: NavController, public navParams: NavParams, private auth: AuthProvider,
              private menu: MenuController, private loadingCtrl: LoadingController, private toastCtrl: ToastController) {
    this.email = navParams.get('email');
    this.password = navParams.get('password');
  }

  public login() {
    const loader = this.loadingCtrl.create({
      content: "Please wait...",
    });
    loader.present();

    this.auth.login(this.email, this.password, this.code)
      .then(() => {
      this.menu.swipeEnable(true);
      loader.dismiss();

      this.navCtrl.setRoot(HomePage);
    })
      .catch(error => {
      loader.dismiss();

        const toast = this.toastCtrl.create({
          message: 'Token is not valid, please try again',
          duration: 3000,
          position: 'top'
        });
        toast.present();
    });
  }

  ionViewDidLoad() {
    //
  }

}
