import {Component} from '@angular/core';
import {AlertController, LoadingController, MenuController, NavController, ToastController} from 'ionic-angular';
import {AuthProvider} from "../../../providers/auth/auth";
import {HomePage} from "../../home/home";
import {DoubleAuthPage} from "../double-auth/double-auth";
import {NgForm} from '@angular/forms';
import {InAppBrowser} from '@ionic-native/in-app-browser';

@Component({
  selector: 'page-login',
  templateUrl: 'login.html',
})
export class LoginPage {

  private email: string = null;
  private password: string = null;

  constructor(public navCtrl: NavController, public toastCtrl: ToastController,
              private auth: AuthProvider, public menu: MenuController, public loadingCtrl: LoadingController,
              public alertCtrl: AlertController, private iab: InAppBrowser) {
  }

  ionViewDidLoad() {
    //
  }

  login(loginForm: NgForm) {
    if (!this.email || !this.password) {
      let message: Array<string> = [];

      this.email ? null : message.push('Error: email is empty');
      this.password ? null : message.push('Error: password is empty');

      const toast = this.toastCtrl.create({
        message: message[0],
        duration: 3000,
        position: 'top'
      });
      toast.present();
    } else {
      const loader = this.loadingCtrl.create({
        content: "Please wait...",
      });

      loader.present();

      this.auth.login(this.email, this.password)
        .then(result => {
          this.menu.swipeEnable(true);
          loader.dismiss();

          this.navCtrl.setRoot(HomePage);
        })
        .catch(error => {
          loader.dismiss();

          if (error.status === 401) {
            const toast = this.toastCtrl.create({
              message: 'Error: email or password is incorrect, please check values',
              duration: 3000,
              position: 'top'
            });

            toast.present();
          } else if (error.status === 403 && error.error.type === '2FA_error') {
            this.navCtrl.push(DoubleAuthPage, { email: this.email, password: this.password });
          } else if (error.status === 403 && error.error.type === 'invalid_request_error') {
            const toast = this.toastCtrl.create({
              message: 'Error: too many tokens are registered into your Scaleway account.',
              duration: 3000,
              position: 'top'
            });

            toast.present();
          }
        });
    }
  }

  register() {
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
            const ref = this.iab.create('https://cloud.scaleway.com/#/signup', '_system');
            ref.show();
            ref.close();
          }
        }
      ]
    });
    confirm.present();
  }

}
