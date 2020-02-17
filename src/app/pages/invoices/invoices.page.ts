import {Component, OnInit} from '@angular/core';
import {InvoicesDto} from '../../services/billing/billing.dto';
import {BillingService} from '../../services/billing/billing.service';
import {StatusBar} from '@ionic-native/status-bar/ngx';

@Component({
  selector: 'app-invoices',
  templateUrl: './invoices.page.html',
  styleUrls: ['./invoices.page.scss'],
})
export class InvoicesPage implements OnInit {

  public invoices: Array<InvoicesDto>;
  public currentInvoice: InvoicesDto;
  public isLoading = true;

  constructor(private billingService: BillingService, private statusBar: StatusBar) {
    this.statusBar.styleDefault();
  }

  ngOnInit() {
  }

  ionViewDidEnter() {
    this.statusBar.styleDefault();
    this.refresh().then(() => {
      this.isLoading = false;
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
          this.invoices = result;
          this.invoices = this.invoices.slice(1, this.invoices.length);
          this.currentInvoice = result[0];
          resolve('ok');
        }).catch(error => {
          reject(error);
        });
    });
  }

}
