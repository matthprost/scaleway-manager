import {Component} from '@angular/core';
import {BillingProvider} from "../../providers/billing/billing";
import {Storage} from "@ionic/storage";
import {AuthTokenDto} from "../../providers/auth/auth-tokens.dto";
import {InvoicesDto} from "../../providers/billing/billing.dto";

@Component({
  selector: 'page-billing',
  templateUrl: 'billing.html',
})
export class BillingPage {

  public isLoading: boolean = true;
  public invoices: Array<InvoicesDto>;
  public currentInvoice: InvoicesDto = null;

  constructor(private billingProvider: BillingProvider, private storage: Storage) {
  }

  ionViewDidLoad() {
    this.storage.get('token').then((token: AuthTokenDto) => {
      this.billingProvider.getBilling(token.token.id, 15).then(result => {
        this.invoices = result;
        this.invoices = this.invoices.slice(1, this.invoices.length);
        this.currentInvoice = result[0];
        this.isLoading = false;
      }).catch(error => {
        console.log(error);
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
