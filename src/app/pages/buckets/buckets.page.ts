import {Component, OnInit} from '@angular/core';
import {ObjectService} from '../../services/object/object.service';
import {StatusBar} from '@ionic-native/status-bar/ngx';
import {ModalController} from '@ionic/angular';
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

  constructor(private objectService: ObjectService, private statusBar: StatusBar, private modalController: ModalController) {
    this.statusBar.styleDefault();
  }

  ngOnInit() {
  }

  async ionViewDidEnter() {
    this.statusBar.styleDefault();
    await this.refresh();
  }

  private async refresh() {
    this.isLoading = true;

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
}
