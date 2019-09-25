import {Component, OnInit} from '@angular/core';
import {Router} from '@angular/router';
import {LoadingController, MenuController, ToastController} from '@ionic/angular';
import {AuthService} from '../../../services/user/auth/auth.service';
import { StatusBar } from '@ionic-native/status-bar/ngx';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
})
export class LoginPage implements OnInit {

  private email: string = null;
  private password: string = null;

  constructor(private router: Router, private toastCtrl: ToastController, private loadingCtrl: LoadingController,
              private auth: AuthService, private menuCtrl: MenuController, private statusBar: StatusBar) {
    this.statusBar.styleLightContent();
  }

  ionViewWillEnter() {
    this.menuCtrl.enable(false);
  }

  ngOnInit() {
  }

  public async login() {
    // Check if EMAIL and PASSWORD are valid
    if (!this.email || !this.password) {
      const message: Array<string> = [];

      // tslint:disable-next-line:no-unused-expression
      this.email ? null : message.push('Error: Please fill email input');
      // tslint:disable-next-line:no-unused-expression
      this.password ? null : message.push('Error: Please fill password input');

      const toast = await this.toastCtrl.create({
        message: message[0],
        duration: 5000,
        position: 'top',
        color: 'danger',
        mode: 'ios'
      });
      toast.present();
    } else {
      const loader = await this.loadingCtrl.create({
        message: 'Loading...'
      });

      loader.present();

      this.auth.login(this.email, this.password).then(result => {
        loader.dismiss();

        this.router.navigate(['/home']);
      })
        .catch(async error => {
          loader.dismiss();

          if (error.status === 401) {
            const toast = await this.toastCtrl.create({
              message: 'Error: Email or password is incorrect, please try again',
              duration: 5000,
              position: 'top',
              mode: 'ios'
            });

            toast.present();
          } else if (error.status === 403 && error.error.type === '2FA_error') {
            this.router.navigate(['']);
          } else if (error.status === 403 && error.error.type === 'invalid_request_error') {
            const toast = await this.toastCtrl.create({
              message: 'Error: too many tokens are registered into your Scaleway account.',
              duration: 5000,
              position: 'top',
              mode: 'ios'
            });

            toast.present();
          }
        });
    }
  }

}
