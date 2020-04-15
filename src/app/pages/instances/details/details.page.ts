import {Component, OnInit} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {ServerDto} from '../../../services/servers/server.dto';
import {ServersService} from '../../../services/servers/servers.service';
import {AlertController, NavController, Platform, ToastController} from '@ionic/angular';
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

  private interval;
  private intervalSet = false;

  constructor(private serversProvider: ServersService,
              private toastCtrl: ToastController, private clipboard: Clipboard, private alertController: AlertController,
              public statusBar: StatusBar, private route: ActivatedRoute, private platform: Platform,
              private navCtrl: NavController) {
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
      this.autoRefresh();
    });
  }

  private async autoRefresh() {
    console.log('[AUTO REFRESH]: Entering function');
    let counter = 0;

    if (this.server.state === 'starting' || this.server.state === 'stopping') {
      counter++;
    }

    if (counter > 0 && !this.intervalSet) {
      this.intervalSet = true;

      this.interval = setInterval(() => {
        console.log('[AUTO REFRESH]: Entering interval');

        let newCounter = 0;

        if (this.server) {
          if (this.server.state === 'starting' || this.server.state === 'stopping') {
            newCounter++;
          }
        } else {
          clearInterval(this.interval);
        }

        if (newCounter > 0) {
          this.refreshServer();
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
          this.refreshServer().then(() => {
            this.autoRefresh();
          });
        }).catch(error => {
        console.log(error);
      });
    } else {
      this.serversProvider.sendServerAction(this.serverCountry, this.server.id, 'poweroff')
        .then(() => {
          this.refreshServer().then(() => {
            this.autoRefresh();
          });
        }).catch(error => {
        console.log(error);
      });
    }
  }

  public async stopInPlace() {
    const alert = await this.alertController.create({
      header: 'Are you sure you want to put your instance in standby mode?\n',
      message: '</br><strong>This action will ask the kernel to shutdown itself via an ACPI call. ' +
        'Stopping your instance may take some time.</strong></br></br>' +
        'You will be billed for all resources assigned to your account even when the instance is in standby.',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          cssClass: 'secondary'
        }, {
          text: 'Confirm',
          handler: () => {
            this.serversProvider.sendServerAction(this.serverCountry, this.server.id, 'stop_in_place')
              .then(() => {
                this.refreshServer().then(() => {
                  this.autoRefresh();
                });
              }).catch(error => {
              console.log(error);
            });
          }
        }
      ]
    });

    await alert.present();
  }

  public async reboot() {
    const alert = await this.alertController.create({
      header: 'Are you sure you want to reboot you instance?',
      message: '<strong>Warning!</strong><br/> Powering off or rebooting an instance is similar to pulling ' +
        'the electrical plug on a running ' +
        'computer, which can cause data corruption.<br/> You need to shutdown the OS first: login to your instance as ' +
        'root and execute the halt command.',
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
                this.refreshServer().then(() => {
                  this.autoRefresh();
                });
              }).catch(error => {
              console.log(error);
            });
          }
        }
      ]
    });

    await alert.present();
  }

  public async delete() {
    const alert = await this.alertController.create({
      header: 'Are you sure you want to delete this server ?',
      message: '<strong>Warning!</strong><br/> ' +
        'This will permanently delete your instance and all your data will be lost. This action is irreversible.',
      inputs: [
        {
          name: 'ipCheckbox',
          type: 'checkbox',
          label: 'Yes, delete associated IP',
          value: true,
          checked: true
        },
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          cssClass: 'danger'
        }, {
          text: 'Delete',
          handler: (values) => {
            this.serversProvider.serverDelete(this.serverCountry, this.server.id,
              values[0] ? this.server.public_ip.id : null)
              .then(() => {
                this.navCtrl.pop();
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
        position: 'top',
        color: 'secondary',
        showCloseButton: true,
      });

      await toast.present();
    } else {
      console.warn('Feature only available on cordova');
    }
  }

}
