import {Component} from '@angular/core';
import {BillingProvider} from "../../providers/billing/billing";
import {Storage} from "@ionic/storage";
import {AuthTokenDto} from "../../providers/auth/auth-tokens.dto";
import {InvoicesDto} from "../../providers/billing/billing.dto";
import {StatusBar} from "@ionic-native/status-bar/ngx";

@Component({
  selector: 'page-billing',
  templateUrl: 'billing.html',
})
export class BillingPage {

  public isLoading: boolean = true;
  public invoices: Array<InvoicesDto>;
  public currentInvoice: InvoicesDto = null;

  constructor(private billingProvider: BillingProvider, private storage: Storage, public statusBar: StatusBar) {
  }

  ionViewDidLoad() {
    this.refresh().then(() => {
      this.isLoading = false;
    });
  }

  ionViewDidEnter() {
    this.statusBar.styleDefault();
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
      this.storage.get('token').then((token) => {
        this.billingProvider.getBilling(token.auth.jwt_key, 15).then(result => {
          this.invoices = result;
          this.invoices = this.invoices.slice(1, this.invoices.length);
          this.currentInvoice = result[0];
          resolve('ok');
        }).catch(error => {
          reject(error);
        });
      });
    });
  }

  public changeStateColor(state) {
    state = state.toLowerCase();

    let color = 'dimgray';
    const value: boolean = true;

    switch (value) {
      case state.indexOf('paid') !== -1:
        color = 'green';
        break;
      case state.indexOf('draft') !== -1:
        color = 'orange';
        break;
      case state.indexOf('stopped') !== -1:
        color = 'orange';
        break;
      case state.indexOf('Outdated') !== -1:
        color = 'orange';
        break;
      case state.indexOf('Incomplete') !== -1:
        color = '';
        break;
      case state.indexOf('Issued') !== -1:
        color = 'md-time';
        break;
      default:
        color = 'dimgray';
    }

    return (color);
  }


}
