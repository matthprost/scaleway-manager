import { HttpBackend, HttpXhrBackend } from "@angular/common/http";
import { NgModule } from "@angular/core";
import { BrowserModule } from "@angular/platform-browser";
import { RouteReuseStrategy } from "@angular/router";
import { FontAwesomeModule } from "@fortawesome/angular-fontawesome";
import { library } from "@fortawesome/fontawesome-svg-core";
import { fas } from "@fortawesome/free-solid-svg-icons";
import { AppVersion } from "@ionic-native/app-version/ngx";
import { EmailComposer } from "@ionic-native/email-composer/ngx";
import { ScreenOrientation } from "@ionic-native/screen-orientation/ngx";
import { IonicModule, IonicRouteStrategy, Platform } from "@ionic/angular";
import { IonicStorageModule } from "@ionic/storage";
import {
  NativeHttpBackend,
  NativeHttpFallback,
  NativeHttpModule,
} from "ionic-native-http-connection-backend";
import { RecaptchaModule } from "ng-recaptcha";

import { AppRoutingModule } from "./app-routing.module";
import { AppComponent } from "./app.component";

@NgModule({
  declarations: [AppComponent],
  entryComponents: [],
  imports: [
    BrowserModule,
    IonicModule.forRoot(),
    IonicStorageModule.forRoot(),
    AppRoutingModule,
    NativeHttpModule,
    FontAwesomeModule,
    RecaptchaModule,
  ],
  providers: [
    AppVersion,
    ScreenOrientation,
    EmailComposer,
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    {
      provide: HttpBackend,
      useClass: NativeHttpFallback,
      deps: [Platform, NativeHttpBackend, HttpXhrBackend],
    },
  ],
  bootstrap: [AppComponent],
})
export class AppModule {
  constructor() {
    library.add(fas);
  }
}
