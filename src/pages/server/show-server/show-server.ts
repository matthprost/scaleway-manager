import { Component } from '@angular/core';
import {NavController, NavParams, PopoverController} from 'ionic-angular';
import {ServerDto} from "../../../providers/servers/server.dto";
import {ServerActionsPage} from "../server-actions/server-actions";

@Component({
  selector: 'page-show-server',
  templateUrl: 'show-server.html',
})
export class ShowServerPage {

  public server: ServerDto;
  public serverName: string;
  public serverCountry: string;
  public state: string;

  constructor(public navCtrl: NavController, public navParams: NavParams, public popoverCtrl: PopoverController) {
    this.server = navParams.get('server');
    this.serverCountry = navParams.get('serverCountry');
    this.serverName = this.server.name;
  }

  ionViewDidLoad() {
    if (this.server.state === 'stopped') {
      this.state = 'red';
    } else if (this.server.state === 'running') {
      this.state = '#27c295';
    } else if (this.server.state === 'stopping') {
      this.state = 'orange';
    } else if (this.server.state === 'starting') {
      this.state = 'orange';
    }
  }

  capitalize(value: string) {
    return (value.charAt(0).toUpperCase() + value.slice(1));
  }

  showActions() {
    let popover = this.popoverCtrl.create(ServerActionsPage, {serverCountry: this.serverCountry, server: this.server},
      {cssClass: 'custom-popover'});
    let ev = {
      target: {
        getBoundingClientRect: () => {
          return {
            left: '20px',
            top: '70px',
            width: '90%'
          };
        }
      }
    };
    popover.present({ev});
  }

}
