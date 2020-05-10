import {Component, OnInit} from '@angular/core';
import {Router} from '@angular/router';
import {LoadingController, MenuController, ModalController, NavController, ToastController} from '@ionic/angular';
import {AuthService} from '../../../services/user/auth/auth.service';
import {StatusBar} from '@ionic-native/status-bar/ngx';
import {NavParamsService} from '../../../services/nav/nav-params.service';
import {HelpPage} from './help/help.page';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
})
export class LoginPage implements OnInit {

  public email: string = null;
  public password: string = null;

  constructor(private router: Router, private toastCtrl: ToastController, private loadingCtrl: LoadingController,
              private auth: AuthService, private menuCtrl: MenuController, private statusBar: StatusBar, private navCtrl: NavController,
              private navParams: NavParamsService, private modalController: ModalController) {
  }

  ionViewWillEnter() {
    this.menuCtrl.enable(false);
    this.statusBar.styleLightContent();
  }

  ngOnInit() {
  }

  public async showHelp(event: any) {
    const modal = await this.modalController.create({
      component: HelpPage,
    });

    await modal.present();
  }

  public async login() {
    // Check if EMAIL and PASSWORD are valid
    if (!this.email || !this.password) {
      const message: Array<string> = [];

      // tslint:disable-next-line:no-unused-expression
      this.email ? null : message.push('Error: Incorrect username and/or password');
      // tslint:disable-next-line:no-unused-expression
      this.password ? null : message.push('Error: Incorrect username and/or password');

      const toast = await this.toastCtrl.create({
        message: message[0],
        duration: 5000,
        position: 'top',
        color: 'danger',
        mode: 'ios'
      });
      await toast.present();
    } else {
      const loader = await this.loadingCtrl.create({
        message: 'Loading...',
        mode: 'ios'
      });

      await loader.present();

      this.auth.login(this.email, this.password).then(result => {
        loader.dismiss();
        this.router.navigate(['/home']);
      })
        .catch(async error => {
          await loader.dismiss();

          if (error.status === 401) {
            const toast = await this.toastCtrl.create({
              message: 'Error: Incorrect username and/or password',
              duration: 5000,
              position: 'top',
              mode: 'ios',
              color: 'danger'
            });

            await toast.present();
          } else if (error.status === 403 && error.error.type === '2FA_error') {
            this.navParams.setParams({email: this.email, password: this.password});
            await this.navCtrl.navigateForward(['/login/double-auth']);
          } else if (error.status === 403 && error.error.type === 'invalid_request_error') {
            const toast = await this.toastCtrl.create({
              message: 'Error: too many tokens are registered into your Scaleway account.',
              duration: 5000,
              position: 'top',
              mode: 'ios',
              color: 'danger'
            });

            await toast.present();
          }
        });
    }
  }

}
