import {Component, OnInit} from '@angular/core';
import {ObjectService} from '../../services/object/object.service';
import {StatusBar} from '@ionic-native/status-bar/ngx';
import {ModalController} from '@ionic/angular';
import {AddBucketPage} from './add-bucket/add-bucket.page';

@Component({
  selector: 'app-objects',
  templateUrl: './objects.page.html',
  styleUrls: ['./objects.page.scss'],
})
export class ObjectsPage implements OnInit {

  public bucketsPar = [];
  public bucketsAms = [];
  public isLoading = true;

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

    const result = await this.objectService.getAllBuckets();
    console.log('RESULT:', result);

    this.bucketsPar = result.s3par ? result.s3par : [];
    this.bucketsAms = result.s3ams ? result.s3ams : [];

    this.isLoading = false;
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
