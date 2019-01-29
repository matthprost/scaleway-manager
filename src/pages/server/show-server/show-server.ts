import {Component} from '@angular/core';
import {NavParams, PopoverController, ToastController} from 'ionic-angular';
import {ServerDto} from "../../../providers/servers/server.dto";
import {ServerActionsPage} from "../server-actions/server-actions";
import {ServersProvider} from "../../../providers/servers/servers";
import {AuthTokenDto} from "../../../providers/auth/auth-tokens.dto";
import {Storage} from "@ionic/storage";
import {Clipboard} from "@ionic-native/clipboard/ngx";

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

  constructor(public navParams: NavParams, public popoverCtrl: PopoverController,
              private serversProvider: ServersProvider, private storage: Storage,
              private toastCtrl: ToastController, private clipboard: Clipboard) {
    this.server = navParams.get('server');
    this.serverCountry = navParams.get('serverCountry');
    this.serverName = this.server.name;
  }

  ionViewDidLoad() {
    this.setState();
    this.refreshServer();
  }

  private setState() {
    switch (this.server.state) {
      case 'stopped':
        this.state = 'red';
        this.serverLoading = false;
        this.stateClass = 'state';
        break;
      case 'running':
        this.state = '#27c295';
        this.serverLoading = false;
        this.stateClass = 'state';
        break;
      case 'stopping':
        this.state = 'orange';
        this.serverLoading = true;
        this.stateClass = 'blinker';
        break;
      case 'starting':
        this.state = 'orange';
        this.serverLoading = true;
        this.stateClass = 'blinker';
        break;
      default:
        this.state = 'gray';
        this.serverLoading = true;
        this.stateClass = 'state';
    }
  }

  private refreshServer(): Promise<any> {

    return new Promise((resolve, reject) => {
      this.storage.get('token').then((token: AuthTokenDto) => {
        this.serversProvider.getSpecificServer(this.serverCountry, token.token.id, this.server.id).then(result => {
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

  public showActions() {
    let popover = this.popoverCtrl.create(ServerActionsPage, {serverState: this.server.state},
      {cssClass: 'custom-popover'});
    let ev = {
      target: {
        getBoundingClientRect: () => {
          return {
            left: '20px',
            top: '10%',
            width: '90%',
          };
        }
      }
    };
    popover.present({ev});
    popover.onDidDismiss(result => {
      if (result && result.action) {
        this.storage.get('token').then(token => {
          this.serversProvider.sendServerAction(this.serverCountry, this.server.id, token.token.id, result.action)
            .then(() => {
              this.refreshServer();
            }).catch(error => {
            console.log(error);
          })
        });
      }
    })
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
