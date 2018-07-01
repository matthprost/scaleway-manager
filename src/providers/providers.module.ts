import {NgModule} from '@angular/core';
import {ApiServiceModule} from "./api/api.module";
import {AuthProvider} from "./auth/auth";
import {LogoutProvider} from "./auth/logout/logout";

@NgModule({
  declarations: [],
  imports: [
    ApiServiceModule,
  ],
  exports: [],
  providers: [
    AuthProvider,
    LogoutProvider
  ]
})

export class ProvidersModule {
}
