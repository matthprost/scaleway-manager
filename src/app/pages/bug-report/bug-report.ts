import {Component} from '@angular/core';
import { NavController, Platform, ToastController} from '@ionic/angular';
import {EmailComposer} from "@ionic-native/email-composer/ngx";
import {StatusBar} from "@ionic-native/status-bar/ngx";

@Component({
  selector: 'page-bug-report',
  templateUrl: 'bug-report.html',
})
export class BugReportPage {

  public message: string = null;

  constructor(public platform: Platform, public navCtrl: NavController,
              private emailComposer: EmailComposer, public toastCtrl: ToastController,
              public statusBar: StatusBar) {
  }

  ionViewDidLoad() {
    //
  }

  ionViewDidEnter() {
    this.statusBar.styleDefault();
  }

  public async sendMail() {

    if (this.message) {
      const toast = await this.toastCtrl.create({
        message: 'Success: your message has been sent!',
        duration: 3000,
        position: 'top'
      });

      if (this.platform.is('cordova')) {

        let email = {
          to: 'bug-report@matthias-prost.com',
          subject: '[Scaleway Manager][BUG]: I found a bug',
          body: this.message,
          isHtml: true
        };

        this.emailComposer.open(email).then(() => {

          toast.present();
          this.navCtrl.navigateBack('/home');
        }).catch(error => {
          console.log(error);
        });
      }
    } else {
      const toast = await this.toastCtrl.create({
        message: 'Error: message is empty, please try again',
        duration: 3000,
        position: 'top'
      });

      toast.present();
    }
  }

}
