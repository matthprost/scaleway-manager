import {Component, OnInit} from '@angular/core';
import {ModalController, NavParams, ToastController} from '@ionic/angular';
import {AccountService} from '../../../../services/user/account/account.service';
import {SshKeysDto} from '../../../../services/user/account/account.dto';
import {Plugins, StatusBarStyle} from '@capacitor/core';

const {StatusBar} = Plugins;

@Component({
  selector: 'app-add-ssh-key',
  templateUrl: './add-ssh-key.page.html',
  styleUrls: ['./add-ssh-key.page.scss'],
})
export class AddSshKeyPage implements OnInit {

  private readonly keys: Array<SshKeysDto> = [];
  public key = null;

  constructor(private modalCtrl: ModalController, private accountProvider: AccountService, private toastController: ToastController,
              private navParams: NavParams) {
    this.keys = navParams.get('keys');
  }

  ngOnInit() {
  }

  ionViewDidEnter() {
    StatusBar.setStyle({style: StatusBarStyle.Light});
  }

  public close() {
    this.modalCtrl.dismiss({
      dismissed: true
    });
  }

  public addSshKey() {
    const finalSshKeysArray: Array<{ 'key': string }> = [];

    for (const value of this.keys) {
      finalSshKeysArray.push({key: value.key});
    }
    finalSshKeysArray.push({key: this.key});

    this.accountProvider.patchSshKeys(finalSshKeysArray).then(result => {
      this.close();
    })
      .catch(async error => {
        console.log(error);
        if (error.status === 400) {
          const toast = await this.toastController.create({
            message: 'Error: Your SSH Key is invalid',
            duration: 5000,
            showCloseButton: true,
            position: 'top',
            closeButtonText: 'Close',
            color: 'danger',
            mode: 'ios',
          });

          await toast.present();
        }
      });
  }
}
