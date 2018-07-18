import {Component} from '@angular/core';
import {LoadingController, NavController, PopoverController} from 'ionic-angular';
import {AccountPopoverPage} from "./account-popover/account-popover";
import {LogoutProvider} from "../../providers/auth/logout/logout";
import {LoginPage} from "../auth/login/login";
import {ServerPage} from "../server/server";
import {Storage} from "@ionic/storage";
import {AuthTokenDto} from "../../providers/auth/auth-tokens.dto";
import {ServersProvider} from "../../providers/servers/servers";
import {ServerDto} from "../../providers/servers/server.dto";
import {HomeStatsDirective} from "../../directives/home-stats/home-stats";

@Component({
  selector: 'page-home',
  templateUrl: 'home.html'
})
export class HomePage {

  public classAppear: string = 'card-cont';
  public rect: string = '';
  public nbrServParis: number = 0;
  public nbrServNetherlands: number = 0;
  private allServers: Array<ServerDto> = [];
  public oldestServer: ServerDto;
  public powerfulServer: ServerDto;

  constructor(public navCtrl: NavController, private popoverCtrl: PopoverController,
              private logoutService: LogoutProvider, private loadingCtrl: LoadingController,
              private storage: Storage, private serversProvider: ServersProvider,
              private stats: HomeStatsDirective) {
  }

  ionViewDidLoad() {
    this.rect = 'background-rect rect-scale';
    this.storage.get('token').then((token: AuthTokenDto) => {

      this.serversProvider.getAllServers('Paris', token.token.id).then(result => {
        this.nbrServParis = result.servers.length;
        this.allServers = this.allServers.concat(result.servers);
      }).catch(error => {
        console.log(error);
      });

      this.serversProvider.getAllServers('Netherlands', token.token.id).then(result => {
        this.nbrServNetherlands = result.servers.length;
        this.allServers = this.allServers.concat(result.servers);
        this.oldestServer = this.stats.whatIsTheOldest(this.allServers);
        this.powerfulServer = this.stats.whatIsThePowerfull(this.allServers);
        this.classAppear = 'card-appear';
      }).catch(error => {
        console.log(error);
      });

    });
  }

  account(ev: UIEvent) {
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

  navigate(location: string) {
    switch (location) {
      case 'paris' :
        this.navCtrl.setRoot(ServerPage, {server: 'Paris'});
        break;
      case 'netherlands' :
        this.navCtrl.setRoot(ServerPage, {server: 'Netherlands'});
        break;
    }
  }

}
