import { Component } from '@angular/core';
import { NavController, NavParams, ToastController } from 'ionic-angular';

@Component({
  selector: 'page-login',
  templateUrl: 'login.html',
})
export class LoginPage {

  email: string = null;
  password: string = null;

  constructor(public navCtrl: NavController, public navParams: NavParams, public toastCtrl: ToastController) {
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
    }
  }

}
