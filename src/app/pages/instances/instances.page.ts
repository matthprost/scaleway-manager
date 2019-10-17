import {Component, OnInit} from '@angular/core';
import {ServersService} from '../../services/servers/servers.service';
import {ServerDto} from '../../services/servers/server.dto';
import {StatusBar} from '@ionic-native/status-bar/ngx';
import {NavController} from '@ionic/angular';

@Component({
  selector: 'app-instances',
  templateUrl: './instances.page.html',
  styleUrls: ['./instances.page.scss'],
})
export class InstancesPage implements OnInit {

  public instances: Array<ServerDto>;
  public isLoading = true;

  constructor(public navCtrl: NavController, private serversProvider: ServersService,
              private statusBar: StatusBar) {
  }

  ngOnInit() {
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
      this.serversProvider.getAllServer(100).then(result => {
        this.instances = result;
        resolve('ok');
      });
    });
  }

  public doRefresh(refresher) {
    this.refreshAllServers().then(() => {
      refresher.target.complete();
    }).catch(error => {
      console.log(error);
      refresher.target.complete();
    });
  }

  public showServer(server: any, country: string) {
    /*this.navCtrl.push(ShowServerPage, {server: server, serverCountry: country});*/
    console.log('todo');
  }

  // This function is for fast action on servers like start/stop
  public serverAction(server, action, event, country: string) {
    event.close();
    this.serversProvider.sendServerAction(country, server.id, action)
      .then(() => {
        this.refreshAllServers();
      })
      .catch(error => {
        console.log(error);
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
