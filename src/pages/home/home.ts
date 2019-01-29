import {Component} from '@angular/core';
import {
  AlertController,
  FabContainer,
  LoadingController,
  MenuController,
  NavController,
  PopoverController
} from 'ionic-angular';
import {AccountPopoverPage} from "./account-popover/account-popover";
import {LogoutProvider} from "../../providers/auth/logout/logout";
import {LoginPage} from "../auth/login/login";
import {ServerPage} from "../server/server";
import {Storage} from "@ionic/storage";
import {AuthTokenDto} from "../../providers/auth/auth-tokens.dto";
import {ServersProvider} from "../../providers/servers/servers";
import {ServerDto} from "../../providers/servers/server.dto";
import {HomeStatsDirective} from "../../directives/home-stats/home-stats";
import {ShowServerPage} from "../server/show-server/show-server";
import {ContactPage} from "../contact/contact";
import {BugReportPage} from "../bug-report/bug-report";
import {InAppBrowser} from "@ionic-native/in-app-browser/ngx";
import {InvoicesDto} from "../../providers/billing/billing.dto";
import {BillingProvider} from "../../providers/billing/billing";
import {BillingPage} from "../billing/billing";
import { AdMobFree, AdMobFreeBannerConfig } from '@ionic-native/admob-free/ngx';

@Component({
  selector: 'page-home',
  templateUrl: 'home.html'
})
export class HomePage {

  public classAppear: string = 'card-cont';
  public rect: string = '';

  public nbrServParis: number = 0;
  public nbrServNetherlands: number = 0;

  private parisServers: Array<ServerDto> = null;
  private netherlandsServers: Array<ServerDto> = null;

  public oldestServer: { server: ServerDto, country: string };
  public powerfulServer: { server: ServerDto, country: string };
  public lastInvoice: InvoicesDto = null;
  public secondLastInvoice: InvoicesDto = null;

  public isLoading: boolean = true;

  constructor(public navCtrl: NavController, private popoverCtrl: PopoverController,
              private logoutService: LogoutProvider, private loadingCtrl: LoadingController,
              private storage: Storage, private serversProvider: ServersProvider,
              private stats: HomeStatsDirective, public alertCtrl: AlertController,
              private iab: InAppBrowser, private billingProvider: BillingProvider,
              public menu: MenuController, private admobFree: AdMobFree) {
  }

  ionViewDidLoad() {
    const bannerConfig: AdMobFreeBannerConfig = {
      id: 'ca-app-pub-4378794561722809~9221055147',
      isTesting: true,
      autoShow: true
    };

    this.admobFree.banner.config(bannerConfig);

    this.admobFree.banner.prepare()
      .then(() => {
        console.log('ok');
      })
      .catch(e => console.log(e));
  }

  ionViewDidEnter() {
    this.refresh();
  }

  public doRefresh(refresher) {
    this.refresh().then(() => {
      refresher.complete();
    }).catch(error => {
      console.log(error);
      refresher.complete();
    });
  }

  private refresh(): Promise<any> {

    return new Promise((resolve, reject) => {
      this.rect = 'background-rect rect-scale';
      this.storage.get('token').then((token: AuthTokenDto) => {

        // Get all servers from PARIS
        const paris = this.serversProvider.getAllServers('Paris', token.token.id).then(result => {
          this.nbrServParis = result.servers.length;
          this.parisServers = result.servers;
        }).catch(error => {
          reject(error);
        });

        // Get all servers from NETHERLANDS
        const netherlands = this.serversProvider.getAllServers('Netherlands', token.token.id).then(result => {
          this.nbrServNetherlands = result.servers.length;
          this.netherlandsServers = result.servers;
        }).catch(error => {
          reject(error);
        });

        // Get two last billing
        const billing = this.billingProvider.getTwoLastBilling(token.token.id).then(result => {
          this.lastInvoice = result[0];
          this.secondLastInvoice = result[1];
        }).catch(error => {
          reject(error);
        });

        // Sync all promises, when they all finished, we display the information
        Promise.all([paris, netherlands, billing]).then(() => {
          if (this.parisServers && this.netherlandsServers) {
            this.oldestServer = this.stats.whatIsTheOldest(this.parisServers, this.netherlandsServers);
            this.powerfulServer = this.stats.whatIsThePowerful(this.parisServers, this.netherlandsServers);
            this.classAppear = 'card-appear';
            this.isLoading = false;
            resolve('ok');
          } else {
            reject('error');
          }
        }).catch(error => {
          reject(error);
        });
      });
    });
  }

  public setState(server: ServerDto): string {
    switch (server.state) {
      case 'stopped':
        return 'red';
      case 'running':
        return '#27c295';
      case 'stopping':
        return 'orange';
      case 'starting':
        return 'orange';
      default:
        return 'gray';
    }
  }

  public setClass(server: ServerDto): string {
    switch (server.state) {
      case 'stopped':
        return 'state';
      case 'running':
        return 'state';
      case 'stopping':
        return 'blinker';
      case 'starting':
        return 'blinker';
      default:
        return 'state';
    }
  }

  public account(ev: UIEvent) {
    let popover = this.popoverCtrl.create(AccountPopoverPage);

    popover.present({
      ev: ev
    });
    popover.onDidDismiss(result => {
      if (result && result.logout) {
        const loader = this.loadingCtrl.create({
          content: "Please wait...",
        });

        loader.present();
        this.logoutService.logout().then(() => {
          loader.dismiss();
          this.navCtrl.setRoot(LoginPage);
        }).catch(error => {
          loader.dismiss();
          console.log(error);
        });
      }
    });
  }

  public navigate(location: string, fab?: FabContainer) {
    switch (location) {
      case 'paris' :
        this.navCtrl.setRoot(ServerPage, {server: 'Paris'});
        break;
      case 'netherlands' :
        this.navCtrl.setRoot(ServerPage, {server: 'Netherlands'});
        break;
      case 'contact' :
        fab.close();
        this.navCtrl.push(ContactPage);
        break;
      case 'bug' :
        fab.close();
        this.navCtrl.push(BugReportPage);
        break;
      case 'billing' :
        this.navCtrl.push(BillingPage);
        break;
    }
  }

  public navigateServ(serverInfo: { server: ServerDto, country: string }) {
    this.navCtrl.push(ShowServerPage, {server: serverInfo.server, serverCountry: serverInfo.country});
  }

  public openWebSite(fab: FabContainer) {
    const confirm = this.alertCtrl.create({
      title: 'Warning',
      message: 'It will open your web browser, are you sure ?',
      buttons: [
        {
          text: 'Cancel',
        },
        {
          text: 'Ok',
          handler: () => {
            fab.close();
            const ref = this.iab.create('https://matthias-prost.com', '_system');
            ref.close();
          }
        }
      ]
    });
    confirm.present();
  }


}
