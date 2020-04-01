import {Component, OnInit} from '@angular/core';
import {ModalController, NavParams, ToastController} from '@ionic/angular';

@Component({
  selector: 'app-add-bucket',
  templateUrl: './add-bucket.page.html',
  styleUrls: ['./add-bucket.page.scss'],
})
export class AddBucketPage implements OnInit {

  public bucketName: string = null;
  public region: string = null;

  constructor(private modalCtrl: ModalController, private toastController: ToastController, private navParams: NavParams) {
  }

  ngOnInit() {
  }

  public close() {
    this.modalCtrl.dismiss({
      dismissed: true,
      close: true,
    });
  }

  public regionSelected(event: any) {
    this.region = event.detail.value;
  }

}
