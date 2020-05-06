import {Component, OnInit} from '@angular/core';
import {AlertController, LoadingController, ModalController, NavParams, PopoverController} from '@ionic/angular';
import {ObjectService} from '../../../../services/object/object.service';
import {ObjInfosPage} from './obj-infos/obj-infos.page';
import {FileTransfer, FileTransferObject} from '@ionic-native/file-transfer/ngx';
import {File} from '@ionic-native/file/ngx';

@Component({
  selector: 'app-options',
  templateUrl: './options.page.html',
  styleUrls: ['./options.page.scss'],
})
export class OptionsPage implements OnInit {

  public type: 'folder' | 'standard' | 'glacier' = null;
  public object: any = null;
  public region: 'fr-par' | 'nl-ams' = null;
  public bucket: string = null;
  public fullPathWithoutBucket: string = null;
  public fullPathWithBucket: string = null;

  constructor(private navParams: NavParams, private objectService: ObjectService, private loadingCtrl: LoadingController,
              private popoverController: PopoverController, private alertCtrl: AlertController, private modalController: ModalController,
              private fileTransfer: FileTransferObject, private transfer: FileTransfer, private file: File) {
    this.type = this.navParams.get('type');
    this.object = this.navParams.get('object');
    this.region = this.navParams.get('region');
    this.bucket = this.navParams.get('bucket');
    this.fullPathWithoutBucket = '/' + this.navParams.get('fullPath') + this.object.Key[0];
    this.fullPathWithBucket = '/' + this.bucket + '/' + this.navParams.get('fullPath') + this.object.Key[0];
  }

  ngOnInit() {
  }

  private async download() {
    const fileTransfer: FileTransferObject = this.transfer.create();
    try {
      const value = await fileTransfer.download(encodeURI('https://gravedigger.fr/images/digflix.png'), this.file.dataDirectory + 'file.png');

      console.log(value);
    } catch (e) {
      const alert = await this.alertCtrl.create({
        header: 'Delete File',
        message: e,
        buttons: [
          {
            text: 'Cancel',
            role: 'cancel',
          }, {
            text: 'Delete',
            cssClass: 'danger',
          }
        ]
      });

      await alert.present();
    }
  }

  public async fileInfos() {
    const modal = await this.modalController.create({
      component: ObjInfosPage,
      componentProps: {
        object: this.object,
        region: this.region
      }
    });

    await modal.present();

    await modal.onWillDismiss().then(async () => {
      await this.popoverController.dismiss({reload: false});
    });
  }

  public async editName() {
    const alert = await this.alertCtrl.create({
      header: 'Edit Name',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
        }, {
          text: 'Send',
          handler: async (data) => {
            const loading = await this.loadingCtrl.create({
              message: 'Loading...',
              mode: 'ios'
            });

            console.log('/' + this.navParams.get('fullPath') + data.name);

            await loading.present();
            try {
              await this.objectService.copyObject(this.bucket, this.region, '/' + this.navParams.get('fullPath') + encodeURIComponent(data.name),
                this.fullPathWithBucket);
              await this.objectService.deleteObject(this.bucket, this.region, this.fullPathWithoutBucket);
            } catch (e) {
              console.log(e);
            } finally {
              await this.popoverController.dismiss({reload: true});
              await loading.dismiss();
            }
          }
        }
      ],
      inputs: [
        {
          name: 'name',
          type: 'text',
          placeholder: 'Enter a name...',
          value: this.object.Key[0]
        },
      ]
    });

    await alert.present();
  }

  /*public async restore() {
    const alert = await this.alertCtrl.create({
      header: 'Restore Object',
      message: 'Restoring an object can take up to 6 hours.',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
        }, {
          text: 'Restore',
          handler: async (values) => {
            const loading = await this.loadingCtrl.create({
              message: 'Loading...',
              mode: 'ios'
            });

            await loading.present();
            console.log(this.fullPathWithoutBucket);
            try {
              await this.objectService.restore(this.bucket, this.region, this.fullPathWithoutBucket, this.fullPathWithBucket);
            } catch (e) {
              console.log(e);
            } finally {
              await this.popoverController.dismiss({reload: true});
              await loading.dismiss();
            }
          }
        }
      ]
    });

    await alert.present();
  }*/

  public async sendToGlacier() {
    const alert = await this.alertCtrl.create({
      header: 'Send to S3 Glacier',
      message: 'Modifying the storage class is free of charge and the storage cost to Glacier is much lower than the standard storage ' +
        'fee. However, keep in mind that accessing an object stored in Glacier takes more time.',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
        }, {
          text: 'Send',
          handler: async (values) => {
            const loading = await this.loadingCtrl.create({
              message: 'Loading...',
              mode: 'ios'
            });

            await loading.present();
            try {
              await this.objectService.sendToGlacierS3(this.bucket, this.region, this.fullPathWithoutBucket, this.fullPathWithBucket);
            } catch (e) {
              console.log(e);
            } finally {
              await this.popoverController.dismiss({reload: true});
              await loading.dismiss();
            }
          }
        }
      ]
    });

    await alert.present();
  }

  public async deleteObject() {
    const alert = await this.alertCtrl.create({
      header: 'Delete File',
      message: 'This will permanently delete your file. This action is irreversible.',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
        }, {
          text: 'Delete',
          cssClass: 'danger',
          handler: async (values) => {
            const loading = await this.loadingCtrl.create({
              message: 'Loading...',
              mode: 'ios'
            });

            await loading.present();
            try {
              await this.objectService.deleteObject(this.bucket, this.region, this.fullPathWithoutBucket);
            } catch (e) {
              console.log(e);
            } finally {
              await this.popoverController.dismiss({reload: true});
              await loading.dismiss();
            }
          }
        }
      ]
    });

    await alert.present();

    return;
  }

}
