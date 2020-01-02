import {Component} from '@angular/core';
import {ItemSliding, LoadingController, NavController} from 'ionic-angular';
import {AuthProvider} from '../../../providers/auth/auth';
import {TokenDto} from '../../../providers/auth/auth-tokens.dto';
import {StatusBar} from '@ionic-native/status-bar/ngx';

@Component({
  selector: 'page-tokens',
  templateUrl: 'tokens.html',
})
export class TokensPage {

  public isLoading: boolean = true;
  public tokens: Array<TokenDto> = [];

  constructor(public navCtrl: NavController, private authProvide: AuthProvider, public statusBar: StatusBar,
              private loadingCtrl: LoadingController) {
  }

  ionViewDidEnter() {
    this.statusBar.styleDefault();
  }

  ionViewDidLoad() {
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
    return new Promise((resolve) => {
      this.authProvide.getAllTokens().then(tokens => {
        this.tokens = tokens.tokens;
        resolve('ok');
      })
        .catch(error => {
          console.log(error);
        });
    });
  }

  public deleteToken(token: TokenDto, slidingItem: ItemSliding) {
    slidingItem.close();
    let loading = this.loadingCtrl.create({
      content: 'Please wait...'
    });

    loading.present();

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
