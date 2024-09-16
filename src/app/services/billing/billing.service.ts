import { Injectable } from "@angular/core";
// biome-ignore lint/style/useImportType: <explanation>
import { Storage } from "@ionic/storage-angular";

// biome-ignore lint/style/useImportType: <explanation>
import { ApiService } from "../api/api.service";

import { BillingDto } from "./billing.dto";

@Injectable({
  providedIn: "root",
})
export class BillingService {
  constructor(private api: ApiService, private storage: Storage) {}

  public async getBillingList(value: number): Promise<any> {
    const ApiUrl = this.api.getBillingApiUrl();

    const organizationId = await this.storage.get("currentOrganization");
    const result = await this.api.get<{ invoices: BillingDto[] }>(
      `${ApiUrl}/invoices?organization_id=${organizationId}&page=1&per_page=${value}`
    );

    return result.invoices
  }
}
