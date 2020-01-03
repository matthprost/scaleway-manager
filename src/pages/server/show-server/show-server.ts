import {Component} from '@angular/core';
import {AlertController, NavParams, ToastController} from 'ionic-angular';
import {ServerDto} from "../../../providers/servers/server.dto";
import {ServersProvider} from "../../../providers/servers/servers";
import {Storage} from "@ionic/storage";
import {Clipboard} from "@ionic-native/clipboard/ngx";
import {StatusBar} from "@ionic-native/status-bar/ngx";

@Component({
  selector: 'page-show-server',
  templateUrl: 'show-server.html',
})
export class ShowServerPage {

  public server: ServerDto;
  public serverName: string;
  public serverCountry: string;
  public state: string;
  public serverLoading: boolean;
  public stateClass: string = 'state';
  public power: boolean = false;

  constructor(public navParams: NavParams, private serversProvider: ServersProvider, private storage: Storage,
              private toastCtrl: ToastController, private clipboard: Clipboard, private alertController: AlertController,
              public statusBar: StatusBar) {
    this.server = navParams.get('server');
    this.serverCountry = navParams.get('serverCountry');
    this.serverName = this.server.name;
  }

  ionViewDidEnter() {
    this.statusBar.styleDefault();
  }

  ionViewDidLoad() {
    this.setState();
    this.refreshServer();
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
      this.storage.get('token').then((token) => {
        this.serversProvider.getSpecificServer(this.serverCountry, token.auth.jwt_key, this.server.id).then(result => {
          this.server = result.server;
          this.serverName = result.server.name;
          this.setState();
          resolve('ok');
        }).catch(error => {
          reject(error)
        });
      });
    });
  }

  public doRefresh(refresher) {
    this.refreshServer().then(() => {
      refresher.complete();
    }).catch(error => {
      console.log(error);
      refresher.complete();
    })
  }

  public update(event) {
    this.power = event;
    if (this.power === true) {
      this.storage.get('token').then(token => {
        this.serversProvider.sendServerAction(this.serverCountry, this.server.id, token.auth.jwt_key, 'poweron')
          .then(() => {
            this.refreshServer();
          }).catch(error => {
          console.log(error);
        })
      });
    } else {
      this.storage.get('token').then(token => {
        this.serversProvider.sendServerAction(this.serverCountry, this.server.id, token.auth.jwt_key, 'stop_in_place')
          .then(() => {
            this.refreshServer();
          }).catch(error => {
          console.log(error);
        })
      });
    }
  }

  public reboot() {
    const alert = this.alertController.create({
      title: 'Reboot ?',
      message: 'Are you sure you want to reboot this server ?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          cssClass: 'secondary'
        }, {
          text: 'Reboot',
          handler: () => {
            this.storage.get('token').then(token => {
              this.serversProvider.sendServerAction(this.serverCountry, this.server.id, token.auth.jwt_key, 'reboot')
                .then(() => {
                  this.refreshServer();
                }).catch(error => {
                console.log(error);
              })
            });
          }
        }
      ]
    });

    alert.present();
  }

  public archive() {
    this.storage.get('token').then(token => {
      this.serversProvider.sendServerAction(this.serverCountry, this.server.id, token.auth.jwt_key, 'poweroff')
        .then(() => {
          this.refreshServer();
        }).catch(error => {
        console.log(error);
      })
    });
  }

  public delete() {
    const alert = this.alertController.create({
      title: 'Delete ?',
      message: 'Are you sure you want to delete this server ?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          cssClass: 'danger'
        }, {
          text: 'Delete',
          handler: () => {
            this.storage.get('token').then(token => {
              this.serversProvider.sendServerAction(this.serverCountry, this.server.id, token.auth.jwt_key, 'terminate')
                .then(() => {
                  this.refreshServer();
                }).catch(error => {
                console.log(error);
              })
            });
          }
        }
      ]
    });

    alert.present();
  }

  public copyToClipBoard(text: string) {
    this.clipboard.copy(text);
    const toast = this.toastCtrl.create({
      message: 'Address has been copied into your clipboard!',
      duration: 3000,
      position: 'top'
    });
    toast.present();
  }
}
