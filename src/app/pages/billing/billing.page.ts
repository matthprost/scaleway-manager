import {Component} from '@angular/core';
import { StatusBar, Style as StatusBarStyle } from '@capacitor/status-bar';

import {BillingDto} from '../../services/billing/billing.dto';
import {BillingService} from '../../services/billing/billing.service';

@Component({
  selector: 'app-billing',
  templateUrl: './billing.page.html',
  styleUrls: ['./billing.page.scss'],
})
export class BillingPage {
  public billings: BillingDto[] = [];
  public currentInvoice: BillingDto;
  public isLoading = true;
  public billingError = false;

  constructor(private billingService: BillingService) {
  }

  ionViewDidEnter(): void {
    StatusBar.setStyle({style: StatusBarStyle.Light});
    this.refresh()
      .catch(() => {
        this.billingError = true;
      }).finally(() => this.isLoading = false);
  }

  public doRefresh(refresher) {
    this.refresh()
      .then(() => {
        refresher.target.complete();
      })
      .catch((error) => {
        console.log(error);
        refresher.target.complete();
      });
  }

  private async refresh(): Promise<any> {
    const billings = await this.billingService.getBillingList(100);
    this.currentInvoice = billings[0];
    this.billings = billings.slice(1, billings.length);
    console.log(this.billings)
  }
}
