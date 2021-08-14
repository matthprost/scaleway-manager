import {Component} from '@angular/core';
import {Plugins, StatusBarStyle} from '@capacitor/core';
import {Platform} from '@ionic/angular';

const {StatusBar, SplashScreen} = Plugins;

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
})
export class AppComponent {
  public appPages = [
    {
      title: 'Dashboard',
      url: '/home',
      icon: 'home',
      new: false,
    },
    {
      title: 'Instances',
      url: '/instances',
      icon: 'server',
      new: false,
    },
    /*    {
          title: 'Bare Metal',
          url: '/bmaas',
          icon: 'hdd',
          new: false,
        },*/
    {
      title: 'Object Storage',
      url: '/buckets',
      icon: 'database',
      new: true,
    },
    {
      title: 'Billing',
      url: '/billing',
      icon: 'chart-line',
      new: false,
    },
  ];

  public appPagesFooter = [
    {
      title: 'Settings',
      url: '/settings',
      icon: 'cog',
    },
    {
      title: 'About',
      url: '/about',
      icon: 'life-ring',
    },
  ];

  constructor(
    private platform: Platform,
  ) {
    this.initializeApp();
  }

  initializeApp(): void {
    this.platform.ready().then(() => {
      StatusBar.setStyle({style: StatusBarStyle.Light});
      SplashScreen.hide();
    });
  }
}
