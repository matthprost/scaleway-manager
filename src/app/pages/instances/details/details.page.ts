import {Component, OnInit} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {ServerDto} from '../../../services/servers/server.dto';
import {ServersService} from '../../../services/servers/servers.service';
import {AlertController, Platform, ToastController} from '@ionic/angular';
import {Clipboard} from '@ionic-native/clipboard/ngx';
import {StatusBar} from '@ionic-native/status-bar/ngx';

@Component({
  selector: 'app-details',
  templateUrl: './details.page.html',
  styleUrls: ['./details.page.scss'],
})
export class DetailsPage implements OnInit {


  public server = {} as ServerDto;
  public serverName: string;
  public serverCountry: string;
  public state: string;
  public serverLoading: boolean;
  public stateClass = 'state';
  public power = false;

  public isLoading = true;

  constructor(private serversProvider: ServersService,
              private toastCtrl: ToastController, private clipboard: Clipboard, private alertController: AlertController,
              public statusBar: StatusBar, private route: ActivatedRoute, private platform: Platform) {
    this.server.id = this.route.snapshot.paramMap.get('id');
    this.serverCountry = this.route.snapshot.paramMap.get('zone');
  }

  ngOnInit() {
  }

  ionViewDidEnter() {
    this.statusBar.styleDefault();
    this.refreshServer().then(() => {
      this.setState();
      this.isLoading = false;
    });
  }

  ionViewDidLoad() {
  }

  private setState() {
    switch (this.server.state) {
      case 'stopped':
        this.state = '#B2B6C3';
        this.serverLoading = false;
        this.stateClass = 'state';
        break;
      case 'running':
        this.state = '#30D1AD';
        this.serverLoading = false;
        this.stateClass = 'state';
        this.power = true;
        break;
      case 'stopping':
        this.state = '#3F6ED8';
        this.serverLoading = true;
        this.stateClass = 'blinker';
        break;
      case 'starting':
        this.state = '#3F6ED8';
        this.serverLoading = true;
        this.stateClass = 'blinker';
        break;
      default:
        this.state = '#B2B6C3';
        this.serverLoading = true;
        this.stateClass = 'state';
        break;
    }
  }

  public isDisabled(value) {
    if (value === 'power') {
      switch (this.server.state) {
        case 'stopped in place':
          return false;
        case 'stopped':
          return false;
        case 'running':
          return false;
        case 'stopping':
          return true;
        case 'starting':
          return true;
        default:
          return true;
      }
    } else if (value === 'reboot') {
      switch (this.server.state) {
        case 'stopped in place':
          return true;
        case 'stopped':
          return true;
        case 'running':
          return false;
        case 'stopping':
          return true;
        case 'starting':
          return true;
        default:
          return true;
      }
    } else if (value === 'archive') {
      switch (this.server.state) {
        case 'stopped in place':
          return true;
        case 'stopped':
          return true;
        case 'running':
          return false;
        case 'stopping':
          return true;
        case 'starting':
          return true;
        default:
          return true;
      }
    } else if (value === 'delete') {
      switch (this.server.state) {
        case 'stopped in place':
          return true;
        case 'stopped':
          return true;
        case 'running':
          return false;
        case 'stopping':
          return true;
        case 'starting':
          return true;
        default:
          return true;
      }
    }
  }

  private refreshServer(): Promise<any> {

    return new Promise((resolve, reject) => {
      this.serversProvider.getServerById(this.serverCountry, this.server.id).then(result => {
        this.server = result.server;
        this.serverName = result.server.name;
        this.setState();
        resolve('ok');
      }).catch(error => {
        reject(error);
      });
    });
  }

  public update(event) {
    this.power = event;
    if (this.power === true) {
      this.serversProvider.sendServerAction(this.serverCountry, this.server.id, 'poweron')
        .then(() => {
          this.refreshServer();
        }).catch(error => {
        console.log(error);
      });
    } else {
      this.serversProvider.sendServerAction(this.serverCountry, this.server.id, 'stop_in_place')
        .then(() => {
          this.refreshServer();
        }).catch(error => {
        console.log(error);
      });
    }
  }

  public async reboot() {
    const alert = await this.alertController.create({
      header: 'Reboot ?',
      message: 'Are you sure you want to reboot this server ?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          cssClass: 'secondary'
        }, {
          text: 'Reboot',
          handler: () => {
            this.serversProvider.sendServerAction(this.serverCountry, this.server.id, 'reboot')
              .then(() => {
                this.refreshServer();
              }).catch(error => {
              console.log(error);
            });
          }
        }
      ]
    });

    await alert.present();
  }

  public archive() {
    this.serversProvider.sendServerAction(this.serverCountry, this.server.id, 'poweroff')
      .then(() => {
        this.refreshServer();
      }).catch(error => {
      console.log(error);
    });
  }

  public async delete() {
    const alert = await this.alertController.create({
      header: 'Delete ?',
      message: 'Are you sure you want to delete this server ?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          cssClass: 'danger'
        }, {
          text: 'Delete',
          handler: () => {
            this.serversProvider.sendServerAction(this.serverCountry, this.server.id, 'terminate')
              .then(() => {
                this.refreshServer();
              }).catch(error => {
              console.log(error);
            });
          }
        }
      ]
    });

    await alert.present();
  }

  public async copyToClipBoard(text: string) {
    if (this.platform.is('cordova')) {
      await this.clipboard.copy(text);

      const toast = await this.toastCtrl.create({
        message: 'Address has been copied into your clipboard!',
        duration: 3000,
        position: 'top'
      });

      await toast.present();
    } else {
      console.warn('Feature only available on cordova');
    }
  }

}
