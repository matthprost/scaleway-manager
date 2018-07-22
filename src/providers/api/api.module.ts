import {NgModule} from '@angular/core';
import {HttpBackend, HttpClientModule, HttpXhrBackend} from '@angular/common/http';
import {ApiProvider} from "./api";
import {GetService} from "./http/get.service";
import {PostService} from "./http/post.service";
import {DeleteService} from "./http/delete.service";
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
    GetService,
    PostService,
    DeleteService,
    {
      provide: HttpBackend,
      useClass: NativeHttpFallback,
      deps: [ Platform, NativeHttpBackend, HttpXhrBackend]
    },
  ]
})

export class ApiServiceModule {
}
