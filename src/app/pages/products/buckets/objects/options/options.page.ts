import {Component, OnInit} from '@angular/core';
import {AlertController, LoadingController, ModalController, NavParams, PopoverController} from '@ionic/angular';
import {ObjectService} from '../../../../../services/object/object.service';
import {ObjInfosPage} from './obj-infos/obj-infos.page';

@Component({
  selector: 'app-options',
  templateUrl: './options.page.html',
  styleUrls: ['./options.page.scss'],
})
export class OptionsPage implements OnInit {

  public type: 'folder' | 'standard' | 'glacier' = null;
  public object: any = null;
  public region: string = null;
  public bucket: string = null;
  public fullPathWithoutBucket: string = null;
  public fullPathWithBucket: string = null;

  private map = new Map();

  constructor(private navParams: NavParams, private objectService: ObjectService, private loadingCtrl: LoadingController,
              private popoverController: PopoverController, private alertCtrl: AlertController, private modalController: ModalController) {
    this.type = this.navParams.get('type');
    this.object = this.navParams.get('object');
    this.region = this.navParams.get('region');
    this.bucket = this.navParams.get('bucket');

    this.map.set('!', '%21').set('\'', '%27').set('(', '%28').set(')', '%29').set('*', '%2A');

    let path = encodeURIComponent(this.object.Key[0]);

    this.map.forEach((key, value) => {
      path = this.replaceAll(path, value, key);
    });

    this.fullPathWithoutBucket = '/' + this.navParams.get('fullPath') + path;
    this.fullPathWithBucket = '/' + this.bucket + '/' + this.navParams.get('fullPath') + path;
  }

  ngOnInit() {
  }

  private escapeRegExp(str) {
    return str.replace(/[.*+\-?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
  }

  private replaceAll(str, find, replace) {
    return str.replace(new RegExp(this.escapeRegExp(find), 'g'), replace);
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
      mode: 'ios',
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

            let name = encodeURIComponent(data.name);

            if (data.name !== this.object.Key[0]) {
              this.map.forEach((key, value) => {
                name = this.replaceAll(name, value, key);
              });

              await loading.present();
              try {
                await this.objectService.copyObject(this.bucket, this.region,
                  '/' + this.navParams.get('fullPath') + name,
                  this.fullPathWithBucket);
                await this.objectService.deleteObject(this.bucket, this.region, this.fullPathWithoutBucket);
              } catch (e) {
                console.log(e);
              } finally {
                await this.popoverController.dismiss({reload: true});
                await loading.dismiss();
              }
            } else {
              await this.popoverController.dismiss({reload: false});
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
      mode: 'ios',
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
      mode: 'ios',
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
      mode: 'ios',
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
