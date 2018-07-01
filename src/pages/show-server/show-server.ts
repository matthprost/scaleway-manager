import { Component } from '@angular/core';
import {NavController, NavParams } from 'ionic-angular';
import {ServerDto} from "../../providers/servers/server.dto";

@Component({
  selector: 'page-show-server',
  templateUrl: 'show-server.html',
})
export class ShowServerPage {

  public server: ServerDto;
  public serverName: string;

  constructor(public navCtrl: NavController, public navParams: NavParams) {
    this.server = navParams.get('server');
    this.serverName = this.server.name;
  }

  ionViewDidLoad() {
    //
  }

  capitalize(value: string) {
    return (value.charAt(0).toUpperCase() + value.slice(1));
  }

}
