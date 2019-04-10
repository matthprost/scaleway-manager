import {NgModule} from '@angular/core';
import {ApiServiceModule} from "./api/api.module";
import {AuthProvider} from "./auth/auth";
import {LogoutProvider} from "./auth/logout/logout";
import {ServersProvider} from "./servers/servers";
import {BillingProvider} from "./billing/billing";
import {ErrorsProvider} from "./errors/errors";

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
    BillingProvider,
    ErrorsProvider
  ]
})

export class ProvidersModule {
}
