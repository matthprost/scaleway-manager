import { Component } from '@angular/core';
import {ItemSliding, NavController, NavParams} from 'ionic-angular';
import {AuthProvider} from "../../../providers/auth/auth";
import {TokenDto} from "../../../providers/auth/auth-tokens.dto";
import {Storage} from "@ionic/storage";

@Component({
  selector: 'page-tokens',
  templateUrl: 'tokens.html',
})
export class TokensPage {

  private isLoading: boolean = true;
  public tokens: Array<TokenDto> = null;
  public currentSession  = null;

  constructor(public navCtrl: NavController, public navParams: NavParams, private authProvide: AuthProvider,
              private storage: Storage) {
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

    this.authProvide.deleteToken(token.access_key).then(() => {
      this.refresh();
    })
      .catch(error => {
        console.log(error);
      });
  }

}
