import {Component, OnInit} from '@angular/core';
import {Plugins, StatusBarStyle} from '@capacitor/core';
import {ModalController, NavController} from '@ionic/angular';

import {ObjectService} from '../../../services/object/object.service';

import {AddBucketPage} from './add-bucket/add-bucket.page';


const {StatusBar} = Plugins;

@Component({
  selector: 'app-objects',
  templateUrl: './buckets.page.html',
  styleUrls: ['./buckets.page.scss'],
})
export class BucketsPage implements OnInit {

  public buckets = [];
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
    StatusBar.setStyle({ style: StatusBarStyle.Light });
    /*if (!this.temp) {
      await this.refresh(false);
    }*/
  }

  private async refresh(displayLoading?: boolean) {
    this.error = false;
    displayLoading ? this.isLoading = true : this.isLoading = false;

    try {
      console.log('yes')
      this.buckets = await this.objectService.getAllBuckets();

    } catch (e) {
      console.log('error')
      this.error = true;
    } finally {
      this.isLoading = false;
    }
  }

  public doRefresh(refresher) {
    this.refresh().then(() => {
      refresher.target.complete();
    }).catch(error => {
      console.log(error);
      refresher.target.complete();
    });
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
