import { Component } from '@angular/core';
import {LoadingController, NavController, Platform, ToastController} from 'ionic-angular';
import {EmailComposer} from "@ionic-native/email-composer";

@Component({
  selector: 'page-bug-report',
  templateUrl: 'bug-report.html',
})
export class BugReportPage {

  public message: string = null;

  constructor(public platform: Platform, public navCtrl: NavController,
              private emailComposer: EmailComposer, public loadingCtrl: LoadingController,
              public toastCtrl: ToastController) {
  }

  ionViewDidLoad() {
    //
  }

  public sendMail() {
    const loader = this.loadingCtrl.create({
      content: "Please wait...",
    });

    if (this.message) {
      if (this.platform.is('cordova')) {
        loader.present();

        let email = {
          to: 'bug-report@matthias-prost.com',
          subject: '[Scaleway Manager][BUG]: I found a bug',
          body: this.message,
          isHtml: true
        };

        this.emailComposer.open(email).then(() => {
          loader.dismiss();
          const toast = this.toastCtrl.create({
            message: 'Success: your message has been sent!',
            duration: 3000,
            position: 'top'
          });

          toast.present();
          this.navCtrl.pop();
        }).catch(error => {
          console.log(error);
        });
      }
    } else {
      const toast = this.toastCtrl.create({
        message: 'Error: message is empty, please try again',
        duration: 3000,
        position: 'top'
      });

      toast.present();
    }
  }

}
