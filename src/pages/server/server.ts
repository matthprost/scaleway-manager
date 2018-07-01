import {Component} from '@angular/core';
import {NavController, NavParams} from 'ionic-angular';

@Component({
  selector: 'page-server',
  templateUrl: 'server.html',
})
export class ServerPage {

  public serverName: string = null;

  constructor(public navCtrl: NavController, public navParams: NavParams) {
    this.serverName = navParams.get('server');
  }

  ionViewDidLoad() {
    //
  }

}
