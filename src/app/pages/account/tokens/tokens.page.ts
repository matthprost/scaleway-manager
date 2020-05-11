import {Component, OnInit} from '@angular/core';
import {TokenDto} from '../../../services/user/auth/auth-tokens.dto';
import {IonItemSliding, LoadingController, NavController} from '@ionic/angular';
import {AuthService} from '../../../services/user/auth/auth.service';
import {StatusBar} from '@ionic-native/status-bar/ngx';

@Component({
  selector: 'app-tokens',
  templateUrl: './tokens.page.html',
  styleUrls: ['./tokens.page.scss'],
})
export class TokensPage implements OnInit {

  public isLoading = true;
  public tokens: Array<TokenDto> = [];

  constructor(public navCtrl: NavController, private authProvide: AuthService, private loadingCtrl: LoadingController,
              private statusBar: StatusBar) {
    this.statusBar.styleDefault();
  }

  ngOnInit() {
  }

  ionViewDidEnter() {
    this.statusBar.styleDefault();
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
        resolve('ok');
      })
        .catch(error => {
          console.log(error);
        });
    });
  }

  public async deleteToken(token: TokenDto, slidingItem: IonItemSliding) {
    await slidingItem.close();
    const loading = await this.loadingCtrl.create({
      message: 'Loading...',
      mode: 'ios',
    });

    await loading.present();

    this.authProvide.deleteToken(token.access_key).then(() => {
      this.refresh().then(() => {
        loading.dismiss();
      });
    })
      .catch(error => {
        loading.dismiss();
        console.log(error);
      });
  }

}
