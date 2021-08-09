import {Component, NgZone, ViewChild} from '@angular/core';
import {
  LoadingController,
  MenuController,
  NavController,
  ToastController,
} from "@ionic/angular";

import { environment } from "../../../../environments/environment";
import { NavParamsService } from "../../../services/nav/nav-params.service";
import { AuthService } from "../../../services/user/auth/auth.service";

@Component({
  selector: "app-double-auth",
  templateUrl: "./double-auth.page.html",
  styleUrls: ["./double-auth.page.scss"],
})
export class DoubleAuthPage {
  @ViewChild("captchaRef") captchaRef;

  public code: string = null;
  private logins;
  private captchaPassed = false;
  public captchaResponse: string;
  public captchaKey = environment.captcha;

  constructor(
    private auth: AuthService,
    private loadingCtrl: LoadingController,
    private navCtrl: NavController,
    private toastCtrl: ToastController,
    private menuCtrl: MenuController,
    private navParams: NavParamsService,
    private zone: NgZone
  ) {}

  ionViewWillEnter(): void {
    this.menuCtrl.enable(false);
    this.logins = this.navParams.getParams();
  }

  captchaResolved(response: string): void {
    this.zone.run(() => {
      this.captchaPassed = true;
      this.captchaResponse = response;
    });
  }

  public async login(): Promise<void> {
    const loader = await this.loadingCtrl.create({
      message: "Loading...",
      mode: "ios",
    });

    await loader.present();
    try {
      await this.auth.login({
        email: this.logins.email,
        password: this.logins.password,
        captcha: this.captchaResponse,
        code: this.code,
      });
      await this.navCtrl.navigateRoot(["home"]);
    } catch (error) {
      this.captchaRef.reset()
    } finally {
      await loader.dismiss();
    }
  }
}
