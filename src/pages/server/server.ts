import {Component} from '@angular/core';
import {LoadingController, NavController, NavParams} from 'ionic-angular';
import {Storage} from '@ionic/storage';
import {AuthTokenDto} from "../../providers/auth/auth-tokens.dto";
import {ServersProvider} from "../../providers/servers/servers";
import {ServerDto} from "../../providers/servers/server.dto";
import {ShowServerPage} from "./show-server/show-server";

@Component({
  selector: 'page-server',
  templateUrl: 'server.html',
})
export class ServerPage {

  public serverName: string = null;
  public loader = this.loadingCtrl.create({
    content: "Please wait...",
  });
  public allServers: Array<ServerDto>;
  public isLoading: boolean = true;

  constructor(public navCtrl: NavController, public navParams: NavParams, public loadingCtrl: LoadingController,
              private storage: Storage, private serversProvider: ServersProvider) {
    this.serverName = navParams.get('server');
  }

  ionViewDidLoad() {
    this.loader.present();
    this.getAllServers()
  }

  ionViewDidEnter() {
    this.getAllServers();
  }

  getAllServers() {
    this.storage.get('token').then((val: AuthTokenDto) => {
      this.serversProvider.getAllServers(this.serverName, val.token.id).then(result => {
        this.allServers = result.servers;
        this.loader.dismiss();
        this.isLoading = false;
      }).catch(error => {
        this.loader.dismiss();
        this.isLoading = false;
      });
    });
  }

  private refreshAllServers(): Promise<any> {

    return new Promise((resolve, reject) => {
      this.isLoading = true;
      this.storage.get('token').then((token: AuthTokenDto) => {
        this.serversProvider.getAllServers(this.serverName, token.token.id).then(result => {
          this.allServers = result.servers;
          this.isLoading = false;
          resolve('ok');
        }).catch(error => {
          reject(error);
        });
      });
    });
  }

  showServer(server) {
    this.navCtrl.push(ShowServerPage, {server: server, serverCountry: this.serverName});
  }

  doRefresh(refresher) {
    this.refreshAllServers().then(() => {
      refresher.complete();
    }).catch(error => {
      console.log(error);
      refresher.complete();
    });
  }

}
