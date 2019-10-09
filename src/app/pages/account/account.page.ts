import {Component, OnInit} from '@angular/core';
import {UserDto} from '../../services/user/account/account.dto';
import {faShieldAlt, faExclamationCircle} from '@fortawesome/free-solid-svg-icons';
import {NavController} from '@ionic/angular';
import {StatusBar} from '@ionic-native/status-bar/ngx';
import {AccountService} from '../../services/user/account/account.service';

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

  constructor(public navCtrl: NavController, public statusBar: StatusBar, private accountProvider: AccountService) {
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

  public navigate(location: string) {
    switch (location) {
      case 'home' :
        this.navCtrl.navigateBack(['/home']);
        break;
      /*case 'ssh-keys' :
        this.navCtrl.push(SshKeysPage);
        break;
      case 'tokens' :
        this.navCtrl.push(TokensPage);
        break;*/
    }
  }

}
