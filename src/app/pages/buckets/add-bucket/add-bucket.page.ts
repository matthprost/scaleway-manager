import {Component, OnInit} from '@angular/core';
import {ModalController, NavParams, ToastController} from '@ionic/angular';
import {ObjectService} from '../../../services/object/object.service';

@Component({
  selector: 'app-add-bucket',
  templateUrl: './add-bucket.page.html',
  styleUrls: ['./add-bucket.page.scss'],
})
export class AddBucketPage implements OnInit {

  public bucketName: string = null;
  public region = 'par';
  public visibility = 'private';
  public error = false;
  public isLoading = false;

  constructor(private modalCtrl: ModalController, private toastController: ToastController, private objectService: ObjectService) {
  }

  ngOnInit() {
  }

  public async close() {
    await this.modalCtrl.dismiss({
      dismissed: true,
      close: true,
    });
  }

  public regionSelected(event: any) {
    this.region = event.detail.value;
  }

  public visibilitySelected(event: any) {
    this.visibility = event.detail.value;
  }

  private checkBucketName(name: string) {
    if (name && /^[a-z0-9\-\.]+$/.test(name) && name.length >= 3) {
      return true;
    } else {
      return false;
    }
  }

  public async createBucket() {
    console.log('bucketName:', this.bucketName, 'region:', this.region, 'visibility:', this.visibility);
    this.error = false;

    if (!this.checkBucketName(this.bucketName)) {
      this.error = true;

      const alert = await this.toastController.create({
        position: 'top',
        showCloseButton: true,
        duration: 5000,
        color: 'danger',
        message: 'Please check form, name of the bucket might not be correct'
      });

      await alert.present();
      return;
    } else {
      this.isLoading = true;
      try {
        await this.objectService.createBucket(this.region === 'par' ? 'fr-par' : 'nl-ams', this.bucketName);

        await this.modalCtrl.dismiss({
          dismissed: true,
          close: false
        });
      } catch (e) {
        this.isLoading = false;
      }
    }
  }

}
