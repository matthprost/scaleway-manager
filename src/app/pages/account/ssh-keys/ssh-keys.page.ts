import {Component, OnInit} from '@angular/core';
import {IonItemSliding, LoadingController, ModalController, NavController, ToastController} from '@ionic/angular';
import {Clipboard} from '@ionic-native/clipboard/ngx';
import {AddSshKeyPage} from './add-ssh-key/add-ssh-key.page';
import {Plugins, StatusBarStyle} from '@capacitor/core';
import {SshKeysService} from '../../../services/user/project/ssh-key/ssh-keys.service';
import {SshKeyDto} from '../../../services/user/project/ssh-key/ssh-key.dto';

const {StatusBar} = Plugins;

@Component({
  selector: 'app-ssh-keys',
  templateUrl: './ssh-keys.page.html',
  styleUrls: ['./ssh-keys.page.scss'],
})
export class SshKeysPage implements OnInit {

  public isLoading = true;
  public sshKeys: Array<SshKeyDto> = [];

  constructor(public navCtrl: NavController, private clipboard: Clipboard, private toastCtrl: ToastController,
              public modalController: ModalController, private loadingCtrl: LoadingController,
              private sshKeyService: SshKeysService) {
  }

  ngOnInit(): void {
  }

  ionViewDidEnter() {
    StatusBar.setStyle({style: StatusBarStyle.Light});
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
    this.sshKeys = await this.sshKeyService.getSShKeys();
  }

  public split(sshKey: SshKeyDto): string {
    const splitted = sshKey.fingerprint.split(' ', 5);

    return (splitted[3] + ' ' + splitted[4]);
  }

  public async copyToClipBoard(text: string) {
    await this.clipboard.copy(text);

    const toast = await this.toastCtrl.create({
      message: 'Text has been copied into your clipboard!',
      duration: 3000,
      position: 'top',
      mode: 'ios',
    });

    await toast.present();
  }

  public async deleteSshKey(sshKeyId: string, slidingItem: IonItemSliding) {
    await slidingItem.close();
    const loading = await this.loadingCtrl.create({
      message: 'Loading...',
      mode: 'ios'
    });

    await loading.present();

    await this.sshKeyService.deleteSShKey(sshKeyId);
    await loading.dismiss();
    await this.refresh();
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
