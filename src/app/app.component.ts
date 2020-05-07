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
      icon: 'home',
      new: false
    },
    {
      title: 'Instances',
      url: '/instances',
      icon: 'server',
      new: false,
    },
    {
      title: 'Object Storage',
      url: '/buckets',
      icon: 'database',
      new: true,
    },
    {
      title: 'Invoices',
      url: '/invoices',
      icon: 'chart-line',
      new: false
    }
  ];

  public appPagesFooter = [
    {
      title: 'Settings',
      url: '/settings',
      icon: 'cog'
    },
    {
      title: 'About',
      url: '/about',
      icon: 'life-ring'
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
