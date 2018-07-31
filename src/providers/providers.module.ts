import {NgModule} from '@angular/core';
import {ApiServiceModule} from "./api/api.module";
import {AuthProvider} from "./auth/auth";
import {LogoutProvider} from "./auth/logout/logout";
import {ServersProvider} from "./servers/servers";
import {BillingProvider} from "./billing/billing";

@NgModule({
  declarations: [],
  imports: [
    ApiServiceModule
  ],
  exports: [],
  providers: [
    AuthProvider,
    LogoutProvider,
    ServersProvider,
    BillingProvider
  ]
})

export class ProvidersModule {
}
