import {Component} from '@angular/core';
import {ServersProvider} from "../../../providers/servers/servers";
import {AuthTokenDto} from "../../../providers/auth/auth-tokens.dto";
import {Storage} from "@ionic/storage";
import {NavParams, ToastController, ViewController} from "ionic-angular";
import {ServerDto} from "../../../providers/servers/server.dto";

@Component({
  selector: 'page-server-actions',
  templateUrl: 'server-actions.html',
})
export class ServerActionsPage {

  private serverCountry: string;
  private server: ServerDto;
  public serverActions;
  public actionSelected;

  constructor(public navParams: NavParams, private apiServer: ServersProvider, private storage: Storage,
              public viewCtrl: ViewController, private toastCtrl: ToastController) {
    this.serverCountry = navParams.get('serverCountry');
    this.server = navParams.get('server');
  }

  ionViewDidLoad() {
    this.getAllActions()
  }

  private getAllActions() {
    this.storage.get('token').then((val: AuthTokenDto) => {
      this.apiServer.getAllActionsServer(this.serverCountry, this.server.id, val.token.id).then(result => {
        this.serverActions = result;
        this.serverActions = this.serverActions.actions;
      });
    });
  }

  sendAction() {
    if (this.actionSelected) {
      this.viewCtrl.dismiss({action: this.actionSelected});
    } else {
      let toast = this.toastCtrl.create({
        message: 'Error: Please select an action',
        duration: 3000,
        position: 'top'
      });
      toast.present();
    }
  }

  searchForAction(action: string): string {
    let value: string = null;

    switch (action) {
      case 'poweron':
        value = 'Power On';
        break;
      case 'poweroff':
        value = 'Power Off (Archive)';
        break;
      case 'reboot':
        value = 'Reboot';
        break;
      case 'stop_in_place':
        value = 'Stop in place';
        break;
      case 'terminate':
        value = 'Terminate (Delete)';
        break;
      case 'backup':
        value = 'Backup';
        break;
      default:
        value = 'Unknown action - Don\' select this one!'

    }
    return (value);
  }
}