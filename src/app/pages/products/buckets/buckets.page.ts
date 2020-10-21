import {Component, OnInit} from '@angular/core';
import {ObjectService} from '../../../services/object/object.service';
import {ModalController, NavController} from '@ionic/angular';
import {AddBucketPage} from './add-bucket/add-bucket.page';

@Component({
  selector: 'app-objects',
  templateUrl: './buckets.page.html',
  styleUrls: ['./buckets.page.scss'],
})
export class BucketsPage implements OnInit {

  public bucketsPar = [];
  public bucketsAms = [];
  public isLoading = true;
  public error = false;
  private temp = true;

  constructor(private objectService: ObjectService, private modalController: ModalController,
              private navCtrl: NavController) {
    this.temp = true;
    this.refresh(true).then(() => {
      this.temp = false;
    });
  }

  ngOnInit() {
  }

  async ionViewDidEnter() {
    if (!this.temp) {
      await this.refresh(false);
    }
  }

  private async refresh(displayLoading?: boolean) {
    this.error = false;
    displayLoading ? this.isLoading = true : this.isLoading = false;

    try {
      const result = await this.objectService.getAllBuckets();

      console.log('RESULT:', result);

      this.bucketsPar = result.s3par ? result.s3par : [];
      this.bucketsAms = result.s3ams ? result.s3ams : [];
    } catch (e) {
      this.error = true;
    } finally {
      this.isLoading = false;
    }
  }

  public async addBucket(event: any) {
    const modal = await this.modalController.create({
      component: AddBucketPage,
    });

    await modal.present();

    await modal.onDidDismiss().then(value => {
      if (!value.data.close) {
        this.refresh();
      }
    });
  }

  public async accessToBucket(region: string, bucketName: string) {
    await this.navCtrl.navigateForward(['/buckets/' + region + '/' + bucketName]);
  }
}
