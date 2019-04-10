import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import {IonicModule, IonicRouteStrategy} from '@ionic/angular';
import {RouteReuseStrategy} from "@angular/router";

import { AppComponent } from './app.component';

import { StatusBar } from '@ionic-native/status-bar/ngx';
import { SplashScreen } from '@ionic-native/splash-screen/ngx';
import {ProvidersModule} from "./providers/providers.module";
import {IonicStorageModule} from "@ionic/storage";
import {PipesModule} from "./pipes/pipes.module";
import {Clipboard} from "@ionic-native/clipboard/ngx";
import {DirectivesModule} from "./directives/directives.module";
import { ScreenOrientation } from '@ionic-native/screen-orientation/ngx';
import {EmailComposer} from "@ionic-native/email-composer/ngx";
import {InAppBrowser} from "@ionic-native/in-app-browser/ngx";
import {ComponentsModule} from "./components/components.module";
import { BillingProvider } from './providers/billing/billing';
import { ErrorsProvider } from './providers/errors/errors';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { AccountProvider } from './providers/account/account';
import {AppRoutingModule} from "./app-routing.module";


@NgModule({
  declarations: [
    AppComponent,
  ],
  imports: [
    BrowserModule,
    BrowserModule,
    IonicModule.forRoot(),
    AppRoutingModule,
    ProvidersModule,
    IonicStorageModule.forRoot(),
    PipesModule,
    DirectivesModule,
    ComponentsModule,
    FontAwesomeModule
  ],
  bootstrap: [AppComponent],
  entryComponents: [],
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    StatusBar,
    SplashScreen,
    Clipboard,
    ScreenOrientation,
    EmailComposer,
    InAppBrowser,
    BillingProvider,
    ErrorsProvider,
    AccountProvider
  ]
})
export class AppModule {}
