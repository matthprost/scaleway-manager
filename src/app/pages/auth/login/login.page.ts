import {Component, OnInit} from '@angular/core';
import {Router} from '@angular/router';
import {LoadingController, MenuController, ToastController} from '@ionic/angular';
import {AuthService} from '../../../services/user/auth/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
})
export class LoginPage implements OnInit {

  private email: string = null;
  private password: string = null;

  constructor(private router: Router, private toastCtrl: ToastController, private loadingCtrl: LoadingController,
              private auth: AuthService, private menuCtrl: MenuController) {
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
      this.email ? null : message.push('Error: email is empty');
      // tslint:disable-next-line:no-unused-expression
      this.password ? null : message.push('Error: password is empty');

      const toast = await this.toastCtrl.create({
        message: message[0],
        duration: 3000,
        position: 'top',
        color: 'danger'
      });
      toast.present();
    } else {
      const loader = await this.loadingCtrl.create({
        message: 'Please wait...'
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
              message: 'Error: email or password is incorrect, please check values',
              duration: 3000,
              position: 'top'
            });

            toast.present();
          } else if (error.status === 403 && error.error.type === '2FA_error') {
            this.router.navigate(['']);
          } else if (error.status === 403 && error.error.type === 'invalid_request_error') {
            const toast = await this.toastCtrl.create({
              message: 'Error: too many tokens are registered into your Scaleway account.',
              duration: 3000,
              position: 'top'
            });

            toast.present();
          }
        });
    }
  }

}
