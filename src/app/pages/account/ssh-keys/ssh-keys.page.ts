import {Component, OnInit} from '@angular/core';
import {ModalController, NavController, ToastController} from '@ionic/angular';
import {AccountService} from '../../../services/user/account/account.service';
import {SshKeysDto} from '../../../services/user/account/account.dto';
import {StatusBar} from '@ionic-native/status-bar/ngx';
import {Clipboard} from '@ionic-native/clipboard/ngx';

@Component({
  selector: 'app-ssh-keys',
  templateUrl: './ssh-keys.page.html',
  styleUrls: ['./ssh-keys.page.scss'],
})
export class SshKeysPage implements OnInit {

  public isLoading = true;
  public sshKeys: Array<SshKeysDto>;

  constructor(public navCtrl: NavController, private accountProvider: AccountService,
              public statusBar: StatusBar, private clipboard: Clipboard, private toastCtrl: ToastController,
              public modalController: ModalController) {
  }

  ngOnInit(): void {
  }

  ionViewDidEnter() {
    this.statusBar.styleDefault();
    this.refresh().then(() => {
      this.isLoading = false;
    })
      .catch(error => {
        console.log(error);
      });
  }

  public doRefresh(refresher) {
    this.refresh().then(() => {
      refresher.target.complete();
    }).catch(error => {
      console.log(error);
      refresher.target.complete();
    });
  }

  private async refresh() {
      this.sshKeys = (await this.accountProvider.getUserData()).ssh_public_keys;
  }

  public split(sshKey: SshKeysDto): string {
    const splitted = sshKey.fingerprint.split(' ', 5);

    return (splitted[3] + ' ' + splitted[4]);
  }

  public async copyToClipBoard(text: string) {
    await this.clipboard.copy(text);

    const toast = await this.toastCtrl.create({
      message: 'Text has been copied into your clipboard!',
      duration: 3000,
      position: 'top'
    });

    await toast.present();
  }

  /*public deleteSshKey(SshKey: SshKeysDto, slidingItem: ItemSliding) {
    slidingItem.close();

    let finalSshKeysArray: Array<{ 'key': string }> = [];
    for (let sshkey of this.sshKeys) {
      if (sshkey !== SshKey) {
        finalSshKeysArray.push({'key': sshkey.key});
      }
    }

    this.accountProvider.patchSshKeys(finalSshKeysArray).then(result => {
      this.sshKeys = result.ssh_public_keys;
    })
      .catch(error => {
        console.log(error);
      });
  }*/

  /*async addSshKey(event) {
    const modal = await this.modalController.create(AddSshKeyPage, {'keys': this.sshKeys});
    await modal.onDidDismiss(() => {
      this.refresh();
    });
    return await modal.present();
  }*/

}
