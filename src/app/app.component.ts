import {Component} from '@angular/core';
import {Platform, MenuController} from '@ionic/angular';
import {StatusBar} from '@ionic-native/status-bar/ngx';
import {SplashScreen} from '@ionic-native/splash-screen/ngx';
import {LoginPage} from './pages/auth/login/login';
import {AuthTokenDto} from "./providers/auth/auth-tokens.dto";
import {Storage} from '@ionic/storage';
import {ScreenOrientation} from "@ionic-native/screen-orientation/ngx";
import {AuthProvider} from "./providers/auth/auth";
import {
  faHome,
  faServer,
  faQuestion,
  faSignOutAlt,
  faUser,
  faMoneyCheckAlt,
  faCode
} from '@fortawesome/free-solid-svg-icons';
import {LogoutProvider} from "./providers/auth/logout/logout";
import {Router} from "@angular/router";

@Component({
  templateUrl: 'app.html'
})
export class AppComponent {
  rootPage: any = LoginPage;
  faSignOutAlt = faSignOutAlt;
  faCode = faCode;

  pages: Array<{ title: string, component: any, picture?: any, icon?: string, parameters?: any }>;
  pagesBottom: Array<{ title: string, component: any, picture?: any, icon?: string, parameters?: any }>;

  constructor(public platform: Platform, public statusBar: StatusBar, public splashScreen: SplashScreen,
              private storage: Storage, public menu: MenuController, private screenOrientation: ScreenOrientation,
              private authprovider: AuthProvider, private logoutService: LogoutProvider, public router: Router) {
    this.initializeApp();
    this.pages = [
      {
        title: 'Dashboard',
        component: '/home',
        picture: faHome
      },
      {
        title: 'Servers',
        component: '/server',
        picture: faServer,
      },
      {
        title: 'Account',
        component: '/account',
        picture: faUser,
      },
      {
        title: 'Billing',
        component: '/billing',
        picture: faMoneyCheckAlt,
      },

    ];

    this.pagesBottom = [
      {
        title: 'About',
        component: '/about',
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
            this.router.navigateByUrl('/home').then(() => {
              this.statusBar.styleDefault();
              this.menu.swipeEnable(true);
              this.splashScreen.hide();
            })
              .catch(error => {
                console.log(error);
                this.splashScreen.hide();
              });
          })
            .catch(() => {
              this.storage.remove('token').then(() => {
                this.router.navigateByUrl('/login').then(() => {
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

  public openPage(page) {
    // Reset the content nav to have just this page
    // we wouldn't want the back button to show in this scenario

    if (page.parameters) {
      this.router.navigateByUrl(page.component);
    }
  }

  public logout() {

    this.logoutService.logout().then(() => {
      this.router.navigateByUrl('/login');
    })
      .catch(error => {
        console.log(error);
      });
  }
}
