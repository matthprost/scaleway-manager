import {Component, OnInit} from '@angular/core';
import {AlertController, LoadingController, NavParams, PopoverController} from '@ionic/angular';
import {ObjectService} from '../../../../services/object/object.service';

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
              private popoverController: PopoverController, private alertCtrl: AlertController) {
    this.type = this.navParams.get('type');
    this.object = this.navParams.get('object');
    this.region = this.navParams.get('region');
    this.bucket = this.navParams.get('bucket');
    this.fullPathWithoutBucket = '/' + this.navParams.get('fullPath') + this.object.Key[0];
    this.fullPathWithBucket = '/' + this.bucket + '/' + this.navParams.get('fullPath') + this.object.Key[0];
  }

  ngOnInit() {
  }

  public async restore() {
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
            await this.objectService.restore(this.bucket, this.region, this.fullPathWithoutBucket, this.fullPathWithBucket);
            await this.popoverController.dismiss({reload: true});
            await loading.dismiss();
          }
        }
      ]
    });

    await alert.present();
  }

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
            console.log(this.fullPathWithoutBucket);
            await this.objectService.sendToGlacierS3(this.bucket, this.region, this.fullPathWithoutBucket, this.fullPathWithBucket);
            await this.popoverController.dismiss({reload: true});
            await loading.dismiss();
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
            await this.objectService.deleteObject(this.bucket, this.region, this.fullPathWithoutBucket);
            await this.popoverController.dismiss({reload: true});
            await loading.dismiss();
          }
        }
      ]
    });

    await alert.present();

    return;
  }

}
