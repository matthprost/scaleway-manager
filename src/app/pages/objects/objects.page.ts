import {Component, OnInit} from '@angular/core';
import {ObjectService} from '../../services/object/object.service';
import {StatusBar} from '@ionic-native/status-bar/ngx';

@Component({
  selector: 'app-objects',
  templateUrl: './objects.page.html',
  styleUrls: ['./objects.page.scss'],
})
export class ObjectsPage implements OnInit {

  public bucketsPar = null;
  public bucketsAms = null;
  public isLoading = true;

  constructor(private objectService: ObjectService, private statusBar: StatusBar) {
    this.statusBar.styleDefault();
  }

  ngOnInit() {
  }

  async ionViewDidEnter() {
    this.isLoading = true;
    this.statusBar.styleDefault();

    const result = await this.objectService.getAllBuckets();
    this.bucketsPar = result.s3par;
    this.bucketsAms = result.s3ams;
    this.isLoading = false;
    console.log('RESULT:', result);
  }
}
