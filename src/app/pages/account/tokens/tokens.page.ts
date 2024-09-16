import { Component, type OnInit } from "@angular/core";
import { StatusBar, Style as StatusBarStyle } from '@capacitor/status-bar';
import {
  IonItemSliding,
  LoadingController,
  NavController,
} from "@ionic/angular";

import { AuthService } from "../../../services/user/auth/auth.service";
import { TokenDto } from "../../../services/user/project/tokens/tokens.dto";
import { TokensService } from "../../../services/user/project/tokens/tokens.service";



@Component({
  selector: "app-tokens",
  templateUrl: "./tokens.page.html",
  styleUrls: ["./tokens.page.scss"],
})
export class TokensPage implements OnInit {
  public isLoading = true;
  public tokens: TokenDto[] = [];

  constructor(
    public navCtrl: NavController,
    private authProvide: AuthService,
    private loadingCtrl: LoadingController,
    private tokensService: TokensService
  ) {}

  ngOnInit() {}

  ionViewDidEnter() {
    StatusBar.setStyle({ style: StatusBarStyle.Light });
    this.refresh().then(() => {
      this.isLoading = false;
    });
  }

  public doRefresh(refresher) {
    this.refresh()
      .then(() => {
        refresher.complete();
      })
      .catch((error) => {
        console.log(error);
        refresher.complete();
      });
  }

  private async refresh(): Promise<any> {
    this.tokens = await this.tokensService.getAllTokens();
  }

  public async deleteToken(token: TokenDto, slidingItem: IonItemSliding) {
    await slidingItem.close();
    const loading = await this.loadingCtrl.create({
      message: "Loading...",
      mode: "ios",
    });

    await loading.present();

    this.tokensService
      .deleteToken(token.access_key)
      .then(() => {
        this.refresh().then(() => {
          loading.dismiss();
        });
      })
      .catch((error) => {
        loading.dismiss();
        console.log(error);
      });
  }
}
