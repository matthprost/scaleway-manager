import {Component} from '@angular/core';
import {ItemSliding, LoadingController, NavController} from 'ionic-angular';
import {Storage} from '@ionic/storage';
import {ServersProvider} from "../../providers/servers/servers";
import {ServerDto} from "../../providers/servers/server.dto";
import {ShowServerPage} from "./show-server/show-server";
import {StatusBar} from "@ionic-native/status-bar/ngx";

@Component({
  selector: 'page-server',
  templateUrl: 'server.html',
})
export class ServerPage {

  public serverNetherlands: { servers: Array<ServerDto>, country: 'Netherlands' };
  public serverParis: { servers: Array<ServerDto>, country: 'Paris' };

  public loader = this.loadingCtrl.create({
    content: "Please wait...",
  });

  public isLoading: boolean = true;

  constructor(public navCtrl: NavController, public loadingCtrl: LoadingController,
              private storage: Storage, private serversProvider: ServersProvider, public statusBar: StatusBar) {
  }

  ionViewDidEnter() {
    this.statusBar.styleDefault();
    this.refreshAllServers()
      .then(() => {
      this.isLoading = false;
    })
      .catch(error => {
      console.log(error);
    });
  }

  private refreshAllServers(): Promise<any> {

    return new Promise((resolve) => {
      this.storage.get('token').then((token) => {
        this.serversProvider.getAllServer(token.auth.jwt_key).then(result => {
          this.serverParis = { 'servers': result.paris.servers, 'country': 'Paris' };
          this.serverNetherlands = { 'servers': result.netherlands.servers, 'country': 'Netherlands' };
          console.log(this.serverParis.servers);
          console.log(this.serverNetherlands.servers);
          resolve('ok');
        });
      })
        .catch(error => {
          console.log(error);
        });
    });
  }

  public doRefresh(refresher) {
    this.refreshAllServers().then(() => {
      refresher.complete();
    }).catch(error => {
      console.log(error);
      refresher.complete();
    });
  }

  public showServer(server: any, country: string) {
    this.navCtrl.push(ShowServerPage, {server: server, serverCountry: country});
  }

  // This function is for fast action on servers like start/stop
  public serverAction(server, action, slidingItem: ItemSliding, country: string) {
    slidingItem.close();
    this.storage.get('token').then(token => {
      this.serversProvider.sendServerAction(country, server.id, token.auth.jwt_key, action)
        .then(() => {
          this.refreshAllServers();
        })
        .catch(error => {
        console.log(error);
      })
    });
  }

  public setState(server: ServerDto): string {
    switch (server.state) {
      case 'stopped':
        return '#B2B6C3';
      case 'running':
        return '#30D1AD';
      case 'stopping':
        return '#3F6ED8';
      case 'starting':
        return '#3F6ED8';
      default:
        return '#B2B6C3';
    }
  }

  public setClass(server: ServerDto): string {
    switch (server.state) {
      case 'stopped':
        return 'state';
      case 'running':
        return 'state';
      case 'stopping':
        return 'blinker';
      case 'starting':
        return 'blinker';
      default:
        return 'state';
    }
  }

  // It counts how many server in a state (ex: 2 servers are running)
/*  public countServersByState(servers: Array<ServerDto>, state: string): number {
    let i: number = -1;
    let counter: number = 0;

    while (servers[++i]) {
      if (servers[i].state === state) {
        counter++;
      }
    }

    return (counter);
  }*/

  // It get all servers by a specific state (ex: all servers that are running)
 /* public getServerByState(state: Array<string>): ServerDto[] {
    let newServers: ServerDto[] = [];

    this.allServers.forEach(server => {
      state.forEach(result => {
        if (result === server.state) {
          newServers.push(server);
        }
      });
    });

    return (newServers);
  }*/

}
