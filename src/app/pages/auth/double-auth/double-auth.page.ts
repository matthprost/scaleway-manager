import {Component, OnInit} from '@angular/core';
import {AuthService} from '../../../services/user/auth/auth.service';
import {LoadingController, MenuController, NavController, ToastController} from '@ionic/angular';
import {NavParamsService} from '../../../services/nav/nav-params.service';

@Component({
  selector: 'app-double-auth',
  templateUrl: './double-auth.page.html',
  styleUrls: ['./double-auth.page.scss'],
})
export class DoubleAuthPage implements OnInit {

  public code: string = null;
  private logins;

  constructor(private auth: AuthService, private loadingCtrl: LoadingController, private navCtrl: NavController,
              private toastCtrl: ToastController, private menuCtrl: MenuController, private navParams: NavParamsService) {
  }

  ionViewWillEnter() {
    this.menuCtrl.enable(false);
    this.logins = this.navParams.getParams();
  }

  ngOnInit() {
  }

  public async login() {
    const loader = await this.loadingCtrl.create({
      message: 'Loading...',
      mode: 'ios',
    });
    await loader.present();

    this.auth.login(this.logins.email, this.logins.password, this.logins.captcha, this.code)
      .then(() => {
        loader.dismiss();

        this.navCtrl.navigateRoot(['home']);
      })
      .catch(async error => {
        await loader.dismiss();

        const toast = await this.toastCtrl.create({
          message: 'Code is not valid, please try again',
          duration: 5000,
          position: 'top',
          color: 'danger',
          mode: 'ios'
        });
        await toast.present();
      });
  }
}
