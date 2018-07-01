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

  constructor(public navCtrl: NavController, public navParams: NavParams, public popoverCtrl: PopoverController) {
    this.server = navParams.get('server');
    this.serverName = this.server.name;
  }

  ionViewDidLoad() {
    //
  }

  capitalize(value: string) {
    return (value.charAt(0).toUpperCase() + value.slice(1));
  }

  showActions() {
    let popover = this.popoverCtrl.create(ServerActionsPage, {},
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
