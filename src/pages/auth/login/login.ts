import {Component} from '@angular/core';
import {AlertController, LoadingController, MenuController, NavController, ToastController} from 'ionic-angular';
import {AuthProvider} from "../../../providers/auth/auth";
import {HomePage} from "../../home/home";
import {DoubleAuthPage} from "../double-auth/double-auth";
import {InAppBrowser} from '@ionic-native/in-app-browser/ngx';

@Component({
  selector: 'page-login',
  templateUrl: 'login.html',
})
export class LoginPage {

  private email: string = null;
  private password: string = null;

  constructor(private navCtrl: NavController, private toastCtrl: ToastController,
              private auth: AuthProvider, private menu: MenuController, private loadingCtrl: LoadingController,
              private alertCtrl: AlertController, private iab: InAppBrowser) {
  }

  ionViewDidLoad() {
    //
  }

  public login() {

    // Check if EMAIL and PASSWORD are valid
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
    }

    // If verification passed we do the HTTP request
    else {
      const loader = this.loadingCtrl.create({
        content: "Please wait...",
      });

      loader.present();

      this.auth.login(this.email, this.password).then(result => {
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
          }

          // We check if 2FA is activated, in case we redirect to 2AF page
          else if (error.status === 403 && error.error.type === '2FA_error') {
            this.navCtrl.push(DoubleAuthPage, {email: this.email, password: this.password});
          }

          // This appends when user logged in too many times without logged out. In that case client need to contact
          // Scaleway support to delete all of his tokens
          else if (error.status === 403 && error.error.type === 'invalid_request_error') {
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

  public register() {
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
            ref.close();
          }
        }
      ]
    });
    confirm.present();
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
