import {Component, OnInit} from '@angular/core';
import {UserDto} from '../../services/user/account/account.dto';
import {faShieldAlt, faExclamationCircle} from '@fortawesome/free-solid-svg-icons';
import {AlertController, NavController, ToastController} from '@ionic/angular';
import {StatusBar} from '@ionic-native/status-bar/ngx';
import {AccountService} from '../../services/user/account/account.service';
import {Storage} from '@ionic/storage';
import {AuthService} from '../../services/user/auth/auth.service';

@Component({
  selector: 'app-account',
  templateUrl: './account.page.html',
  styleUrls: ['./account.page.scss'],
})
export class AccountPage implements OnInit {

  public user: UserDto;
  public isLoading = true;
  public faShieldAlt = faShieldAlt;
  public danger = faExclamationCircle;

  constructor(public navCtrl: NavController, public statusBar: StatusBar, private accountProvider: AccountService,
              private storage: Storage, private authService: AuthService, private alertCtrl: AlertController,
              private toastController: ToastController) {
    this.statusBar.styleLightContent();
  }

  ngOnInit() {
  }

  ionViewDidEnter() {
    this.statusBar.styleLightContent();
    this.accountProvider.getUserData().then(userData => {
      this.user = userData;
      this.isLoading = false;
    })
      .catch(error => {
        console.log(error);
      });
  }

  public async navigate(location: string) {
    switch (location) {
      case 'home' :
        await this.navCtrl.navigateBack(['/home']);
        break;
      case 'ssh-keys' :
        await this.navCtrl.navigateForward(['/home/account/ssh-keys']);
        break;
      case 'tokens' :
        await this.navCtrl.navigateForward(['/home/account/tokens']);
        break;
    }
  }

  public async logout() {
    const alert = await this.alertCtrl.create({
      header: 'Logout',
      mode: 'ios',
      message: 'Are you sure you want to logout?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          cssClass: 'secondary',
        }, {
          text: 'Yes',
          handler: async () => {
            await this.storage.remove('settings');
            const AWSToken = await this.storage.get('awsToken');

            if (AWSToken) {
              await this.authService.deleteToken(AWSToken.token.access_key);
              await this.storage.remove('awsToken');
            }

            await this.authService.logout();
            await this.navCtrl.navigateRoot(['/login']);
          }
        }
      ]
    });

    await alert.present();
  }

}
