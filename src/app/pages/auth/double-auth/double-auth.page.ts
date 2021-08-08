import {Component} from '@angular/core';
import {LoadingController, MenuController, NavController, ToastController} from '@ionic/angular';

import {NavParamsService} from '../../../services/nav/nav-params.service';
import {AuthService} from '../../../services/user/auth/auth.service';

@Component({
  selector: 'app-double-auth',
  templateUrl: './double-auth.page.html',
  styleUrls: ['./double-auth.page.scss'],
})
export class DoubleAuthPage {

  public code: string = null;
  private logins;

  constructor(private auth: AuthService, private loadingCtrl: LoadingController, private navCtrl: NavController,
              private toastCtrl: ToastController, private menuCtrl: MenuController, private navParams: NavParamsService) {
  }

  ionViewWillEnter(): void {
    this.menuCtrl.enable(false);
    this.logins = this.navParams.getParams();
  }

  public async login(): Promise<void> {
    const loader = await this.loadingCtrl.create({
      message: 'Loading...',
      mode: 'ios',
    });

    await loader.present();
    try {
      await this.auth.login({
        email: this.logins.email,
        password: this.logins.password,
        captcha: this.logins.captcha,
        code: this.code,
      });
      await this.navCtrl.navigateRoot(['home']);
    } finally {
      await loader.dismiss();
    }
  }
}
