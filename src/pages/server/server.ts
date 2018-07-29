import {Component} from '@angular/core';
import {ItemSliding, LoadingController, NavController, NavParams} from 'ionic-angular';
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

  public serverCountry: string = null;
  public loader = this.loadingCtrl.create({
    content: "Please wait...",
  });
  public allServers: Array<ServerDto>;
  public isLoading: boolean = true;

  constructor(public navCtrl: NavController, public navParams: NavParams, public loadingCtrl: LoadingController,
              private storage: Storage, private serversProvider: ServersProvider) {
    this.serverCountry = navParams.get('server');
  }

  ionViewDidLoad() {
    this.isLoading = true;
    this.refreshAllServers().then(() => {
      this.isLoading = false;
    });
  }

  ionViewDidEnter() {
    this.refreshAllServers().then(() => {
      this.isLoading = false;
    });
  }

  private refreshAllServers(): Promise<any> {

    return new Promise((resolve, reject) => {
      this.storage.get('token').then((token: AuthTokenDto) => {
        this.serversProvider.getAllServers(this.serverCountry, token.token.id).then(result => {
          if (result.servers !== this.allServers) {
            this.allServers = result.servers;
          }
          resolve('ok');
        }).catch(error => {
          reject(error);
        });
      });
    });
  }

  showServer(server) {
    this.navCtrl.push(ShowServerPage, {server: server, serverCountry: this.serverCountry});
  }

  doRefresh(refresher) {
    this.refreshAllServers().then(() => {
      refresher.complete();
    }).catch(error => {
      console.log(error);
      refresher.complete();
    });
  }

  actionServer(server, action, slidingItem: ItemSliding) {
    slidingItem.close();
    this.storage.get('token').then(token => {
      this.serversProvider.sendServerAction(this.serverCountry, server.id, token.token.id, action)
        .then(() => {
          this.refreshAllServers();
        }).catch(error => {
        console.log(error);
      })
    });
  }

  countServersByState(servers: Array<ServerDto>, state: string): number {
    let i: number = -1;
    let counter: number = 0;

    while (servers[++i]) {
      if (servers[i].state === state) {
        counter++;
      }
    }

    return (counter);
  }

  getServerByState(state: Array<string>): ServerDto[] {
    let newServers: ServerDto[] = [];
    this.allServers.forEach(server => {
      state.forEach(result => {
        if (result === server.state) {
          newServers.push(server);
        }
      });
    });

    return (newServers);
  }

}
