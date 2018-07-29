import {Component} from '@angular/core';
import {NavParams, ToastController, ViewController} from "ionic-angular";

@Component({
  selector: 'page-server-actions',
  templateUrl: 'server-actions.html',
})
export class ServerActionsPage {

  public serverActions;
  public actionSelected;

  constructor(public navParams: NavParams, public viewCtrl: ViewController,
              private toastCtrl: ToastController) {
    this.serverActions = navParams.get('actions');
  }

  ionViewDidLoad() {
    //
  }



  sendAction() {
    if (this.actionSelected) {
      this.viewCtrl.dismiss({action: this.actionSelected});
    } else {
      let toast = this.toastCtrl.create({
        message: 'Please select an action',
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
        value = 'Start';
        break;
      case 'poweroff':
        value = 'Stop (Archive)';
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
