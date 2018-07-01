import { Component } from '@angular/core';
import { NavController, NavParams, ToastController } from 'ionic-angular';
import {AuthProvider} from "../../../providers/auth/auth";
import {HomePage} from "../../home/home";

@Component({
  selector: 'page-login',
  templateUrl: 'login.html',
})
export class LoginPage {

  private email: string = null;
  private password: string = null;

  constructor(public navCtrl: NavController, public navParams: NavParams, public toastCtrl: ToastController,
              private auth: AuthProvider) {
  }

  ionViewDidLoad() {
    //
  }

  login() {
    if (!this.email || !this.password) {
      let message: Array<string> = [];

      this.email ? null: message.push('Error: email is empty');
      this.password ? null : message.push('Error: password is empty');

      const toast = this.toastCtrl.create({
        message: message[0],
        duration: 3000,
        position: 'top'
      });
      toast.present();
    } else {
        this.auth.login(this.email, this.password).then(result => {
          console.log('logged yey');
          this.navCtrl.setRoot(HomePage);
        })
    }
  }

}
