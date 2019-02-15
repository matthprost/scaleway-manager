import {Component, ViewChild} from '@angular/core';
import {Nav, Platform, MenuController, AlertController, LoadingController} from 'ionic-angular';
import {StatusBar} from '@ionic-native/status-bar/ngx';
import {SplashScreen} from '@ionic-native/splash-screen/ngx';

import {HomePage} from '../pages/home/home';
import {LoginPage} from '../pages/auth/login/login';
import {AuthTokenDto} from "../providers/auth/auth-tokens.dto";
import {Storage} from '@ionic/storage';
import {ServerPage} from "../pages/server/server";
import {ScreenOrientation} from "@ionic-native/screen-orientation/ngx";
import {AboutPage} from "../pages/about/about";
import {AuthProvider} from "../providers/auth/auth";
import {InAppBrowser} from "@ionic-native/in-app-browser/ngx";
import {BillingPage} from "../pages/billing/billing";
import {faHome, faServer, faQuestion, faSignOutAlt, faCog, faMoneyCheckAlt} from '@fortawesome/free-solid-svg-icons';
import {LogoutProvider} from "../providers/auth/logout/logout";

@Component({
  templateUrl: 'app.html'
})
export class MyApp {
  @ViewChild(Nav) nav: Nav;

  rootPage: any = LoginPage;
  faSignOutAlt = faSignOutAlt;

  pages: Array<{ title: string, component: any, picture?: any, icon?: string, parameters?: any }>;
  pagesBottom: Array<{ title: string, component: any, picture?: any, icon?: string, parameters?: any }>;

  constructor(public platform: Platform, public statusBar: StatusBar, public splashScreen: SplashScreen,
              private storage: Storage, public menu: MenuController, private screenOrientation: ScreenOrientation,
              private authprovider: AuthProvider, private alertCtrl: AlertController, private iab: InAppBrowser,
              private loadingCtrl: LoadingController, private logoutService: LogoutProvider) {
    this.initializeApp();
    this.pages = [
      {
        title: 'Dashboard',
        component: HomePage,
        picture: faHome
      },
      {
        title: 'Servers',
        component: ServerPage,
        picture: faServer,
      },
      {
        title: 'Billing',
        component: BillingPage,
        picture: faMoneyCheckAlt,
      },
      {
        title: 'Settings',
        component: null,
        picture: faCog,
      },

    ];

    this.pagesBottom = [
      {
        title: 'About',
        component: AboutPage,
        picture: faQuestion,
      }
    ];

  }

  initializeApp() {
    this.platform.ready().then(() => {
      // Okay, so the platform is ready and our plugins are available.
      // Here you can do any higher level native things you might need.

      this.menu.swipeEnable(false);
      if (this.platform.is('cordova')) {
        this.screenOrientation.lock(this.screenOrientation.ORIENTATIONS.PORTRAIT);
      }

      this.storage.get('token').then((val: AuthTokenDto) => {
        if (val) {
          this.authprovider.getToken(val.token.id).then(() => {
            this.nav.setRoot(HomePage).then(() => {
              this.statusBar.styleDefault();
              this.menu.swipeEnable(true);
              this.splashScreen.hide();
            });
          })
            .catch(() => {
              this.storage.remove('token').then(() => {
                this.nav.setRoot(LoginPage).then(() => {
                  this.statusBar.styleDefault();
                  this.splashScreen.hide();
                })
              });
            });
        } else {
          this.statusBar.styleDefault();
          this.splashScreen.hide();
        }
      }).catch(() => {
        this.statusBar.styleDefault();
        this.splashScreen.hide();
      });
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

  /*public github() {
    const confirm = this.alertCtrl.create({
      title: 'Warning',
      message: 'It will open your web browser, are you sure ?',
      buttons: [
        {
          text: 'Cancel',
        },
        {
          text: 'Ok',
          handler: () => {
            const ref = this.iab.create('https://github.com/F4OST/Scaleway-Manager', '_system');
            ref.close();
          }
        }
      ]
    });
    confirm.present();
  }*/

  private logout() {
    const loader = this.loadingCtrl.create({
      content: "Please wait...",
    });

    loader.present();

    this.logoutService.logout().then(() => {
      loader.dismiss();
      this.nav.setRoot(LoginPage);
    })
      .catch(error => {
      loader.dismiss();
      console.log(error);
    });
  }
}
