import { Component, OnInit } from '@angular/core';
import {ModalController, Platform} from '@ionic/angular';
import {EmailComposer} from '@ionic-native/email-composer/ngx';

@Component({
  selector: 'app-help',
  templateUrl: './help.page.html',
  styleUrls: ['./help.page.scss'],
})
export class HelpPage implements OnInit {

  constructor(private modalCtrl: ModalController, private platform: Platform, private emailComposer: EmailComposer) { }

  ngOnInit() {
  }

  public async close() {
    await this.modalCtrl.dismiss({
      dismissed: true,
      close: true,
    });
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
