import {Component} from '@angular/core';
import {NavController, Platform, ToastController} from '@ionic/angular';
import {EmailComposer} from "@ionic-native/email-composer/ngx";
import {StatusBar} from "@ionic-native/status-bar/ngx";

@Component({
  selector: 'page-contact',
  templateUrl: 'contact.html',
})
export class ContactPage {

  public subject: string = null;
  public message: string = null;

  constructor(public platform: Platform, public navCtrl: NavController,
              private emailComposer: EmailComposer, public toastCtrl: ToastController, public statusBar: StatusBar) {
  }

  ionViewDidLoad() {
    //
  }

  ionViewDidEnter() {
    this.statusBar.styleDefault();
  }

  public async sendMail() {

    if (this.subject && this.message) {
      if (this.platform.is('cordova')) {

        let email = {
          to: 'contact@matthias-prost.com',
          subject: '[Scaleway Manager][CONTACT]: ' + this.subject,
          body: this.message,
          isHtml: true
        };

        const toast = await this.toastCtrl.create({
          message: 'Success: your message has been sent!',
          duration: 3000,
          position: 'top'
        });

        this.emailComposer.open(email).then(() => {

          toast.present();
          this.navCtrl.pop();
        }).catch(error => {
          console.log(error);
        });
      }
    } else {
      const toast = await this.toastCtrl.create({
        message: 'Error: subject or message is empty, please try again',
        duration: 3000,
        position: 'top'
      });

      toast.present();
    }
  }

}
