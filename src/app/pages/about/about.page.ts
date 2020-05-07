import {Component, OnInit} from '@angular/core';
import {StatusBar} from '@ionic-native/status-bar/ngx';
import {EmailComposer} from '@ionic-native/email-composer/ngx';
import {Platform} from '@ionic/angular';

@Component({
  selector: 'app-about',
  templateUrl: './about.page.html',
  styleUrls: ['./about.page.scss'],
})
export class AboutPage implements OnInit {

  constructor(private statusBar: StatusBar, private emailComposer: EmailComposer, private platform: Platform) {
    this.statusBar.styleDefault();
  }

  ngOnInit() {
  }

  ionViewDidEnter() {
    this.statusBar.styleDefault();
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
