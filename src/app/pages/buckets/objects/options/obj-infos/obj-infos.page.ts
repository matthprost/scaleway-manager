import { Component, OnInit } from '@angular/core';
import {ModalController} from '@ionic/angular';

@Component({
  selector: 'app-obj-infos',
  templateUrl: './obj-infos.page.html',
  styleUrls: ['./obj-infos.page.scss'],
})
export class ObjInfosPage implements OnInit {

  constructor(private modalCtrl: ModalController) { }

  ngOnInit() {
  }

  public async close() {
    await this.modalCtrl.dismiss({
      dismissed: true,
    });
  }

}
