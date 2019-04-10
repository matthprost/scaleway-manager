import {Component} from '@angular/core';
import {ItemSliding, ModalController, NavController, NavParams, ToastController} from '@ionic/angular';
import {AccountProvider} from "../../../providers/account/account";
import {SshKeysDto} from "../../../providers/account/account.dto";
import {StatusBar} from "@ionic-native/status-bar/ngx";
import {Clipboard} from "@ionic-native/clipboard/ngx";
import {AddSshKeyPage} from "./add-ssh-key/add-ssh-key";

@Component({
  selector: 'page-ssh-keys',
  templateUrl: 'ssh-keys.html',
})
export class SshKeysPage {

  public isLoading: boolean = true;
  public sshKeys: Array<SshKeysDto>;

  constructor(public navCtrl: NavController, public navParams: NavParams, private accountProvider: AccountProvider,
              public statusBar: StatusBar, private clipboard: Clipboard, private toastCtrl: ToastController,
              public modalController: ModalController) {
  }

  ionViewDidEnter() {
    this.statusBar.styleDefault();
  }

  ionViewDidLoad() {
    this.refresh().then(() => {
      this.isLoading = false;
    })
      .catch(error => {
        console.log(error);
      });
  }

  public doRefresh(refresher) {
    this.refresh().then(() => {
      refresher.complete();
    }).catch(error => {
      console.log(error);
      refresher.complete();
    });
  }

  private refresh() {
    return new Promise((resolve, reject) => {
      this.accountProvider.getUserData().then(userData => {
        this.sshKeys = userData.ssh_public_keys;
        resolve('ok');
      })
        .catch(error => {
          reject(error);
        });
    });
  }

  public split(sshKey: SshKeysDto): string {
    const splitted = sshKey.fingerprint.split(" ", 5);

    return (splitted[3] + ' ' + splitted[4]);
  }

  public copyToClipBoard(text: string) {
    this.clipboard.copy(text);
    const toast = this.toastCtrl.create({
      message: 'Text has been copied into your clipboard!',
      duration: 3000,
      position: 'top'
    });
    toast.present();
  }

  public deleteSshKey(SshKey: SshKeysDto, slidingItem: ItemSliding) {
    slidingItem.close();

    let finalSshKeysArray: Array<{"key": string}> = [];
    for (let sshkey of this.sshKeys) {
      if (sshkey !== SshKey) {
        finalSshKeysArray.push({"key": sshkey.key });
      }
    }

    this.accountProvider.patchSshKeys(finalSshKeysArray).then(result => {
      this.sshKeys = result.ssh_public_keys;
    })
      .catch(error => {
        console.log(error);
      })
  }

  async addSshKey(event) {
    const modal = await this.modalController.create(AddSshKeyPage, {"keys" : this.sshKeys});
    await modal.onDidDismiss(() => {
      this.refresh();
    });
    return await modal.present();
  }

}
