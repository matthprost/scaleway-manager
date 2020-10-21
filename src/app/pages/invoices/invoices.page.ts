import {Component, OnInit} from '@angular/core';
import {InvoicesDto} from '../../services/billing/billing.dto';
import {BillingService} from '../../services/billing/billing.service';
import {Plugins, StatusBarStyle} from '@capacitor/core';

const {StatusBar} = Plugins;

@Component({
  selector: 'app-invoices',
  templateUrl: './invoices.page.html',
  styleUrls: ['./invoices.page.scss'],
})
export class InvoicesPage implements OnInit {

  public invoices: Array<InvoicesDto>;
  public currentInvoice: InvoicesDto;
  public isLoading = true;
  public billingError = false;

  constructor(private billingService: BillingService) {
  }

  ngOnInit() {
  }

  ionViewDidEnter() {
    StatusBar.setStyle({ style: StatusBarStyle.Light });
    this.refresh().then(() => {
      this.isLoading = false;
    }).catch(() => {
      this.isLoading = false;
      this.billingError = true;
    });
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
        this.billingService.getBilling(10).then(result => {
          this.invoices = result.invoices;
          this.invoices = this.invoices.slice(1, this.invoices.length);
          this.currentInvoice = result.invoices[0];
          resolve('ok');
        }).catch(error => {
          reject(error);
        });
    });
  }

}
