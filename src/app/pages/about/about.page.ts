import {Component, OnInit} from '@angular/core';
import {EmailComposer} from '@ionic-native/email-composer/ngx';
import {Platform} from '@ionic/angular';
import {Plugins, StatusBarStyle} from '@capacitor/core';

const {StatusBar} = Plugins;

@Component({
  selector: 'app-about',
  templateUrl: './about.page.html',
  styleUrls: ['./about.page.scss'],
})
export class AboutPage implements OnInit {

  constructor(private emailComposer: EmailComposer, private platform: Platform) {
  }

  ngOnInit() {
  }

  ionViewDidEnter() {
    StatusBar.setStyle({ style: StatusBarStyle.Light });
  }

  public async sendEmail() {
    if (this.platform.is('cordova')) {
      this.emailComposer.isAvailable().then((available: boolean) => {
        if (available) {
        }
      });

      const email = {
        to: 'contact@matthias-prost.com',
        subject: '[Scaleway Manager]',
        isHtml: true
      };

      await this.emailComposer.open(email);
    } else {
      console.warn('Cordova not available');
    }
  }


}
