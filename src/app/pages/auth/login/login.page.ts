import { Component, ElementRef, NgZone, ViewChild } from "@angular/core";
import { Router } from "@angular/router";
import { Capacitor } from "@capacitor/core";
import { StatusBar, Style as StatusBarStyle } from '@capacitor/status-bar';
import {
  LoadingController,
  MenuController,
  ModalController,
  NavController,
  ToastController,
} from "@ionic/angular";
import { WidgetInstance } from 'friendly-challenge'

import { environment } from "../../../../environments/environment";
import { NavParamsService } from "../../../services/nav/nav-params.service";
import { AuthService } from "../../../services/user/auth/auth.service";

import { HelpPage } from "./help/help.page";



@Component({
  selector: "app-login",
  templateUrl: "./login.page.html",
  styleUrls: ["./login.page.scss"],
})
export class LoginPage {
  @ViewChild("captchaRef") captchaRef;
  @ViewChild('frccaptcha', { static: false })
  friendlyCaptcha: ElementRef<HTMLElement>;
  public email: string = null;
  public password: string = null;
  public captcha = null;
  public isNative = null;

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
  ) {
    this.isNative = Capacitor.isNativePlatform()
  }

  ngAfterViewInit() {
       const widget = new WidgetInstance(this.friendlyCaptcha.nativeElement, {
         doneCallback: (a) => {
           console.log('DONE: ', a);
           this.captcha = a
         },
         errorCallback: (b) => {
           console.log('FAILED', b);
         },
       })

       widget.start()
   }

  ionViewDidEnter(): void {
    StatusBar.setStyle({ style: StatusBarStyle.Dark });
    this.menuCtrl.enable(false);
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
      const captchaSolution = (document.querySelector('#friendly-captcha input[name="frc-captcha-solution"]') as HTMLInputElement).value;
      console.log('Captcha Solution:', captchaSolution);

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
          captcha: this.captcha
        });
        await this.router.navigate(["/home"]);
      } catch (error) {
        console.log(error.error.details[0].argument_name)
        if (error.status === 400 && error.error.details[0].argument_name === "2FA_token") {
          this.navParams.setParams({
            email: this.email,
            password: this.password,
            captcha: this.captcha
          });
          await this.navCtrl.navigateForward(["/login/double-auth"]);
        } else {
          // this.captchaRef.reset();
          const toast = await this.toastCtrl.create({
            message: `Error: ${error.error.message || "Unknown Error"}`,
            duration: 5000,
            position: "top",
            mode: "ios",
            color: "danger",
            //showCloseButton: true,
          });

          await toast.present();
        }
      } finally {
        await loader.dismiss();
      }
    }
  }
}
