import {Component} from '@angular/core';
import { StatusBar, Style as StatusBarStyle } from '@capacitor/status-bar';
import {faChevronRight} from '@fortawesome/free-solid-svg-icons';
import {MenuController, NavController} from '@ionic/angular';
import {Storage} from '@ionic/storage-angular';

import {BillingDto} from '../../services/billing/billing.dto';
import {BillingService} from '../../services/billing/billing.service';
import {ServerDto} from '../../services/servers/server.dto';
import {ServersService} from '../../services/servers/servers.service';
import {ProjectDto} from '../../services/user/project/project.dto';
import {ProjectService} from '../../services/user/project/project.service';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage {
  public classAppear = 'card-cont';
  public serversInstances: ServerDto[] = [];
  public isLoading = true;

  faRight = faChevronRight;

  private interval;
  private intervalSet = false;

  public billings: BillingDto[] = [];

  public billingError = false;
  public serverError = false;

  public currentOrganization = { name: '' };
  public currentProject: ProjectDto;

  slideOpts = {
    initialSlide: 0,
    slidesPerView: 2.15,
    slidesOffsetBefore: 15,
    slidesOffsetAfter: 15,
  };

  // STORAGE SETTINGS
  public instancesToDisplay = 6;

  constructor(
    public navCtrl: NavController,
    private serversService: ServersService,
    private billingService: BillingService,
    private menuCtrl: MenuController,
    private storage: Storage,
    private projectService: ProjectService
  ) {
  }

  ionViewDidLeave(): void {
    clearInterval(this.interval);
  }

  ionViewDidEnter(): void {
    StatusBar.setStyle({style: StatusBarStyle.Dark});

    this.classAppear = 'no-class';
    this.menuCtrl.enable(true);

    this.refresh().then(() => {
      this.autoRefresh();
      this.classAppear = 'card-appear';
    });
  }

  public async refreshBilling(): Promise<any> {
    try {
      this.billings = await this.billingService.getBillingList(6);
      this.billingError = false;
    } catch (e) {
      this.billingError = true;

      throw e;
    } finally {
      this.isLoading = false;
    }
  }

  public async refreshServers(): Promise<any> {
    try {
      const userData = await this.storage.get('user');
      const currentOrganizationId = await this.storage.get(
        'currentOrganization'
      );
      this.currentProject = await this.projectService.getCurrentProject();
      const settings = await this.storage.get('settings');

      this.currentOrganization = userData.organizations.find(
        (organization) => organization.id === currentOrganizationId
      );
      this.instancesToDisplay = (settings && settings.instancesToDisplay) || 6;

      this.serversInstances = await this.serversService.getAllServer(
        this.instancesToDisplay
      );
    } catch (e) {
      this.serverError = true;

      throw e;
    }
  }

  public async refresh(): Promise<any> {
    await this.refreshServers()
    await this.refreshBilling()
  }

  private async autoRefresh() {
    console.log('[AUTO REFRESH]: Entering function');
    let counter = 0;

    this.serversInstances.forEach((server) => {
      if (server.state === 'starting' || server.state === 'stopping') {
        counter++;
      }
    });

    if (counter > 0 && !this.intervalSet) {
      this.intervalSet = true;

      this.interval = setInterval(() => {
        console.log('[AUTO REFRESH]: Entering interval');

        let newCounter = 0;

        this.serversInstances.forEach((server) => {
          if (server.state === 'starting' || server.state === 'stopping') {
            newCounter++;
          }
        });
        if (newCounter > 0) {
          this.refresh();
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

  public startAndStopServers(event: any, server: ServerDto): void {
    console.log(event.detail.checked);

    if (event.detail.checked === true) {
      this.serversService
        .sendServerAction(server.area, server.id, 'poweron')
        .then(() => {
          this.refresh().then(() => {
            this.autoRefresh();
          });
          return;
        });
    } else if (event.detail.checked === false) {
      this.serversService
        .sendServerAction(server.area, server.id, 'poweroff')
        .then(() => {
          this.refresh().then(() => {
            this.autoRefresh();
          });
          return;
        });
    }
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
      case 'stopped in place':
        return '#FF8C69';
      default:
        return '#B2B6C3';
    }
  }

  public setToggle(server: ServerDto): boolean {
    switch (server.state) {
      case 'stopped':
        return false;
      case 'running':
        return true;
      case 'stopping':
        return false;
      case 'starting':
        return true;
      case 'stopped in place':
        return true;
      default:
        return false;
    }
  }

  public setDisabled(server: ServerDto): boolean {
    switch (server.state) {
      case 'stopped':
        return false;
      case 'running':
        return false;
      case 'stopping':
        return true;
      case 'starting':
        return true;
      case 'stopped in place':
        return false;
      default:
        return false;
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

  public async navigate(location: string, area?: string, serverId?: string): Promise<void> {
    switch (location) {
      case 'account':
        await this.navCtrl.navigateForward(['/home/account']);
        break;
      case 'instances':
        await this.navCtrl.navigateForward(['/instances']);
        break;
      case 'instancesDetails':
        await this.navCtrl.navigateForward([
          '/instances/' + area + '/' + serverId,
        ]);
        break;
      case 'os':
        await this.navCtrl.navigateForward(['/buckets/']);
        break;
    }
  }
}
