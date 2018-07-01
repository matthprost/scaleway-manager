import {NgModule} from '@angular/core';
import {ApiServiceModule} from "./api/api.module";
import {AuthProvider} from "./auth/auth";

@NgModule({
  declarations: [],
  imports: [
    ApiServiceModule,
  ],
  exports: [],
  providers: [
    AuthProvider
  ]
})

export class ProvidersModule {
}
