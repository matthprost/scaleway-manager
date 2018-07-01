import {Component} from '@angular/core';
import {LoadingController, NavController, NavParams} from 'ionic-angular';
import { Storage } from '@ionic/storage';
import {AuthTokenDto} from "../../providers/auth/auth-tokens.dto";
import {ServersProvider} from "../../providers/servers/servers";

@Component({
  selector: 'page-server',
  templateUrl: 'server.html',
})
export class ServerPage {

  public serverName: string = null;
  public loader = this.loadingCtrl.create({
    content: "Please wait...",
  });

  constructor(public navCtrl: NavController, public navParams: NavParams, public loadingCtrl: LoadingController,
              private storage: Storage, private serversProvider: ServersProvider) {
    this.serverName = navParams.get('server');
  }

  ionViewDidLoad() {
    this.getAllServers()
  }

  getAllServers() {

    this.loader.present();
    this.storage.get('token').then((val: AuthTokenDto) => {
      this.serversProvider.getAllServers(this.serverName, val.token.id).then(result => {
        console.log(result);
        this.loader.dismiss();
      }).catch(error => {
        this.loader.dismiss();
      });
    });
  }

}
