import { Injectable } from "@angular/core";
import { Storage } from "@ionic/storage-angular";

import { ApiService } from "../api/api.service";

import { BillingDto } from "./billing.dto";

@Injectable({
  providedIn: "root",
})
export class BillingService {
  constructor(private api: ApiService, private storage: Storage) {}

  public async getBillingList(value: number): Promise<any> {
    const ApiUrl = this.api.getApiUrl();

    const organizationId = await this.storage.get("currentOrganization");
    const result = await this.api.get<{ invoices: BillingDto[] }>(
      `${ApiUrl}/billing/v1/invoices?organization_id=${organizationId}&page=1&per_page=${value}`
    );

    return result.invoices
  }
}
