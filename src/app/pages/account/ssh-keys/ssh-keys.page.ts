import {Component, OnInit} from '@angular/core';
import {IonItemSliding, LoadingController, ModalController, NavController, ToastController} from '@ionic/angular';
import {AccountService} from '../../../services/user/account/account.service';
import {SshKeysDto} from '../../../services/user/account/account.dto';
import {StatusBar} from '@ionic-native/status-bar/ngx';
import {Clipboard} from '@ionic-native/clipboard/ngx';
import {AddSshKeyPage} from './add-ssh-key/add-ssh-key.page';

@Component({
  selector: 'app-ssh-keys',
  templateUrl: './ssh-keys.page.html',
  styleUrls: ['./ssh-keys.page.scss'],
})
export class SshKeysPage implements OnInit {

  public isLoading = true;
  public sshKeys: Array<SshKeysDto> = [];

  constructor(public navCtrl: NavController, private accountProvider: AccountService,
              public statusBar: StatusBar, private clipboard: Clipboard, private toastCtrl: ToastController,
              public modalController: ModalController, private loadingCtrl: LoadingController) {
    this.statusBar.styleDefault();
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

  public async deleteSshKey(SshKey: SshKeysDto, slidingItem: IonItemSliding) {
    await slidingItem.close();
    const loading = await this.loadingCtrl.create({
      message: 'Loading...'
    });

    await loading.present();

    const finalSshKeysArray: Array<{ 'key': string }> = [];
    for (const sshKey of this.sshKeys) {
      if (sshKey !== SshKey) {
        finalSshKeysArray.push({key: sshKey.key});
      }
    }

    this.accountProvider.patchSshKeys(finalSshKeysArray).then(result => {
      this.sshKeys = result.ssh_public_keys;
      loading.dismiss();
    })
      .catch(error => {
        loading.dismiss();
        console.log(error);
      });
  }

  async addSshKey(event) {
    const modal = await this.modalController.create({
      component: AddSshKeyPage,
      componentProps: {
        keys: this.sshKeys
      }
    });

    await modal.present();

    await modal.onDidDismiss().then(() => {
      this.refresh();
    });
  }

}
