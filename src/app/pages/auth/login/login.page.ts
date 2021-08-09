import { Component, NgZone, ViewChild } from "@angular/core";
import { Router } from "@angular/router";
import { Plugins, StatusBarStyle } from "@capacitor/core";
import {
  LoadingController,
  MenuController,
  ModalController,
  NavController,
  ToastController,
} from "@ionic/angular";

import { environment } from "../../../../environments/environment";
import { NavParamsService } from "../../../services/nav/nav-params.service";
import { AuthService } from "../../../services/user/auth/auth.service";

import { HelpPage } from "./help/help.page";

const { StatusBar } = Plugins;

@Component({
  selector: "app-login",
  templateUrl: "./login.page.html",
  styleUrls: ["./login.page.scss"],
})
export class LoginPage {
  @ViewChild("captchaRef") captchaRef;
  public email: string = null;
  public password: string = null;
  private captchaPassed = false;
  private captchaResponse: string;
  public captchaKey = environment.captcha;

  constructor(
    private router: Router,
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController,
    private auth: AuthService,
    private menuCtrl: MenuController,
    private navCtrl: NavController,
    private navParams: NavParamsService,
    private modalController: ModalController,
    private zone: NgZone
  ) {}

  ionViewDidEnter(): void {
    StatusBar.setStyle({ style: StatusBarStyle.Dark });
    this.menuCtrl.enable(false);
  }

  captchaResolved(response: string): void {
    this.zone.run(() => {
      this.captchaPassed = true;
      this.captchaResponse = response;
    });
  }

  public async showHelp(): Promise<void> {
    const modal = await this.modalController.create({
      component: HelpPage,
    });

    await modal.present();
    await modal.onDidDismiss().then(() => {
      StatusBar.setStyle({ style: StatusBarStyle.Dark });
    });
  }

  public async login(): Promise<void> {
    if (!this.email || !this.password) {
      const toast = await this.toastCtrl.create({
        message: "Error: Incorrect username and/or password",
        duration: 5000,
        position: "top",
        color: "danger",
        mode: "ios",
      });

      await toast.present();
    } else {
      const loader = await this.loadingCtrl.create({
        message: "Loading...",
        mode: "ios",
      });

      await loader.present();

      try {
        await this.auth.login({
          email: this.email,
          password: this.password,
          captcha: this.captchaResponse,
        });
        await this.router.navigate(["/home"]);
      } catch (error) {
        if (error.status === 403 && error.error.type === "2FA_error") {
          this.navParams.setParams({
            email: this.email,
            password: this.password,
          });
          await this.navCtrl.navigateForward(["/login/double-auth"]);
        } else {
          this.captchaRef.reset();
        }
      } finally {
        await loader.dismiss();
      }
    }
  }
}
