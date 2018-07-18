import {Component, ViewChild} from '@angular/core';
import {Nav, Platform, MenuController} from 'ionic-angular';
import {StatusBar} from '@ionic-native/status-bar';
import {SplashScreen} from '@ionic-native/splash-screen';

import {HomePage} from '../pages/home/home';
import {LoginPage} from '../pages/auth/login/login';
import {AuthTokenDto} from "../providers/auth/auth-tokens.dto";
import {Storage} from '@ionic/storage';
import {ServerPage} from "../pages/server/server";



@Component({
  templateUrl: 'app.html'
})
export class MyApp {
  @ViewChild(Nav) nav: Nav;

  rootPage: any = LoginPage;

  pages: Array<{ title: string, component: any, picture?: string, icon?: string, parameters?: any }>;

  constructor(public platform: Platform, public statusBar: StatusBar, public splashScreen: SplashScreen,
              private storage: Storage, public menu: MenuController) {
    this.initializeApp();

    this.pages = [
      {
        title: 'Home',
        component: HomePage,
        picture: ''
      },
      {
        title: 'Paris',
        component: ServerPage,
        picture: '/assets/imgs/france.svg',
        parameters: {country: 'Paris'}
      },
      {
        title: 'Amsterdam',
        component: ServerPage,
        picture: '/assets/imgs/netherlands.svg',
        parameters: {country: 'Amsterdam'}
      }
    ];

  }

  initializeApp() {
    this.platform.ready().then(() => {
      // Okay, so the platform is ready and our plugins are available.
      // Here you can do any higher level native things you might need.

      this.menu.swipeEnable(false);

      this.storage.get('token').then((val: AuthTokenDto) => {
        if (val) {
          this.nav.setRoot(HomePage);
        }
      });

      this.statusBar.styleDefault();
      this.splashScreen.hide();
    });
  }

  openPage(page) {
    // Reset the content nav to have just this page
    // we wouldn't want the back button to show in this scenario
    if (page.parameters) {
      this.nav.setRoot(page.component, {server: page.parameters.country});
    } else {
      this.nav.setRoot(page.component);
    }
  }
}
