import {NgModule} from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import {ApiProvider} from "./api";
import {GetService} from "./http/get-service";
import {PostService} from "./http/post-service";

@NgModule({
  declarations: [
  ],
  imports: [
    HttpClientModule
  ],
  exports: [
  ],
  providers: [
    ApiProvider,
    GetService,
    PostService
  ]
})

export class ApiServiceModule {
}
