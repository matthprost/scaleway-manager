import {Component} from '@angular/core';
import {NavController, NavParams, ToastController} from 'ionic-angular';
import {SshKeysDto} from "../../../../providers/account/account.dto";
import {AccountProvider} from "../../../../providers/account/account";

@Component({
  selector: 'page-add-ssh-key',
  templateUrl: 'add-ssh-key.html',
})
export class AddSshKeyPage {

  private key: string = null;
  private keys: Array<SshKeysDto> = [];

  constructor(public navCtrl: NavController, public navParams: NavParams, private accountProvider: AccountProvider,
              public toastController: ToastController) {
    this.keys = this.navParams.get('keys');
    console.log(this.keys);
  }

  ionViewDidLoad() {
    //
  }

  public close(event?) {
    this.navCtrl.pop();
  }

  public addSshKey() {
    let finalSshKeysArray: Array<{"key": string}> = [];

    for (let value of this.keys) {
      finalSshKeysArray.push({"key": value.key});
    }
    finalSshKeysArray.push({"key": this.key});

    this.accountProvider.patchSshKeys(finalSshKeysArray).then(result => {
      this.close();
    })
      .catch(error => {
        console.log(error);
        if (error.status === 400) {
          const toast = this.toastController.create({
            message: "Error: Your SSH Key is invalid",
            duration: 5000,
            showCloseButton: true,
            position: 'bottom',
            closeButtonText: 'Close',
            cssClass: 'toastDanger'
          });
          toast.present();
        }
      })
  }

}
