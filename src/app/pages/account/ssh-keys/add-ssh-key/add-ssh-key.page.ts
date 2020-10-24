import {Component, OnInit} from '@angular/core';
import {ModalController, NavParams, ToastController} from '@ionic/angular';
import {Plugins, StatusBarStyle} from '@capacitor/core';
import {SshKeysService} from '../../../../services/user/project/ssh-key/ssh-keys.service';

const {StatusBar} = Plugins;

@Component({
  selector: 'app-add-ssh-key',
  templateUrl: './add-ssh-key.page.html',
  styleUrls: ['./add-ssh-key.page.scss'],
})
export class AddSshKeyPage implements OnInit {

  private readonly keys: string;
  public key = null;

  constructor(private modalCtrl: ModalController, private toastController: ToastController,
              private navParams: NavParams, private sshKeyService: SshKeysService) {
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
    this.sshKeyService.addSShKey(this.key).then(() => this.close()).catch(async error => {
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
