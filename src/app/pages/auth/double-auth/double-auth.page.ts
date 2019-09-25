import {Component, OnInit} from '@angular/core';
import {AuthService} from '../../../services/user/auth/auth.service';
import {LoadingController, MenuController, NavController, ToastController} from '@ionic/angular';

@Component({
  selector: 'app-double-auth',
  templateUrl: './double-auth.page.html',
  styleUrls: ['./double-auth.page.scss'],
})
export class DoubleAuthPage implements OnInit {

  public code: string = null;
  private email: string = null;
  private password: string = null;

  constructor(private auth: AuthService, private loadingCtrl: LoadingController, private navCtrl: NavController,
              private toastCtrl: ToastController, private menuCtrl: MenuController) {
  }

  ionViewWillEnter() {
    this.menuCtrl.enable(false);
  }

  ngOnInit() {
  }

  public async login() {
    const loader = await this.loadingCtrl.create({
      message: 'Loading...',
    });
    await loader.present();

    this.auth.login(this.email, this.password, this.code)
      .then(() => {
        loader.dismiss();

        this.navCtrl.navigateForward(['home']);
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
