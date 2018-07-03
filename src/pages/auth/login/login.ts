import {Component} from '@angular/core';
import {AlertController, LoadingController, MenuController, NavController, ToastController} from 'ionic-angular';
import {AuthProvider} from "../../../providers/auth/auth";
import {HomePage} from "../../home/home";

@Component({
  selector: 'page-login',
  templateUrl: 'login.html',
})
export class LoginPage {

  private email: string = null;
  private password: string = null;

  constructor(public navCtrl: NavController, public toastCtrl: ToastController,
              private auth: AuthProvider, public menu: MenuController, public loadingCtrl: LoadingController,
              public alertCtrl: AlertController) {
  }

  ionViewDidLoad() {
    //
  }

  login() {
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
        loader.dismissAll();

        this.navCtrl.setRoot(HomePage);
      })

        .catch(error => {
        loader.dismissAll();

        if (error.status === 401) {
          const toast = this.toastCtrl.create({
            message: 'Error: email or password is incorrect, please check values',
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
            window.open('https://cloud.scaleway.com/#/signup', '_system', 'location=yes');
          }
        }
      ]
    });
    confirm.present();
  }

}
