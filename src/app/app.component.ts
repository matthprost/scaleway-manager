import {Component, ViewChild} from '@angular/core';
import {Nav, Platform, MenuController, LoadingController} from 'ionic-angular';
import {StatusBar} from '@ionic-native/status-bar/ngx';
import {SplashScreen} from '@ionic-native/splash-screen/ngx';
import {HomePage} from '../pages/home/home';
import {LoginPage} from '../pages/auth/login/login';
import {Storage} from '@ionic/storage';
import {ServerPage} from "../pages/server/server";
import {ScreenOrientation} from "@ionic-native/screen-orientation/ngx";
import {AboutPage} from "../pages/about/about";
import {AuthProvider} from "../providers/auth/auth";
import {BillingPage} from "../pages/billing/billing";
import {faHome, faServer, faQuestion, faSignOutAlt, faUser, faMoneyCheckAlt, faCode} from '@fortawesome/free-solid-svg-icons';
import {LogoutProvider} from "../providers/auth/logout/logout";
import {AccountPage} from "../pages/account/account";

@Component({
  templateUrl: 'app.html'
})
export class MyApp {
  @ViewChild(Nav) nav: Nav;

  rootPage: any = LoginPage;
  faSignOutAlt = faSignOutAlt;
  faCode = faCode;

  pages: Array<{ title: string, component: any, picture?: any, icon?: string, parameters?: any }>;
  pagesBottom: Array<{ title: string, component: any, picture?: any, icon?: string, parameters?: any }>;

  constructor(public platform: Platform, public statusBar: StatusBar, public splashScreen: SplashScreen,
              private storage: Storage, public menu: MenuController, private screenOrientation: ScreenOrientation,
              private authprovider: AuthProvider, private loadingCtrl: LoadingController,
              private logoutService: LogoutProvider) {
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
        title: 'Account',
        component: AccountPage,
        picture: faUser,
      },
      {
        title: 'Billing',
        component: BillingPage,
        picture: faMoneyCheckAlt,
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

      this.storage.get('token').then((val: any) => {
        if (val) {
          /*this.authprovider.getToken(val.token.auth.jwt_key).then(() => {*/
            this.nav.setRoot(HomePage).then(() => {
              this.statusBar.styleDefault();
              this.menu.swipeEnable(true);
              this.splashScreen.hide();
            })
              .catch(error => {
                console.log(error);
                this.splashScreen.hide();
              });
          /*})
            .catch(() => {
              this.storage.remove('token').then(() => {
                this.nav.setRoot(LoginPage).then(() => {
                  this.statusBar.styleDefault();
                  this.splashScreen.hide();
                })
              });
            });*/
        } else {
          this.statusBar.styleDefault();
          this.splashScreen.hide();
        }
      }).catch(() => {
        this.nav.setRoot(LoginPage).then(() => {
          this.statusBar.styleDefault();
          this.splashScreen.hide();
        });
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

  public logout() {
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
