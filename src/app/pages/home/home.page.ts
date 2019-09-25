import {Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import {AlertController, MenuController, NavController} from '@ionic/angular';
import {ServerDto} from '../../services/servers/server.dto';
import {ServersService} from '../../services/servers/servers.service';
import {InvoicesDto} from '../../services/billing/billing.dto';
import {BillingService} from '../../services/billing/billing.service';
import {HomeStatsDirective} from '../../directives/home-stats/home-stats.directive';
import {faServer, faChevronRight, faCode} from '@fortawesome/free-solid-svg-icons';
import {StatusBar} from '@ionic-native/status-bar/ngx';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage implements OnInit {

  public classAppear = 'card-cont';
  public rect = '';

  public nbrServParis = 0;
  public nbrServNetherlands = 0;

  private parisServers: Array<ServerDto> = null;
  private netherlandsServers: Array<ServerDto> = null;

  public oldestServer: { server: ServerDto, country: string };
  public powerfulServer: { server: ServerDto, country: string };
  public lastInvoice: InvoicesDto = null;
  public secondLastInvoice: InvoicesDto = null;

  public isLoading = true;

  faServer = faServer;
  faRight = faChevronRight;
  faCode = faCode;

  constructor(public navCtrl: NavController, private srvService: ServersService, private stats: HomeStatsDirective,
              public alertCtrl: AlertController, private billingProvider: BillingService, public menu: MenuController,
              private menuCtrl: MenuController, private statusBar: StatusBar) {
  }

  ngOnInit() {
  }

  ionViewDidLoad() {
  }

  ionViewDidEnter() {
    this.refresh();
    this.menuCtrl.enable(true);
    this.statusBar.styleLightContent();
  }

  public doRefresh(refresher) {
    this.refresh().then(() => {
      refresher.target.complete();
    }).catch(error => {
      console.log(error);
      refresher.target.complete();
    });
  }

  private refresh(): Promise<any> {

    return new Promise((resolve, reject) => {
      this.rect = 'background-rect rect-scale';

      // Get all servers from PARIS
      const paris = this.srvService.getAllServerByCountry('Paris').then(result => {
        this.nbrServParis = result.servers.length;
        this.parisServers = result.servers;
      }).catch(error => {
        reject(error);
      });

      // Get all servers from NETHERLANDS
      const netherlands = this.srvService.getAllServerByCountry('Netherlands').then(result => {
        this.nbrServNetherlands = result.servers.length;
        this.netherlandsServers = result.servers;
      }).catch(error => {
        reject(error);
      });

      // Get two last billing
      const billing = this.billingProvider.getTwoLastBilling().then(result => {
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
  }

  public setState(server: ServerDto): string {
    switch (server.state) {
      case 'stopped':
        return '#B2B6C3';
      case 'running':
        return '#30D1AD';
      case 'stopping':
        return '#3F6ED8';
      case 'starting':
        return '#3F6ED8';
      default:
        return '#B2B6C3';
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

  public navigate(location: string) {
    switch (location) {
      case 'account' :
        this.navCtrl.navigateForward(['/home/account']);
        break;
      /*case 'servers' :
        this.navCtrl.setRoot(ServerPage);
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
      case 'about' :
        this.navCtrl.push(AboutPage);
        break;*/
    }
  }

  /*public navigateServ(serverInfo: { server: ServerDto, country: string }) {
    this.navCtrl.push(ShowServerPage, {server: serverInfo.server, serverCountry: serverInfo.country});
  }*/

  /*public openWebSite(fab: FabContainer) {

    const options: InAppBrowserOptions = {
      zoom: 'no',
      location: 'no',
      toolbarposition: 'top'
    };

    this.iab.create('https://matthias-prost.com',
      '_blank', options);
  }*/

}
