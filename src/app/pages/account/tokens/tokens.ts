import { Component } from '@angular/core';
import {ItemSliding, Loading, LoadingController, NavController, NavParams} from '@ionic/angular';
import {AuthProvider} from "../../../providers/auth/auth";
import {TokenDto} from "../../../providers/auth/auth-tokens.dto";
import {Storage} from "@ionic/storage";
import {StatusBar} from "@ionic-native/status-bar/ngx";

@Component({
  selector: 'page-tokens',
  templateUrl: 'tokens.html',
})
export class TokensPage {

  public isLoading: boolean = true;
  public tokens: Array<TokenDto> = null;
  public currentSession  = null;

  constructor(public navCtrl: NavController, public navParams: NavParams, private authProvide: AuthProvider,
              private storage: Storage, public statusBar: StatusBar, public loadingCtrl: LoadingController) {
  }

  ionViewDidEnter() {
    this.statusBar.styleDefault();
  }

  ionViewDidLoad() {
    this.refresh().then(() => {
      this.isLoading = false;
    })
  }

  public doRefresh(refresher) {
    this.refresh().then(() => {
      refresher.complete();
    }).catch(error => {
      console.log(error);
      refresher.complete();
    });
  }

  private refresh(loader?: Loading): Promise<any> {
    return new Promise((resolve, reject) => {
      this.authProvide.getAllTokens().then(tokens => {
        this.tokens = tokens.tokens;
        this.storage.get('token').then(result => {
          this.currentSession = result.token.access_key;
          if (loader) {
            loader.dismiss();
          }
          resolve('ok');
        });
      })
        .catch(error => {
          console.log(error);
        })
    });
  }

  public isCurrentSession(token) {

    if (token.access_key === this.currentSession) {
      return true;
    } else {
      return false;
    }
  }

  public deleteToken(token: TokenDto, slidingItem: ItemSliding) {
    slidingItem.close();
    const loader = this.loadingCtrl.create({
      content: "Please wait...",
    });

    loader.present();

    this.authProvide.deleteToken(token.access_key).then(() => {
      this.refresh(loader);
    })
      .catch(error => {
        console.log(error);
        loader.dismiss();
      });
  }

}
