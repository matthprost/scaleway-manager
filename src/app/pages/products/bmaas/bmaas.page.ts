import {Component, OnInit} from '@angular/core';
import {NavController} from '@ionic/angular';
import {BmaasService} from '../../../services/bmaas/bmaas.service';

@Component({
  selector: 'app-bmaas',
  templateUrl: './bmaas.page.html',
  styleUrls: ['./bmaas.page.scss'],
})
export class BmaasPage implements OnInit {

  public servers: Array<any>;
  public isLoading = true;

  private interval;
  private intervalSet = false;
  public serverError = false;

  constructor(public navCtrl: NavController, private bmaasService: BmaasService) {

  }

  ngOnInit() {
  }

  ionViewDidEnter() {
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
      this.bmaasService.getAllServer(100).then(result => {
        this.servers = result;
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

    this.servers.forEach(server => {
      if (server.state === 'starting' || server.state === 'deleting') {
        counter++;
      }
    });

    if (counter > 0 && !this.intervalSet) {
      this.intervalSet = true;

      this.interval = setInterval(() => {
        console.log('[AUTO REFRESH]: Entering interval');

        let newCounter = 0;

        this.servers.forEach(server => {
          if (server.state === 'starting' || server.state === 'deleting') {
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

  public navigateServerDetails(server: any, country: string) {
    this.navCtrl.navigateForward(['/bmaas/' + country + '/' + server.id]);
  }

  public setState(server): string {
    switch (server.status) {
      case 'stopped':
        return '#B2B6C3';
      case 'running':
        return '#30D1AD';
      case 'deleting':
        return '#3F6ED8';
      case 'ready':
        return '#30D1AD';
      case 'starting':
        return '#3F6ED8';
      case 'installing':
        return '#3F6ED8';
      case 'undelivered':
        return '#3F6ED8';
      default:
        return '#B2B6C3';
    }
  }

  public setClass(server): string {
    switch (server.status) {
      case 'stopped':
        return 'state';
      case 'running':
        return 'state';
      case 'deleting':
        return 'blinker';
      case 'ready':
        return 'state';
      case 'installing':
        return 'blinker';
      case 'undelivered':
        return 'blinker';
      default:
        return 'state';
    }
  }
}
