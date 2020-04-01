import {Component} from '@angular/core';

import {Platform} from '@ionic/angular';
import {SplashScreen} from '@ionic-native/splash-screen/ngx';
import {StatusBar} from '@ionic-native/status-bar/ngx';
import {ScreenOrientation} from '@ionic-native/screen-orientation/ngx';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html'
})
export class AppComponent {
  public appPages = [
    {
      title: 'Dashboard',
      url: '/home',
      icon: 'md-home',
      pro: false
    },
    {
      title: 'Instances',
      url: '/instances',
      icon: 'desktop',
      pro: false,
    },
    {
      title: 'Object Storage',
      url: '/objects',
      icon: 'ios-cloud',
      pro: true,
    },
    {
      title: 'Invoices',
      url: '/invoices',
      icon: 'md-stats',
      pro: false
    }
  ];

  public appPagesFooter = [
    {
      title: 'Settings',
      url: '/settings',
      icon: 'ios-settings'
    },
    {
      title: 'About',
      url: '/about',
      icon: 'ios-help-buoy'
    }
  ];

  constructor(
    private platform: Platform,
    private splashScreen: SplashScreen,
    private statusBar: StatusBar,
    private screenOrientation: ScreenOrientation
  ) {
    this.initializeApp();
  }

  initializeApp() {
    this.platform.ready().then(() => {
      this.statusBar.styleDefault();
      if (this.platform.is('cordova')) {
        this.screenOrientation.lock(this.screenOrientation.ORIENTATIONS.PORTRAIT);
      }
      this.splashScreen.hide();
    });
  }
}
