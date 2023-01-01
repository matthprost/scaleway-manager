import {Component} from '@angular/core';
import { StatusBar, Style as StatusBarStyle } from '@capacitor/status-bar';
import {Platform} from '@ionic/angular';

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
    });
  }
}
