import { Component } from '@angular/core';
import {LoadingController, MenuController, ToastController} from '@ionic/angular';
import {AuthProvider} from "../../../providers/auth/auth";
import {StatusBar} from "@ionic-native/status-bar/ngx";
import {ActivatedRoute, Router} from "@angular/router";

@Component({
  selector: 'page-double-auth',
  templateUrl: 'double-auth.html',
})
export class DoubleAuthPage {

  public code: string = null;
  private email: string = null;
  private password: string = null;

  constructor(private router: Router, private activatedRoute: ActivatedRoute, private auth: AuthProvider,
              private menu: MenuController, private loadingCtrl: LoadingController, private toastCtrl: ToastController,
              public statusBar: StatusBar) {

    this.email = this.activatedRoute.snapshot.paramMap.get('email');
    this.password = this.activatedRoute.snapshot.paramMap.get('password');
  }

  ionViewDidLoad() {
    //
  }

  ionViewDidEnter() {
    this.statusBar.styleDefault();
  }

  public async login() {
    const toast = await this.toastCtrl.create({
      message: 'Token is not valid, please try again',
      duration: 3000,
      position: 'top'
    });

    this.auth.login(this.email, this.password, this.code)
      .then(() => {
      this.menu.swipeEnable(true);

      this.router.navigateByUrl('/home');
    })
      .catch(error => {

        toast.present();
    });
  }

}
