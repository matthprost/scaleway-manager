import {NgModule} from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import {ApiProvider} from "./api";
import {GetService} from "./http/get.service";
import {PostService} from "./http/post.service";
import {DeleteService} from "./http/delete.service";

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
    PostService,
    DeleteService
  ]
})

export class ApiServiceModule {
}
