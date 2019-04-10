import { Component } from '@angular/core';
import {StatusBar} from "@ionic-native/status-bar/ngx";
import {AccountProvider} from "../../providers/account/account";
import {UserDto} from "../../providers/account/account.dto";
import {faShieldAlt, faExclamationCircle} from '@fortawesome/free-solid-svg-icons';
import {ActivatedRoute, Router} from "@angular/router";

@Component({
  selector: 'page-account',
  templateUrl: 'account.html',
})
export class AccountPage {

  public user: UserDto;
  public isLoading: boolean = true;
  public faShieldAlt = faShieldAlt;
  public danger = faExclamationCircle;

  constructor(public router: Router, public activatedRoute: ActivatedRoute,
              public statusBar: StatusBar, private accountProvider: AccountProvider) {
  }

  ionViewDidEnter() {
    this.statusBar.styleLightContent();
  }

  ionViewDidLoad() {
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
      case 'ssh-keys' :
        this.router.navigateByUrl('sshkey');
        break;
      case 'tokens' :
        this.router.navigateByUrl('tokens');
        break;
    }
  }

}
