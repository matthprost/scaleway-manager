import {NgModule} from '@angular/core';
import {HttpBackend, HttpClientModule, HttpXhrBackend} from '@angular/common/http';
import {ApiProvider} from "./api";
import {NativeHttpBackend, NativeHttpFallback, NativeHttpModule} from "ionic-native-http-connection-backend";
import {Platform} from "ionic-angular";

@NgModule({
  declarations: [
  ],
  imports: [
    HttpClientModule,
    NativeHttpModule
  ],
  exports: [
  ],
  providers: [
    ApiProvider,
    {
      provide: HttpBackend,
      useClass: NativeHttpFallback,
      deps: [ Platform, NativeHttpBackend, HttpXhrBackend]
    },
  ]
})

export class ApiServiceModule {
}
