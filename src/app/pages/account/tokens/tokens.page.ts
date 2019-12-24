import {Component, OnInit} from '@angular/core';
import {TokenDto} from '../../../services/user/auth/auth-tokens.dto';
import {IonItemSliding, NavController} from '@ionic/angular';
import {AuthService} from '../../../services/user/auth/auth.service';
import {Storage} from '@ionic/storage';

@Component({
  selector: 'app-tokens',
  templateUrl: './tokens.page.html',
  styleUrls: ['./tokens.page.scss'],
})
export class TokensPage implements OnInit {

  public isLoading = true;
  public tokens: Array<TokenDto> = null;
  public currentSession = null;

  constructor(public navCtrl: NavController, private authProvide: AuthService, private storage: Storage) {
  }

  ngOnInit() {
  }

  ionViewDidEnter() {
    this.refresh().then(() => {
      this.isLoading = false;
    });
  }

  public doRefresh(refresher) {
    this.refresh().then(() => {
      refresher.complete();
    }).catch(error => {
      console.log(error);
      refresher.complete();
    });
  }

  private refresh(): Promise<any> {
    return new Promise((resolve, reject) => {
      this.authProvide.getAllTokens().then(tokens => {
        this.tokens = tokens.tokens;
        this.storage.get('token').then(result => {
          this.currentSession = result.token.access_key;
          resolve('ok');
        });
      })
        .catch(error => {
          console.log(error);
        });
    });
  }

  public isCurrentSession(token) {
    return token.access_key === this.currentSession;
  }

  public async deleteToken(token: TokenDto, slidingItem: IonItemSliding) {
    await slidingItem.close();

    this.authProvide.deleteToken(token.access_key).then(() => {
      this.refresh();
    })
      .catch(error => {
        console.log(error);
      });
  }

}
