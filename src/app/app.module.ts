import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';

import {IonicModule, IonicRouteStrategy, Platform} from '@ionic/angular';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { IonicStorageModule } from '@ionic/storage';
import {HttpBackend, HttpXhrBackend} from '@angular/common/http';
import {NativeHttpBackend, NativeHttpFallback, NativeHttpModule} from 'ionic-native-http-connection-backend';
import {AppVersion} from '@ionic-native/app-version/ngx';
import {ScreenOrientation} from '@ionic-native/screen-orientation/ngx';
import {FontAwesomeModule} from '@fortawesome/angular-fontawesome';
import { library } from '@fortawesome/fontawesome-svg-core';
import { fas } from '@fortawesome/free-solid-svg-icons';
import {EmailComposer} from '@ionic-native/email-composer/ngx';
import {RecaptchaModule} from 'ng-recaptcha';

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
    RecaptchaModule.forRoot(),
  ],
  providers: [
    AppVersion,
    ScreenOrientation,
    EmailComposer,
    {provide: RouteReuseStrategy, useClass: IonicRouteStrategy},
    {
      provide: HttpBackend,
      useClass: NativeHttpFallback,
      deps: [Platform, NativeHttpBackend, HttpXhrBackend]
    },
  ],
  bootstrap: [AppComponent]
})
export class AppModule {
  constructor() {
    library.add(fas);
  }
}
