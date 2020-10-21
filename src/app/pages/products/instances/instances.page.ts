import {Component, OnInit} from '@angular/core';
import {ServersService} from '../../../services/servers/servers.service';
import {ServerDto} from '../../../services/servers/server.dto';
import {NavController} from '@ionic/angular';
import {Plugins, StatusBarStyle} from '@capacitor/core';

const {StatusBar} = Plugins;

@Component({
  selector: 'app-instances',
  templateUrl: './instances.page.html',
  styleUrls: ['./instances.page.scss'],
})
export class InstancesPage implements OnInit {

  public instances: Array<ServerDto>;
  public isLoading = true;

  private interval;
  private intervalSet = false;
  public serverError = false;

  constructor(public navCtrl: NavController, private serversProvider: ServersService) {
  }

  ngOnInit() {
  }

  ionViewDidEnter() {
    StatusBar.setStyle({ style: StatusBarStyle.Light });
    this.refreshAllServers()
      .then(() => {
        this.isLoading = false;
        this.autoRefresh();
      })
      .catch(error => {
        this.serverError = true;
        this.isLoading = false;
        console.log(error);
      });
  }

  ionViewDidLeave() {
    clearInterval(this.interval);
  }

  private refreshAllServers(): Promise<any> {

    return new Promise((resolve, reject) => {
      this.serversProvider.getAllServer(100).then(result => {
        this.instances = result;
        resolve('ok');
      }).catch(e => {
        reject(e);
      });
    });
  }

  public doRefresh(refresher) {
    this.refreshAllServers().then(() => {
      refresher.target.complete();
      this.autoRefresh();
    }).catch(error => {
      console.log(error);
      refresher.target.complete();
    });
  }

  private async autoRefresh() {
    console.log('[AUTO REFRESH]: Entering function');
    let counter = 0;

    this.instances.forEach(server => {
      if (server.state === 'starting' || server.state === 'stopping') {
        counter++;
      }
    });

    if (counter > 0 && !this.intervalSet) {
      this.intervalSet = true;

      this.interval = setInterval(() => {
        console.log('[AUTO REFRESH]: Entering interval');

        let newCounter = 0;

        this.instances.forEach(server => {
          if (server.state === 'starting' || server.state === 'stopping') {
            newCounter++;
          }
        });
        if (newCounter > 0) {
          this.refreshAllServers();
        } else {
          console.log('[AUTO REFRESH]: Interval cleared!');
          clearInterval(this.interval);
          this.intervalSet = false;
        }
      }, 15000);
    } else {
      console.log('[AUTO REFRESH]: No interval needed');
    }
  }

}
