import {Component, OnInit} from '@angular/core';
import {UserDto} from '../../services/user/account/account.dto';
import {faShieldAlt, faExclamationCircle} from '@fortawesome/free-solid-svg-icons';
import {AlertController, ModalController, NavController} from '@ionic/angular';
import {StatusBar} from '@ionic-native/status-bar/ngx';
import {AccountService} from '../../services/user/account/account.service';
import {Storage} from '@ionic/storage';
import {AuthService} from '../../services/user/auth/auth.service';
import {ChangeOrganizationPage} from './change-organization/change-organization.page';

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
  public currentOrganization;

  constructor(public navCtrl: NavController, public statusBar: StatusBar, private accountProvider: AccountService,
              private storage: Storage, private authService: AuthService, private alertCtrl: AlertController,
              public modalController: ModalController) {
    this.statusBar.styleLightContent();
  }

  ngOnInit() {
  }

  ionViewDidEnter() {
    this.statusBar.styleLightContent();
    this.refresh();
  }

  private refresh() {
    this.accountProvider.getUserData().then(async userData => {
      this.user = userData;
      const currentOrganization = await this.storage.get('currentOrganization');
      this.currentOrganization = userData.organizations.find(organization => organization.id === currentOrganization);
      this.isLoading = false;
    })
      .catch(error => {
        console.log(error);
      });
  }

  public async presentModal() {
    const modal = await this.modalController.create({
      component: ChangeOrganizationPage,
    });

    await modal.present();

    await modal.onDidDismiss().then(() => {
      this.refresh();
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
          }
        }
      ]
    });

    await alert.present();
  }

}
