import { Component, OnInit } from '@angular/core';
import {ModalController, NavParams} from '@ionic/angular';

@Component({
  selector: 'app-obj-infos',
  templateUrl: './obj-infos.page.html',
  styleUrls: ['./obj-infos.page.scss'],
})
export class ObjInfosPage implements OnInit {

  public object: any = null;
  public region: string = null;

  constructor(private modalCtrl: ModalController, private navParams: NavParams) {
    this.object = this.navParams.get('object');
    this.region = this.navParams.get('region');
  }

  ngOnInit() {
  }

  public async close() {
    await this.modalCtrl.dismiss({
      dismissed: true,
    });
  }

}
