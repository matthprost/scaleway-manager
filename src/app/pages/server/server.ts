import {Component} from '@angular/core';
import {NavController, NavParams} from '@ionic/angular';
import {Storage} from '@ionic/storage';
import {AuthTokenDto} from "../../providers/auth/auth-tokens.dto";
import {ServersProvider} from "../../providers/servers/servers";
import {ServerDto} from "../../providers/servers/server.dto";
import {StatusBar} from "@ionic-native/status-bar/ngx";

@Component({
  selector: 'page-server',
  templateUrl: 'server.html',
})
export class ServerPage {

  public serverNetherlands: { servers: Array<ServerDto>, country: 'Netherlands' };
  public serverParis: { servers: Array<ServerDto>, country: 'Paris' };

  public isLoading: boolean = true;

  constructor(public navCtrl: NavController, public navParams: NavParams, private storage: Storage,
              private serversProvider: ServersProvider, public statusBar: StatusBar) {
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

    return new Promise((resolve, reject) => {
      this.storage.get('token').then((token: AuthTokenDto) => {
        this.serversProvider.getAllServer(token.token.id).then(result => {
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
    this.navCtrl.navigateForward(['showserver', {server: server, serverCountry: country}]);
  }

  // This function is for fast action on servers like start/stop
  public serverAction(server, action, slidingItem: any, country: string) {
    slidingItem.close();
    this.storage.get('token').then(token => {
      this.serversProvider.sendServerAction(country, server.id, token.token.id, action)
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

}
