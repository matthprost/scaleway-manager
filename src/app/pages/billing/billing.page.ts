import { Component } from "@angular/core";
import { Plugins, StatusBarStyle } from "@capacitor/core";

import { BillingDto } from "../../services/billing/billing.dto";
import { BillingService } from "../../services/billing/billing.service";

const { StatusBar } = Plugins;

@Component({
  selector: "app-billing",
  templateUrl: "./billing.page.html",
  styleUrls: ["./billing.page.scss"],
})
export class BillingPage {
  public billings: BillingDto[];
  public currentInvoice: BillingDto;
  public isLoading = true;
  public billingError = false;

  constructor(private billingService: BillingService) {}

  ionViewDidEnter(): void {
    StatusBar.setStyle({ style: StatusBarStyle.Light });
    this.refresh()
      .then(() => {
        this.isLoading = false;
      })
      .catch(() => {
        this.isLoading = false;
        this.billingError = true;
      });
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
    this.billings = await this.billingService.getBillingList(100)
    this.billings = this.billings.slice(1, this.billings.length);
    this.currentInvoice = this.billings[0];
  }
}
